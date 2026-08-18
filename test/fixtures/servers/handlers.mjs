/**
 * Request handlers for the fixture servers.
 *
 * These are deliberately hand-written rather than built on an SDK. The whole
 * point is to reproduce specific pre-2026 behaviours exactly, including the
 * wrong ones, which an up-to-date SDK would refuse to emit.
 *
 * Modes:
 *   legacy         a 2025-11-25 server: stateful, removed methods still live
 *   modern         a clean 2026-07-28 server
 *   strict-params  modern, but rejects any request carrying params._meta
 *   dual-era       modern, but also still answers the legacy initialize
 */

const TOOLS = [
  { name: 'alpha', description: 'First tool.', inputSchema: { type: 'object' } },
  { name: 'beta', description: 'Second tool.', inputSchema: { type: 'object' } },
];

const SERVER_INFO = { name: 'mcp-ready-fixture', version: '1.0.0' };
const META_PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';

/** Oldest revision the legacy fixture claims to understand. */
const LEGACY_FLOOR = '2025-03-26';

function ok(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function fail(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function metaVersion(request) {
  return request?.params?._meta?.[META_PROTOCOL_VERSION];
}

export function createHandler(mode) {
  // Session state, which is exactly what 2026-07-28 removed. Only the legacy
  // fixture consults it.
  let initialized = false;
  // Drives the non-deterministic ordering the legacy fixture exhibits.
  let listCount = 0;

  return function handle(request) {
    const { id, method } = request;
    if (id === undefined || id === null) return null; // notification

    if (mode === 'strict-params' && request.params?._meta !== undefined) {
      return fail(id, -32602, 'Invalid params: unexpected property "_meta".');
    }

    if (mode === 'legacy') {
      if (method === 'initialize') {
        initialized = true;
        return ok(id, {
          protocolVersion: '2025-11-25',
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true },
            logging: {},
          },
          serverInfo: SERVER_INFO,
        });
      }
      if (!initialized) {
        return fail(id, -32600, 'Server not initialized. Call initialize first.');
      }
      // Legacy servers accept revisions newer than themselves and reject
      // anything older than the floor they were written against.
      const version = metaVersion(request);
      if (typeof version === 'string' && version < LEGACY_FLOOR) {
        return fail(id, -32004, `Unsupported protocol version: ${version}`);
      }
    } else {
      if (method === 'initialize') {
        // Dual-era servers keep serving pre-2026 clients through the
        // deprecation window while fully supporting 2026-07-28.
        if (mode === 'dual-era') {
          return ok(id, {
            protocolVersion: '2025-11-25',
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
          });
        }
        return fail(
          id,
          -32601,
          'Method not found: initialize was removed in 2026-07-28.',
        );
      }
      const version = metaVersion(request);
      if (typeof version === 'string' && version !== '2026-07-28') {
        return fail(id, -32022, `Unsupported protocol version: ${version}`);
      }
    }

    switch (method) {
      case 'server/discover':
        if (mode === 'legacy')
          return fail(id, -32601, 'Method not found: server/discover');
        // Shape mirrors DiscoverResult in the 2026-07-28 schema: the field is
        // supportedVersions, and identity lives in _meta rather than at the
        // top level. Verified against the spec's own conformance corpus.
        return ok(id, {
          resultType: 'complete',
          supportedVersions: ['2026-07-28'],
          capabilities: { tools: {}, resources: {} },
          ttlMs: 3_600_000,
          cacheScope: 'public',
          _meta: { [META_SERVER_INFO]: SERVER_INFO },
        });

      case 'tools/list': {
        listCount += 1;
        if (mode === 'legacy') {
          // Iteration order that flips between calls, the way a Map or Set
          // rebuilt per request often does.
          const tools = listCount % 2 === 0 ? [...TOOLS].reverse() : [...TOOLS];
          return ok(id, { tools });
        }
        return ok(id, {
          resultType: 'complete',
          tools: [...TOOLS].sort((a, b) => a.name.localeCompare(b.name)),
          ttlMs: 60_000,
          cacheScope: 'public',
          _meta: { [META_SERVER_INFO]: SERVER_INFO },
        });
      }

      case 'resources/read':
        return mode === 'legacy'
          ? fail(id, -32002, 'Resource not found')
          : fail(id, -32602, 'Resource not found');

      case 'ping':
        return mode === 'legacy'
          ? ok(id, {})
          : fail(id, -32601, 'Method not found: ping');

      case 'logging/setLevel':
        return mode === 'legacy'
          ? ok(id, {})
          : fail(id, -32601, 'Method not found: logging/setLevel');

      case 'resources/subscribe':
      case 'resources/unsubscribe':
        return mode === 'legacy'
          ? ok(id, {})
          : fail(id, -32601, `Method not found: ${method}`);

      case 'subscriptions/listen':
        // The legacy fixture advertises listChanged but has no way to deliver
        // it under the new protocol — precisely what MCP009 looks for.
        return mode === 'legacy'
          ? fail(id, -32601, 'Method not found: subscriptions/listen')
          : ok(id, { resultType: 'complete', ttlMs: 0, cacheScope: 'private' });

      default:
        return fail(id, -32601, `Method not found: ${method}`);
    }
  };
}
