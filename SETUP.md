# Before you publish

This repository is complete and its test suite passes, but a few things are
placeholders that only you can fill in. Delete this file once you have worked
through it.

## 1. Replace the `OWNER` placeholder

Every GitHub URL uses `OWNER` where your username or organisation goes. Replace
it everywhere:

```bash
grep -rl 'OWNER/mcp-ready' . --exclude-dir=node_modules --exclude-dir=.git \
  | xargs sed -i 's|OWNER/mcp-ready|your-username/mcp-ready|g'
```

Files affected: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`,
`CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `src/report/sarif.ts`, and the
`.github/ISSUE_TEMPLATE/` files.

## 2. Put your name on the license

`LICENSE` currently reads `Copyright (c) 2026 mcp-ready contributors`. That is a
valid form, but if you would rather it carry your name or your company's, change
it now — changing a copyright line later requires every contributor's agreement.

## 3. Create the GitHub repository and push

```bash
git remote add origin https://github.com/your-username/mcp-ready.git
git push -u origin main
```

Then in the repository settings:

- **Description**: "Check whether an MCP server is ready for the 2026-07-28 stateless specification."
- **Topics**: `mcp`, `model-context-protocol`, `conformance`, `migration`, `cli`, `developer-tools`
- **Features**: enable Issues and Discussions; disable Wikis and Projects
- **Security**: enable private vulnerability reporting (Settings → Security)
- **Branch protection** on `main`: require the `test` and `quality` checks

## 4. Publish to npm

`mcp-ready` was free on npm as of 2026-08-17, but that is worth re-checking:

```bash
npm view mcp-ready
```

Then add an `NPM_TOKEN` secret to the repository (Settings → Secrets and
variables → Actions) and cut the first release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow runs the full suite, verifies the tag matches
`package.json`, and publishes with provenance.

## 5. Create the `good first issue` labels and issues

Four checks are deliberately out of scope for v1 and each makes a well-bounded
first contribution. Filing them signals an active, welcoming project — which is
also exactly what the Codex for Open Source application is assessed on.

| Suggested title                                                                                                    | Labels                              |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Rule: verify Multi Round-Trip Request (`InputRequiredResult`) conformance — SEP-2322                               | `new-rule`, `help wanted`           |
| Rule: detect tasks still in the core protocol rather than the `io.modelcontextprotocol/tasks` extension — SEP-2663 | `new-rule`, `help wanted`           |
| Rule: check RFC 9207 `iss` is returned in authorization responses — SEP-2468                                       | `new-rule`, `good first issue`      |
| Rule: check for Client ID Metadata Documents support alongside deprecated DCR                                      | `new-rule`, `help wanted`           |
| Add `prompts/list` and `resources/list` to the `CacheableResult` check (MCP005)                                    | `good first issue`                  |
| Document a real-world migration walkthrough in `docs/`                                                             | `documentation`, `good first issue` |

## 6. Then actually maintain it

This is the part that matters for the
[Codex for Open Source](https://developers.openai.com/community/codex-for-oss)
application, which is assessed on repository usage, ecosystem importance,
evidence of active maintenance, and your role as a core maintainer.

A repository created the week you apply, with no users and no history, will not
clear that bar however good the code is. A repository with three months of
commits, a handful of closed issues, some real users, and a tool the ecosystem
genuinely needs during a migration deadline is a different application entirely.

Concretely, over the next few months:

- Announce it where MCP server authors are: the `modelcontextprotocol`
  discussions, r/mcp, Hacker News when v1.0 lands
- Run it against well-known open-source MCP servers and open helpful,
  non-spammy migration issues on their repositories — this is how the tool gets
  discovered and how "ecosystem importance" becomes true rather than claimed
- Respond to issues within a few days
- Cut releases as the SDKs settle and new failure modes surface
- Keep `docs/rules/` current as the spec evolves

Apply once there is a track record to point at, not before.
