# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Rule ids are permanent. A retired rule is removed from the registry but its
number is never reissued, so a `--skip` entry in your CI config can never
silently start suppressing a different check.

## [Unreleased]

### Added

- Every rule now declares `remediation: 'sdk' | 'application'` — whether an SDK
  upgrade resolves the finding or the server author has to act. The terminal,
  JSON and Markdown reports split their summaries on that line. Against a
  stock-SDK server the great majority of findings are SDK plumbing, and saying
  so keeps maintainers from hunting through code they did not write.
- Regression coverage for Windows executable resolution and `cmd.exe` argument
  quoting (`test/spawn-plan.test.ts`).

### Fixed

- **Windows: `--stdio "npx ..."` failed with `spawn npx ENOENT`.** `npx` is a
  `.cmd` shim on Windows, which Node cannot resolve without `shell: true` and,
  since the fix for CVE-2024-27980, refuses to spawn directly. `mcp-ready` now
  resolves the executable itself through `PATHEXT` and routes batch shims via
  `cmd.exe` with arguments it quotes, keeping `shell: true` off so command
  metacharacters are still never interpreted. This made the tool unusable on
  Windows for most of the ecosystem, including the exact `npx` invocation the
  README documents.
- **`--no-color` was documented but rejected by the argument parser.**
  `node:util.parseArgs` has no `--no-` negation, so the flag had to be declared
  explicitly. The `NO_COLOR` environment variable is now honoured too.

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

[Unreleased]: https://github.com/Khanthtutzin/mcp-ready/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Khanthtutzin/mcp-ready/releases/tag/v0.1.0
