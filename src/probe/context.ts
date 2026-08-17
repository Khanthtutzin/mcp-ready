import { CLIENT_INFO, ERROR_CODES, META, TARGET_REVISION } from '../protocol.js';
import type {
  Exchange,
  JsonRpcRequest,
  SendOptions,
  Transport,
} from '../transport/types.js';

/** Client capabilities we advertise. Intentionally minimal. */
const CLIENT_CAPABILITIES = {} as const;

/**
 * Everything the prelude learned about the server, shared by all rules.
 *
 * Gathering this once matters for two reasons. Rules stay cheap and free of
 * ordering assumptions, and we avoid hammering a server with eighteen
 * near-identical handshake attempts.
 */
export interface Prelude {
  /** `server/discover` — mandatory under 2026-07-28. */
  discover: Exchange;
  /**
   * `tools/list` issued *before* any handshake attempt. The ordering is
   * load-bearing: on stdio a successful `initialize` would persist in the
   * child process and mask a server that still requires it.
   */
  bareToolsList: Exchange;
  /** Legacy `initialize`. Expected to fail on a compliant server. */
  legacyInitialize: Exchange;
  /** `tools/list` retried after `initialize`, only when the bare attempt failed. */
  postInitToolsList: Exchange | null;
  /** Second `tools/list`, used to check ordering determinism. */
  repeatToolsList: Exchange | null;
}

export interface ProbeContext {
  readonly transport: Transport;
  readonly kind: 'stdio' | 'http';
  readonly target: string;
  readonly prelude: Prelude;
  /** Every exchange this run produced, in order. */
  readonly transcript: Exchange[];

  /** Issue a request carrying the 2026-07-28 `_meta` envelope. */
  call(method: string, params?: unknown, options?: SendOptions): Promise<Exchange>;
  /** Issue a request with no `_meta`, as a pre-2026 client would. */
  callLegacy(method: string, params?: unknown, options?: SendOptions): Promise<Exchange>;
}

/** Build the `_meta` block every 2026-07-28 request carries. */
export function modernMeta(): Record<string, unknown> {
  return {
    [META.protocolVersion]: TARGET_REVISION,
    [META.clientCapabilities]: CLIENT_CAPABILITIES,
    [META.clientInfo]: CLIENT_INFO,
  };
}

function withMeta(params: unknown): unknown {
  if (params === undefined) return { _meta: modernMeta() };
  if (params === null || typeof params !== 'object' || Array.isArray(params))
    return params;
  const existing = (params as { _meta?: Record<string, unknown> })._meta ?? {};
  return { ...(params as object), _meta: { ...modernMeta(), ...existing } };
}

// --- Exchange predicates, shared by every rule -----------------------------

/** True when the exchange produced a JSON-RPC result (not an error, not a failure). */
export function succeeded(ex: Exchange | null): boolean {
  return !!ex && !ex.transportError && !!ex.response && ex.response.error === undefined;
}

/** The JSON-RPC error code, or `undefined` if the exchange did not carry one. */
export function errorCode(ex: Exchange | null): number | undefined {
  return ex?.response?.error?.code;
}

/**
 * True when the server reported the method as unimplemented.
 *
 * Accepts `-32601` (correct) and `-32600` (used by a handful of SDKs for the
 * same condition) so that a server is not faulted twice for one mistake.
 */
export function isMethodNotFound(ex: Exchange | null): boolean {
  const code = errorCode(ex);
  return code === ERROR_CODES.methodNotFound || code === ERROR_CODES.invalidRequest;
}

/** The `result` payload, or `undefined`. */
export function resultOf(ex: Exchange | null): Record<string, any> | undefined {
  const r = ex?.response?.result;
  return r && typeof r === 'object' ? (r as Record<string, any>) : undefined;
}

// --- Prelude ---------------------------------------------------------------

export interface ProbeOptions {
  timeoutMs?: number;
}

/**
 * Run the fixed opening sequence and return a context rules can share.
 *
 * The order of these four calls is part of the contract — see `Prelude`.
 */
export async function createProbeContext(
  transport: Transport,
  options: ProbeOptions = {},
): Promise<ProbeContext> {
  const transcript: Exchange[] = [];
  const timeout: SendOptions = options.timeoutMs ? { timeoutMs: options.timeoutMs } : {};

  const send = async (
    method: string,
    params: unknown,
    meta: boolean,
    extra: SendOptions = {},
  ): Promise<Exchange> => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params: meta ? withMeta(params) : params,
    };
    const ex = await transport.send(request, { ...timeout, ...extra });
    transcript.push(ex);
    return ex;
  };

  // 1. Mandatory under the target revision, and harmless against a legacy
  //    server, which simply reports method-not-found.
  const discover = await send('server/discover', undefined, true);

  // 2. Before any handshake. See the `Prelude.bareToolsList` note.
  const bareToolsList = await send('tools/list', {}, true);

  // 3. The removed handshake. A compliant server rejects this.
  const legacyInitialize = await send(
    'initialize',
    {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: CLIENT_INFO.name, version: CLIENT_INFO.version },
    },
    false,
  );

  // 4. Only meaningful when the bare listing failed and the handshake worked:
  //    that combination is the signature of a still-stateful server.
  let postInitToolsList: Exchange | null = null;
  if (!succeeded(bareToolsList) && succeeded(legacyInitialize)) {
    await transport.send(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { ...timeout, notification: true },
    );
    postInitToolsList = await send('tools/list', {}, true);
  }

  // 5. A second listing, for the ordering-determinism check.
  const listingWorks = succeeded(bareToolsList) || succeeded(postInitToolsList);
  const repeatToolsList = listingWorks ? await send('tools/list', {}, true) : null;

  return {
    transport,
    kind: transport.kind,
    target: transport.target,
    transcript,
    prelude: {
      discover,
      bareToolsList,
      legacyInitialize,
      postInitToolsList,
      repeatToolsList,
    },
    call: (method, params, opts) => send(method, params, true, opts ?? {}),
    callLegacy: (method, params, opts) => send(method, params, false, opts ?? {}),
  };
}

/**
 * The `tools/list` exchange that actually returned tools, whichever attempt
 * that was. Rules that just need the payload should use this.
 */
export function effectiveToolsList(ctx: ProbeContext): Exchange | null {
  const { bareToolsList, postInitToolsList } = ctx.prelude;
  if (succeeded(bareToolsList)) return bareToolsList;
  if (succeeded(postInitToolsList)) return postInitToolsList;
  return null;
}
