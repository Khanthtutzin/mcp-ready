/**
 * Protocol constants for the MCP revisions this tool understands.
 *
 * `mcp-ready` deliberately speaks two revisions: the 2026-07-28 stateless
 * revision it is checking *for*, and the pre-2026 stateful revisions it
 * expects to find servers still implementing. Everything version-specific
 * lives here so that adding a future revision is a single-file change.
 *
 * @see https://modelcontextprotocol.io/specification/2026-07-28/changelog
 */

/** The revision `mcp-ready` checks compliance against. */
export const TARGET_REVISION = '2026-07-28';

/** Revisions that predate the stateless rewrite. */
export const LEGACY_REVISIONS = ['2025-11-25', '2025-06-18', '2025-03-26'] as const;

/**
 * `_meta` keys introduced by SEP-2575. Under 2026-07-28 these replace the
 * `initialize` handshake: every request carries its own version and
 * capabilities rather than negotiating them once per session.
 */
export const META = {
  protocolVersion: 'io.modelcontextprotocol/protocolVersion',
  clientCapabilities: 'io.modelcontextprotocol/clientCapabilities',
  clientInfo: 'io.modelcontextprotocol/clientInfo',
  serverInfo: 'io.modelcontextprotocol/serverInfo',
  logLevel: 'io.modelcontextprotocol/logLevel',
  subscriptionId: 'io.modelcontextprotocol/subscriptionId',
} as const;

/** HTTP headers required on Streamable HTTP POSTs by SEP-2243. */
export const HTTP_HEADERS = {
  method: 'Mcp-Method',
  name: 'Mcp-Name',
  /** Removed in 2026-07-28 along with protocol-level sessions (SEP-2567). */
  legacySessionId: 'Mcp-Session-Id',
} as const;

/**
 * JSON-RPC error codes.
 *
 * 2026-07-28 partitioned the server-error range: -32000..-32019 stays
 * implementation-defined, -32020..-32099 is reserved for the spec. The three
 * codes introduced during the draft were renumbered out of the first block.
 */
export const ERROR_CODES = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,

  /** Current, post-renumbering. */
  headerMismatch: -32020,
  missingRequiredClientCapability: -32021,
  unsupportedProtocolVersion: -32022,

  /** Pre-renumbering equivalents. Observing these means the server is stale. */
  legacyHeaderMismatch: -32001,
  legacyMissingRequiredClientCapability: -32003,
  legacyUnsupportedProtocolVersion: -32004,

  /**
   * Pre-2026 resource-not-found. Now expected to be `invalidParams` (-32602)
   * to align with JSON-RPC.
   */
  legacyResourceNotFound: -32002,
} as const;

/** Methods removed outright by 2026-07-28. */
export const REMOVED_METHODS = [
  'initialize',
  'ping',
  'logging/setLevel',
  'resources/subscribe',
  'resources/unsubscribe',
] as const;

/** Methods 2026-07-28 requires servers to implement. */
export const REQUIRED_METHODS = ['server/discover'] as const;

/** Identity this tool reports to servers it probes. */
export const CLIENT_INFO = {
  name: 'mcp-ready',
  title: 'mcp-ready conformance probe',
  version: '0.1.0',
} as const;

/** Spec deep-link helper, so every rule cites a real URL. */
export function specUrl(path: string): string {
  return `https://modelcontextprotocol.io/specification/${TARGET_REVISION}/${path}`;
}
