import { HTTP_HEADERS } from '../protocol.js';
import type {
  Exchange,
  JsonRpcRequest,
  JsonRpcResponse,
  RawHttpResult,
  SendOptions,
  Transport,
} from './types.js';

const DEFAULT_TIMEOUT_MS = 15_000;
const SSE_BODY_LIMIT = 512 * 1024;

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

/**
 * Pull the first JSON-RPC response out of an SSE stream.
 *
 * 2026-07-28 removed stream resumability, so there are no event ids to track:
 * we read `data:` frames until one parses as a response carrying our id, or
 * the stream ends.
 */
export async function readSseResponse(
  body: ReadableStream<Uint8Array>,
  wantedId: string | number,
): Promise<JsonRpcResponse | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > SSE_BODY_LIMIT) {
        throw new Error('SSE stream exceeded 512KB without producing a response.');
      }
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line.
      let split: number;
      while ((split = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const rawEvent = buffer.slice(0, split);
        buffer = buffer.slice(split).replace(/^\r?\n\r?\n/, '');

        const data = rawEvent
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');
        if (!data) continue;

        try {
          const parsed = JSON.parse(data) as JsonRpcResponse;
          if (parsed.id === wantedId) return parsed;
        } catch {
          // Not our frame; keep reading.
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return null;
}

/**
 * Streamable HTTP transport.
 *
 * Sends the `Mcp-Method` / `Mcp-Name` headers that SEP-2243 requires, and
 * records raw response headers so rules can look for artefacts of the removed
 * session layer (`Mcp-Session-Id`).
 */
export class HttpTransport implements Transport {
  readonly kind = 'http' as const;
  readonly target: string;

  private readonly notes: string[] = [];
  private nextId = 1;

  constructor(
    private readonly url: string,
    private readonly extraHeaders: Record<string, string> = {},
  ) {
    this.target = url;
  }

  async send(request: JsonRpcRequest, options: SendOptions = {}): Promise<Exchange> {
    const started = Date.now();
    const id = options.notification ? undefined : (request.id ?? this.nextId++);
    const wire: JsonRpcRequest = { ...request, jsonrpc: '2.0' };
    if (id === undefined) delete wire.id;
    else wire.id = id;

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...this.extraHeaders,
    };

    if (!options.omitStandardHeaders) {
      headers[HTTP_HEADERS.method.toLowerCase()] = request.method;
      const toolName = (request.params as { name?: unknown } | undefined)?.name;
      if (typeof toolName === 'string') {
        headers[HTTP_HEADERS.name.toLowerCase()] = toolName;
      }
    }
    Object.assign(headers, lowercaseKeys(options.headers ?? {}));

    const base = {
      request: wire,
      requestHeaders: headers,
    };

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(wire),
        signal: controller.signal,
      });

      const responseHeaders = headersToObject(res.headers);
      const contentType = responseHeaders['content-type'] ?? '';

      if (options.notification) {
        return {
          ...base,
          response: null,
          responseHeaders,
          status: res.status,
          timingMs: Date.now() - started,
        };
      }

      let response: JsonRpcResponse | null = null;
      let transportError: string | undefined;

      if (contentType.includes('text/event-stream') && res.body) {
        try {
          response = await readSseResponse(res.body, id!);
          if (!response)
            transportError = 'SSE stream closed without a matching response.';
        } catch (err) {
          transportError = (err as Error).message;
        }
      } else {
        const text = await res.text();
        if (!text.trim()) {
          transportError = `Empty body (HTTP ${res.status}).`;
        } else {
          try {
            response = JSON.parse(text) as JsonRpcResponse;
          } catch {
            transportError = `Response was not JSON (HTTP ${res.status}): ${text.slice(0, 200)}`;
          }
        }
      }

      return {
        ...base,
        response,
        responseHeaders,
        status: res.status,
        timingMs: Date.now() - started,
        ...(transportError ? { transportError } : {}),
      };
    } catch (err) {
      const message =
        (err as Error).name === 'AbortError'
          ? `No response within ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms.`
          : (err as Error).message;
      return {
        ...base,
        response: null,
        responseHeaders: {},
        timingMs: Date.now() - started,
        transportError: message,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async rawRequest(
    method: string,
    headers: Record<string, string> = {},
  ): Promise<RawHttpResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(this.url, {
        method,
        headers: { accept: 'text/event-stream', ...this.extraHeaders, ...headers },
        signal: controller.signal,
      });
      // Read a bounded preview; a legacy GET endpoint holds the stream open
      // indefinitely, so never await the full body.
      const preview = await readBoundedPreview(res);
      return {
        status: res.status,
        headers: headersToObject(res.headers),
        bodyPreview: preview,
      };
    } catch (err) {
      return {
        status: 0,
        headers: {},
        bodyPreview: '',
        error: (err as Error).name === 'AbortError' ? 'timeout' : (err as Error).message,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  diagnostics(): string[] {
    return [...this.notes];
  }

  async close(): Promise<void> {
    // Stateless by construction: nothing to tear down.
  }
}

function lowercaseKeys(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

/**
 * Read at most 2KB or 1 second of a response body, whichever comes first.
 * Deliberately does not drain: legacy SSE endpoints never close.
 */
async function readBoundedPreview(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  const deadline = setTimeout(() => reader.cancel().catch(() => undefined), 1000);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.length >= 2048) break;
    }
  } catch {
    // Cancelled by the deadline, or the peer hung up. Preview is best-effort.
  } finally {
    clearTimeout(deadline);
    await reader.cancel().catch(() => undefined);
  }
  return text.slice(0, 2048);
}
