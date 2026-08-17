# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Rule ids are permanent. A retired rule is removed from the registry but its
number is never reissued, so a `--skip` entry in your CI config can never
silently start suppressing a different check.

## [Unreleased]

## [0.1.0] — 2026-08-17

Initial release. Checks a live MCP server against revision
[`2026-07-28`](https://modelcontextprotocol.io/specification/2026-07-28/changelog).

### Added

- Dual-protocol live probe over **stdio** and **Streamable HTTP**, speaking both
  the 2026-07-28 stateless revision and pre-2026 stateful revisions so it can
  tell which one a server actually implements.
- **18 rules**, each tied to a specific changelog entry:
  - `MCP001` `server/discover` not implemented
  - `MCP002` still requires the `initialize` handshake
  - `MCP003` still uses the removed `Mcp-Session-Id` header
  - `MCP004` results missing required `resultType`
  - `MCP005` list results missing `ttlMs` / `cacheScope`
  - `MCP006` removed `ping` still implemented
  - `MCP007` removed `logging/setLevel` still implemented
  - `MCP008` removed `resources/subscribe` still implemented
  - `MCP009` `subscriptions/listen` missing despite advertised `listChanged`
  - `MCP010` removed HTTP GET stream endpoint still served
  - `MCP011` resource-not-found still returns `-32002`
  - `MCP012` protocol error codes not renumbered into the reserved range
  - `MCP013` rejects requests carrying the `_meta` protocol envelope
  - `MCP014` rejects the required `Mcp-Method` / `Mcp-Name` headers
  - `MCP015` declares deprecated Roots / Sampling / Logging capabilities
  - `MCP016` deprecated HTTP+SSE transport
  - `MCP017` `tools/list` ordering not deterministic
  - `MCP018` results do not identify the server via `_meta` `serverInfo`
- Four output formats: terminal, `--format json`, `--format sarif` for GitHub
  code scanning, and `--format markdown` for step summaries and PR comments.
- GitHub Action wrapper (`action.yml`).
- Programmatic API: `runChecks`, `StdioTransport`, `HttpTransport`.
- Zero runtime dependencies.
- Generated per-rule documentation under `docs/rules/`, with a CI check that
  keeps it in step with the rule sources.

[Unreleased]: https://github.com/OWNER/mcp-ready/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/OWNER/mcp-ready/releases/tag/v0.1.0
