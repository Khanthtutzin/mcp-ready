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

Four defects found by building the TypeScript SDK at `2.0.0-alpha.0` from source
and running the checker against its examples over both transports. Every one
produced a false finding against a correctly migrated server.

- **The HTTP transport never sent `MCP-Protocol-Version`.** SEP-2243 requires it
  on every modern Streamable HTTP POST. A real v2 server rejected every probe
  with `-32020` and seven rules fired spuriously. The header is now mirrored
  from the request's `_meta` envelope rather than hardcoded, so a rule that
  deliberately sends an unsupported version still reaches the version-rejection
  path it is testing instead of tripping HeaderMismatch.
- **MCP001 checked `protocolVersions`.** The `DiscoverResult` field is
  `supportedVersions`. Verified against the published schema, not inferred.
- **MCP001 expected `serverInfo` at the top level of `DiscoverResult`.** The
  schema has no such member; identity lives in `_meta`, which MCP018 already
  covers. The duplicate check is gone.
- **MCP002 reported dual-era servers as NOT READY.** A server that answers
  `server/discover` and still handles `initialize` is serving both eras — the
  migration path the SDK documents as the recommended first step. It is now an
  advisory, and only a legacy-only server is an error.

- **Windows: `--stdio "npx ..."` failed with `spawn npx ENOENT`.** `npx` is a
  `.cmd` shim on Windows, which Node cannot resolve without `shell: true` and,
  since the fix for CVE-2024-27980, refuses to spawn directly. `mcp-stateless` now
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

[Unreleased]: https://github.com/Khanthtutzin/mcp-stateless/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Khanthtutzin/mcp-stateless/releases/tag/v0.1.0
