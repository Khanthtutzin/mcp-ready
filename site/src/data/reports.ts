/**
 * Verbatim output from the runs recorded in docs/migration-walkthrough.md.
 *
 * Kept as raw text rather than pre-marked-up segments so it stays
 * copy-pasteable from a real terminal — the whole claim of this page is that
 * nothing here is mocked up. Colour is applied at render time by parsing the
 * report's own grammar; see components/ReportOutput.tsx.
 */

export interface ReportTab {
  id: string;
  label: string;
  command: string;
  body: string;
}

export const BEFORE: ReportTab = {
  id: 'before',
  label: 'on SDK 1.30.0',
  command: 'npx mcp-stateless --stdio "node server.js"',
  body: `mcp-stateless — checking against MCP 2026-07-28
target: node server.js (stdio)

Breaking (7)

  × MCP001  server/discover is not implemented (SDK)
      found     server/discover returned JSON-RPC error -32601: Method not found.
      expected  Servers MUST implement server/discover, advertising supported
                protocol versions, capabilities and identity.
      fix       Add a server/discover handler returning { supportedVersions,
                capabilities }. Current SDKs do this for you once upgraded.
      spec      modelcontextprotocol.io/specification/2026-07-28/basic/lifecycle

  × MCP002  Server still accepts the removed initialize method (SDK)
  × MCP004  Results are missing the required resultType field (SDK)
  × MCP005  List results are missing the required ttlMs field (SDK)
  × MCP005  List results are missing a valid cacheScope (SDK)
  × MCP006  The removed ping method is still implemented (SDK)
  × MCP009  subscriptions/listen is missing despite advertised listChanged (SDK)

Deprecations and advisories (1)

  ! MCP018  Results do not identify the server via _meta serverInfo (SDK)

NOT READY — 7 breaking issues across 14 checks.
  7 of those are protocol plumbing owned by your MCP SDK — upgrading to a
  release that targets 2026-07-28 resolves them with no change to your code.
  None require a change to your own code.
Finished in 281ms.`,
};

export const AFTER: ReportTab = {
  id: 'after',
  label: 'after the upgrade',
  command: 'npx mcp-stateless --stdio "node build/index.js"',
  body: `mcp-stateless — checking against MCP 2026-07-28
target: node build/index.js (stdio)

READY — no breaking issues across 14 checks.
Finished in 711ms.

Same server, same two tools. The only change was the SDK version and the
four-line API migration it required. Every one of the seven findings
cleared without touching a single handler.`,
};

export const TABS = [BEFORE, AFTER];
