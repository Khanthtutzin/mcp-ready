import {
  effectiveToolsList,
  resultOf,
  succeeded,
  type ProbeContext,
} from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { finding, type Finding, type Rule } from './types.js';

function toolNames(result: Record<string, any> | undefined): string[] {
  const tools = result?.['tools'];
  if (!Array.isArray(tools)) return [];
  return tools.map((t: unknown) =>
    typeof (t as { name?: unknown })?.name === 'string'
      ? (t as { name: string }).name
      : '?',
  );
}

/**
 * Now that list results are cacheable and no longer vary per connection,
 * ordering matters: a listing that reshuffles between calls defeats client-side
 * caching and, downstream, LLM prompt caching.
 */
export const MCP017: Rule = {
  id: 'MCP017',
  title: 'tools/list ordering is not deterministic',
  remediation: 'application',
  severity: 'warning',
  specRef: specUrl('server/tools'),
  changelogRef: 'Minor change 3',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const first = effectiveToolsList(ctx);
    const second = ctx.prelude.repeatToolsList;
    if (!first || !second || !succeeded(second)) return [];

    const a = toolNames(resultOf(first));
    const b = toolNames(resultOf(second));
    if (a.length === 0 || a.length !== b.length) return [];
    if (a.every((name, i) => name === b[i])) return [];

    return [
      finding(this, {
        observed:
          'Two consecutive tools/list calls returned the same tools in different orders: ' +
          `[${a.join(', ')}] then [${b.join(', ')}].`,
        expected:
          'Servers SHOULD return tools in a deterministic order, so clients can cache listings and LLM prompt caches keep hitting.',
        fix: 'Sort the tool list before returning it, or build it from an ordered structure rather than iterating a map or set.',
        evidence: [first, second],
      }),
    ];
  },
};
