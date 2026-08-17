<!-- Keep PRs focused: one rule, or one fix, reviews much faster than a batch. -->

## What this changes

## Why

<!-- For a new or changed rule, link the changelog entry and spec section it enforces. -->

## Checklist

- [ ] `npm test` passes
- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] `npm run docs:rules` run and the result committed (if a rule changed)

### For a new or changed rule

- [ ] Rule id is the next free number, and no existing id was reused
- [ ] JSDoc sits directly above the export and explains _why the spec changed_
- [ ] A fixture in `test/fixtures/servers/handlers.mjs` triggers it
- [ ] A test asserts it fires on the `legacy` fixture
- [ ] A test asserts it stays **silent** on the `modern` fixture
- [ ] `observed` quotes real values; `fix` names a specific change
- [ ] No new runtime dependency
