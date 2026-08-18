# Before you publish

The repository is complete and its test suite passes. A few things still need a
decision only you can make. Delete this file once you have worked through it.

## 1. Put your name on the license

`LICENSE` currently reads `Copyright (c) 2026 mcp-stateless contributors`. That is a
valid and common form, but if you would rather it carry your name, change it
now — amending a copyright line later requires every contributor's agreement.

## 2. Create the GitHub repository and push

See [PUSHING.md](PUSHING.md) for the full step-by-step.

Once it is up, set these in the repository settings:

- **Description**: "Check whether an MCP server is ready for the 2026-07-28 stateless specification."
- **Topics**: `mcp`, `model-context-protocol`, `conformance`, `migration`, `cli`, `developer-tools`
- **Features**: enable Issues and Discussions; disable Wikis and Projects
- **Security**: enable private vulnerability reporting (Settings → Security).
  `SECURITY.md` and `CODE_OF_CONDUCT.md` both link to the advisory form, and
  those links 404 until this is switched on.
- **Branch protection** on `main`: require the `test` and `quality` checks

## 3. Publish to npm

`mcp-stateless` was free on npm as of 2026-08-17, but re-check before you rely on it:

```bash
npm view mcp-stateless
```

Then add an `NPM_TOKEN` secret to the repository (Settings → Secrets and
variables → Actions) and cut the first release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow runs the full suite, verifies the tag matches
`package.json`, and publishes with provenance.

## 4. Create the `good first issue` labels and issues

Several checks are deliberately out of scope for v1, and each makes a
well-bounded first contribution. Filing them signals an active, welcoming
project — which is also what the Codex for Open Source application is assessed
on.

| Suggested title                                                                                                    | Labels                              |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Rule: verify Multi Round-Trip Request (`InputRequiredResult`) conformance — SEP-2322                               | `new-rule`, `help wanted`           |
| Rule: detect tasks still in the core protocol rather than the `io.modelcontextprotocol/tasks` extension — SEP-2663 | `new-rule`, `help wanted`           |
| Rule: check RFC 9207 `iss` is returned in authorization responses — SEP-2468                                       | `new-rule`, `good first issue`      |
| Rule: check for Client ID Metadata Documents support alongside deprecated DCR                                      | `new-rule`, `help wanted`           |
| Add `prompts/list` and `resources/list` to the `CacheableResult` check (MCP005)                                    | `good first issue`                  |
| Document a real-world migration walkthrough in `docs/`                                                             | `documentation`, `good first issue` |

## 5. Then actually maintain it

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
  discovered, and how "ecosystem importance" becomes true rather than claimed
- Respond to issues within a few days
- Cut releases as the SDKs settle and new failure modes surface
- Keep `docs/rules/` current as the spec evolves

Apply once there is a track record to point at, not before.
