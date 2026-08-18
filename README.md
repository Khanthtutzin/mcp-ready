# mcp-stateless

**Is your MCP server ready for the 2026-07-28 stateless specification?**

[![CI](https://github.com/Khanthtutzin/mcp-stateless/actions/workflows/ci.yml/badge.svg)](https://github.com/Khanthtutzin/mcp-stateless/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/mcp-stateless.svg)](https://www.npmjs.com/package/mcp-stateless)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

`mcp-stateless` connects to a running MCP server, probes what it actually does, and
tells you exactly which parts of the 2026-07-28 breaking changes it fails —
with the wire traffic that proves it and the specific change that fixes it.

```bash
npx mcp-stateless --stdio "node dist/server.js"
```

---

## Why this exists

MCP revision [`2026-07-28`](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
is the largest breaking change in the protocol's history. **MCP went stateless.**

- The `initialize` / `notifications/initialized` handshake was **removed**
- `Mcp-Session-Id` and protocol-level sessions were **removed**
- `ping`, `logging/setLevel`, `resources/subscribe` were **removed**
- `server/discover` is now **mandatory**
- Every result must carry `resultType`
- List results must carry `ttlMs` and `cacheScope`
- Server-initiated requests were replaced by Multi Round-Trip Requests
- Protocol error codes were renumbered
- SSE stream resumability was removed

Thousands of servers now need to migrate on a twelve-month deprecation clock.

The official [`@modelcontextprotocol/codemod`](https://www.npmjs.com/package/@modelcontextprotocol/codemod)
rewrites the v1→v2 **SDK API surface** — imports, symbol renames, handler
signatures. It explicitly stops there; in its own words, adopting the 2026-07-28
protocol revision "is architectural and not codemod-automatable".

That leaves the question the codemod cannot answer: _does the server I am now
running actually conform?_ Static rewriting cannot tell you. `mcp-stateless` answers
it by asking the server itself.

## Quick start

No installation required.

```bash
# stdio server
npx mcp-stateless --stdio "node dist/server.js"

# Streamable HTTP server
npx mcp-stateless --http https://api.example.com/mcp

# with authentication
npx mcp-stateless --http https://api.example.com/mcp --header "Authorization: Bearer $TOKEN"
```

## What a run looks like

```
mcp-stateless — checking against MCP 2026-07-28
target: node dist/server.js (stdio)

Breaking (5)

  × MCP001  server/discover is not implemented
      found     server/discover returned JSON-RPC error -32600: Server not initialized.
      expected  Servers MUST implement server/discover, advertising supported protocol
                versions, capabilities and identity.
      fix       Add a server/discover handler returning { supportedVersions,
                capabilities }. Current SDKs implement this for you once upgraded.
      spec      https://modelcontextprotocol.io/specification/2026-07-28/basic/lifecycle

  × MCP002  Server still requires the initialize handshake
      found     tools/list without a handshake returned JSON-RPC error -32600, but the
                same call succeeded after initialize. The server is still stateful.
      expected  Every request stands alone. Servers MUST serve tools/list with no prior
                handshake, reading version and capabilities from each request's _meta.
      fix       Remove the initialization gate from your request handling. Read
                io.modelcontextprotocol/protocolVersion from params._meta on each request
                instead of from stored session state.
      spec      https://modelcontextprotocol.io/specification/2026-07-28/basic/lifecycle

  × MCP011  Resource-not-found still returns the old -32002 error code
      found     resources/read on an unknown URI returned error -32002.
      expected  Resource-not-found is reported as -32602 (Invalid Params), per JSON-RPC.
      fix       Change the resource-not-found error code from -32002 to -32602.
      spec      https://modelcontextprotocol.io/specification/2026-07-28/server/resources

Deprecations and advisories (4)

  ! MCP017  tools/list ordering is not deterministic
      found     Two consecutive tools/list calls returned the same tools in different
                orders: [alpha, beta] then [beta, alpha].
      expected  Servers SHOULD return tools in a deterministic order, so clients can cache
                listings and LLM prompt caches keep hitting.
      fix       Sort the tool list before returning it, or build it from an ordered
                structure rather than iterating a map or set.
      spec      https://modelcontextprotocol.io/specification/2026-07-28/server/tools

NOT READY — 5 breaking issues across 14 checks.
  4 of those are protocol plumbing owned by your MCP SDK — upgrading to a release
  that targets 2026-07-28 resolves them with no change to your code.
  1 needs a change in your server: MCP009
Finished in 64ms.
```

Add `--verbose` to see the JSON-RPC exchange behind each finding.

### The SDK line matters

Most of what breaks is protocol plumbing your MCP SDK owns — you never wrote a
`ping` handler, the SDK registered one. Telling you to go delete it would send
you hunting through code you do not maintain.

So every rule declares who fixes it, and the summary splits on that line. In
practice, against a server built on an SDK, the great majority of findings clear
themselves the day you upgrade — and the short list that remains is the part
actually worth your afternoon.

## What it checks

18 rules, each tied to a specific changelog entry. Full details in
[`docs/rules/`](docs/rules/README.md).

### Breaking

| Rule                           | Check                                                  | Transports  | Fixed by    |
| ------------------------------ | ------------------------------------------------------ | ----------- | ----------- |
| [MCP001](docs/rules/MCP001.md) | `server/discover` not implemented                      | stdio, http | SDK upgrade |
| [MCP002](docs/rules/MCP002.md) | Still requires the `initialize` handshake              | stdio, http | SDK upgrade |
| [MCP003](docs/rules/MCP003.md) | Still uses the removed `Mcp-Session-Id` header         | http        | SDK upgrade |
| [MCP004](docs/rules/MCP004.md) | Results missing required `resultType`                  | stdio, http | SDK upgrade |
| [MCP005](docs/rules/MCP005.md) | List results missing `ttlMs` / `cacheScope`            | stdio, http | SDK upgrade |
| [MCP006](docs/rules/MCP006.md) | Removed `ping` still implemented                       | stdio, http | SDK upgrade |
| [MCP007](docs/rules/MCP007.md) | Removed `logging/setLevel` still implemented           | stdio, http | SDK upgrade |
| [MCP008](docs/rules/MCP008.md) | Removed `resources/subscribe` still implemented        | stdio, http | SDK upgrade |
| [MCP009](docs/rules/MCP009.md) | `subscriptions/listen` missing despite `listChanged`   | stdio, http | your code   |
| [MCP010](docs/rules/MCP010.md) | Removed HTTP GET stream endpoint still served          | http        | SDK upgrade |
| [MCP011](docs/rules/MCP011.md) | Resource-not-found still returns `-32002`              | stdio, http | SDK upgrade |
| [MCP012](docs/rules/MCP012.md) | Protocol error codes not renumbered                    | stdio, http | SDK upgrade |
| [MCP013](docs/rules/MCP013.md) | Rejects requests carrying the `_meta` envelope         | stdio, http | your code   |
| [MCP014](docs/rules/MCP014.md) | Rejects the required `Mcp-Method` / `Mcp-Name` headers | http        | SDK upgrade |

### Deprecations and advisories

| Rule                           | Check                                          | Transports  | Fixed by    |
| ------------------------------ | ---------------------------------------------- | ----------- | ----------- |
| [MCP015](docs/rules/MCP015.md) | Declares deprecated Roots / Sampling / Logging | stdio, http | your code   |
| [MCP016](docs/rules/MCP016.md) | Deprecated HTTP+SSE transport                  | http        | SDK upgrade |
| [MCP017](docs/rules/MCP017.md) | `tools/list` ordering not deterministic        | stdio, http | your code   |
| [MCP018](docs/rules/MCP018.md) | Results do not identify the server via `_meta` | stdio, http | SDK upgrade |

### Deliberately not covered yet

Some 2026-07-28 changes need an auth flow or an interactive scenario to probe
honestly, so they are tracked as issues rather than checked unreliably: Multi
Round-Trip Request conformance, the tasks-extension migration, RFC 9207 `iss`
validation, and Client ID Metadata Documents. See
[the catalogue](docs/rules/README.md#not-yet-covered).

## Tested against real servers

The fixture suite proves the rules against servers written to trip them. That is
necessary but not sufficient, so `mcp-stateless` is also run against real software.

**Pre-2026 servers** — the official `@modelcontextprotocol/*` servers, none of
which has migrated:

| Server                       | Breaking | Advisory |
| ---------------------------- | -------- | -------- |
| `server-everything`          | 10       | 2        |
| `server-memory`              | 9        | 1        |
| `server-filesystem`          | 7        | 1        |
| `server-sequential-thinking` | 7        | 1        |

**A migrated server** — the TypeScript SDK at `2.0.0-alpha.0`, built from source,
over both transports:

| Example              | Transport | Verdict                    |
| -------------------- | --------- | -------------------------- |
| `server-quickstart`  | stdio     | READY, no findings         |
| `caching` (dual-era) | http      | READY, 1 dual-era advisory |

Testing against the migrated SDK is what made the rules trustworthy. It found
four defects in `mcp-stateless` itself, all now fixed and covered by regression
tests:

- the HTTP transport never sent the required `MCP-Protocol-Version` header, so
  a real v2 server rejected every probe and seven rules fired spuriously
- `server/discover` was checked for `protocolVersions`; the schema field is
  `supportedVersions`
- `serverInfo` was expected at the top level of `DiscoverResult`, where the
  schema does not define it
- a **dual-era** server — the SDK's own recommended migration path — was
  reported NOT READY for still answering `initialize`

If you find a case where a rule is wrong, that is a bug, and it is the most
useful thing you can report. Please
[open an issue](https://github.com/Khanthtutzin/mcp-stateless/issues/new?template=false-positive.yml).

## A worked example

[**docs/migration-walkthrough.md**](docs/migration-walkthrough.md) takes a real
server from 7 breaking findings to READY: the full report, what each finding
means, the actual diff, and an honest account of what the tool got wrong and
what it still cannot tell you.

## In CI

As a GitHub Action:

```yaml
- uses: Khanthtutzin/mcp-stateless@v1
  with:
    stdio: node dist/server.js
```

Or upload SARIF so findings appear in the Security tab and inline on pull
requests:

```yaml
- run: npx mcp-stateless --stdio "node dist/server.js" --format sarif --output mcp-stateless.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mcp-stateless.sarif
```

## Options

```
--stdio <command>     Command that starts the server on stdio.
--http <url>          Streamable HTTP endpoint.
--header <k:v>        Extra HTTP header. Repeatable.
--cwd <dir>           Working directory for the --stdio command.

--format <fmt>        text (default), json, sarif, markdown.
--output <file>       Write the report to a file instead of stdout.
--verbose             Include the JSON-RPC traffic behind each finding.
--no-color            Disable ANSI colour.

--only <ids>          Comma-separated rule ids to run exclusively.
--skip <ids>          Comma-separated rule ids to skip.
--timeout <ms>        Per-request timeout. Default 10000.
--fail-on <level>     error (default), warning, or never.

--list-rules          Print the rule catalogue and exit.
--version, --help
```

**Exit codes:** `0` ready · `1` findings at or above `--fail-on` · `2` usage
error or unreachable server.

A server that never answers is reported as `UNREACHABLE` with no findings
at all — eighteen confident verdicts about a server that failed to start
would be worse than nothing.

## Programmatic use

```ts
import { runChecks, StdioTransport } from 'mcp-stateless';

const transport = new StdioTransport('node dist/server.js');
const report = await runChecks(transport);
await transport.close();

if (!report.ready) {
  for (const f of report.findings) {
    console.log(`${f.ruleId} ${f.severity}: ${f.title}\n  fix: ${f.fix}`);
  }
}
```

## How it works

`mcp-stateless` speaks **both** protocol revisions. It hand-rolls JSON-RPC rather
than using an MCP SDK, because an SDK abstracts away exactly what needs
observing — it performs the handshake for you and normalises errors.

The probe runs a fixed opening sequence whose ordering is load-bearing:

1. `server/discover` — mandatory now, harmless against a legacy server
2. `tools/list` **before any handshake** — on stdio a successful `initialize`
   would persist in the child process and mask a server that still requires it
3. legacy `initialize` — expected to fail on a compliant server
4. `tools/list` again, only if step 2 failed and step 3 worked

That combination is the signature of a still-stateful server, and it is what
lets the tool distinguish "requires the handshake" from "chokes on `_meta`"
from "rejects the routing headers" — three failures that look identical from
the outside.

**Zero runtime dependencies.** Argument parsing uses `node:util.parseArgs`,
HTTP uses the built-in `fetch`, and the terminal colours are twelve lines of
ANSI. Nothing is installed into your CI beyond this package.

## Contributing

Adding a rule is one file plus one test — rules never touch the transport
layer, only a shared `ProbeContext`. See [CONTRIBUTING.md](CONTRIBUTING.md),
and the [`good first issue`](https://github.com/Khanthtutzin/mcp-stateless/labels/good%20first%20issue)
label.

The test suite runs every rule against real fixture MCP servers over real
stdio and real HTTP — one deliberately built to 2025-11-25, one to 2026-07-28.
No mocks.

## License

[MIT](LICENSE)
