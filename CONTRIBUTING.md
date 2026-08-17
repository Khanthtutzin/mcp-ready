# Contributing to mcp-ready

Thanks for helping. The most valuable contribution is usually a **new rule** or
a **false-positive report**, and both are deliberately cheap to make.

## Getting set up

```bash
git clone https://github.com/Khanthtutzin/mcp-ready.git
cd mcp-ready
npm install
npm test
```

Node 20 or newer. There are no runtime dependencies and there should never be
any — if a change seems to need one, open an issue first so we can talk about
it.

```bash
npm test           # full suite against real fixture servers
npm run typecheck
npm run lint
npm run docs:rules # regenerate docs/rules/ after editing a rule
npm run build
```

## Adding a rule

A rule is one file in `src/rules/`, one entry in the registry, and one test.
Rules never construct transports or touch sockets — they receive a
`ProbeContext` and nothing else, which is what keeps them independent of each
other and of the transport layer.

**1. Create `src/rules/MCP0NN.ts`.** Use the next free number; ids are
permanent and are never reissued, because someone has them in a `--skip` list.

```ts
import type { ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { finding, type Finding, type Rule } from './types.js';

/**
 * Explain *why the spec changed*, not just what the rule does. This JSDoc is
 * the source of the rule's documentation page, so write it for a maintainer
 * who is seeing the change for the first time.
 */
export const MCP0NN: Rule = {
  id: 'MCP0NN',
  title: 'Short, specific statement of what is wrong',
  severity: 'error', // or 'warning' for deprecations and SHOULDs
  specRef: specUrl('basic/lifecycle'),
  changelogRef: 'Major change N (SEP-NNNN)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const ex = await ctx.call('some/method', {});
    if (/* server is fine */ true) return [];

    return [
      finding(this, {
        observed: 'What the probe actually saw.',
        expected: 'What 2026-07-28 requires instead.',
        fix: 'The concrete change to make.',
        evidence: [ex],
      }),
    ];
  },
};
```

The JSDoc block must sit **directly above the export** — the docs generator
reads it from there. Put helper constants above the JSDoc, not between it and
the export.

**2. Register it** in `src/rules/index.ts`.

**3. Give it a fixture to catch.** Fixture servers live in
`test/fixtures/servers/handlers.mjs` and are hand-written plain JavaScript on
purpose: an up-to-date SDK would refuse to emit the wrong behaviours we need to
reproduce. Add the legacy behaviour there, and make sure the `modern` mode
stays clean.

**4. Write the test.** Every rule needs both directions:

```ts
it('catches the legacy behaviour', async () => {
  const report = await checkStdio('legacy', { only: ['MCP0NN'] });
  expect(ruleIds(report)).toContain('MCP0NN');
});

it('stays quiet on a compliant server', async () => {
  const report = await checkStdio('modern', { only: ['MCP0NN'] });
  expect(report.findings).toEqual([]);
});
```

The "stays quiet" half matters more than the other one. A tool that cries wolf
gets uninstalled.

**5. Regenerate the docs** with `npm run docs:rules` and commit the result.
CI fails if they are stale.

## Writing good findings

Three fields do the work, and each has a job:

- `observed` — what we actually saw, quoting real values. Never a paraphrase of
  the rule title.
- `expected` — what the spec requires, in the spec's terms.
- `fix` — the specific change. "Add `resultType: "complete"` to every ordinary
  result" is useful; "make your server compliant" is not.

Write for someone who has not read the changelog and does not want to.

## Reporting a false positive

These are important — please open an issue with:

- the rule id
- the output of `mcp-ready ... --only MCP0NN --verbose`, which includes the
  JSON-RPC exchange
- what your server does and why you believe it is correct

A confirmed false positive is treated as a bug, not a preference.

## Rule severity

- `error` — a 2026-07-28 client will not work against this server
- `warning` — deprecated, a `SHOULD`, or a degradation rather than a break

When in doubt, use `warning`. Being wrong in the `error` direction costs users
a broken build.

## Scope

This tool checks migration to 2026-07-28 by probing a live server. Things that
are out of scope: general MCP conformance already covered by
[MCP Inspector](https://modelcontextprotocol.io/) and others, static source
analysis, and performance testing.

## Commits and pull requests

Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) are
preferred but not enforced. Keep pull requests focused — one rule, or one fix,
per PR reviews much faster than a batch.

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
