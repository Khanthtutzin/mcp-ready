import { effectiveToolsList, resultOf, type ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { finding, type Finding, type Rule } from './types.js';

const VALID_SCOPES = new Set(['public', 'private']);

/**
 * SEP-2549 made list and read results cacheable, requiring `ttlMs` and
 * `cacheScope`. Now that list endpoints no longer vary per connection, these
 * are what let clients and intermediaries stop re-polling — a large part of
 * the practical win from going stateless.
 */
export const MCP005: Rule = {
  id: 'MCP005',
  title: 'List results are missing the required ttlMs and cacheScope fields',
  severity: 'error',
  specRef: specUrl('server/utilities/caching'),
  changelogRef: 'Minor change 5 (SEP-2549)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const ex = effectiveToolsList(ctx);
    if (!ex) return [];
    const result = resultOf(ex);
    if (!result) return [];

    const findings: Finding[] = [];
    const ttl = result['ttlMs'];
    const scope = result['cacheScope'];

    if (typeof ttl !== 'number') {
      findings.push(
        finding(this, {
          observed:
            ttl === undefined
              ? 'The tools/list result has no ttlMs field.'
              : `tools/list returned ttlMs: ${JSON.stringify(ttl)}, which is not a number.`,
          expected:
            'Results from tools/list, prompts/list, resources/list, resources/read and resources/templates/list implement CacheableResult, carrying ttlMs as a freshness hint in milliseconds.',
          fix: 'Add a numeric ttlMs to every list and read result. Use 0 if the result must never be cached.',
          evidence: [ex],
        }),
      );
    }

    if (typeof scope !== 'string' || !VALID_SCOPES.has(scope)) {
      findings.push(
        finding(this, {
          title: 'List results are missing a valid cacheScope',
          observed:
            scope === undefined
              ? 'The tools/list result has no cacheScope field.'
              : `tools/list returned cacheScope: ${JSON.stringify(scope)}.`,
          expected: 'cacheScope is "public" or "private".',
          fix: 'Add cacheScope to list and read results. Use "private" when the response depends on the authenticated caller, "public" when a shared intermediary may cache it.',
          evidence: [ex],
        }),
      );
    }

    return findings;
  },
};
