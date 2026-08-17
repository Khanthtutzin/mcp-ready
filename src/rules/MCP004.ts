import {
  effectiveToolsList,
  resultOf,
  succeeded,
  type ProbeContext,
} from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { finding, type Finding, type Rule } from './types.js';
import type { Exchange } from '../transport/types.js';

const VALID = new Set(['complete', 'input_required']);

/**
 * SEP-2322 added a required `resultType` discriminator to every result, so a
 * client can tell an ordinary result from an interim Multi Round-Trip request.
 * Clients are told to treat a missing field as `"complete"` for backward
 * compatibility, which means omitting it is survivable today but blocks the
 * server from ever using MRTR.
 */
export const MCP004: Rule = {
  id: 'MCP004',
  title: 'Results are missing the required resultType field',
  remediation: 'sdk',
  severity: 'error',
  specRef: specUrl('basic/patterns/mrtr'),
  changelogRef: 'Major change 8 (SEP-2322)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const candidates: Array<[string, Exchange | null]> = [
      ['tools/list', effectiveToolsList(ctx)],
      ['server/discover', succeeded(ctx.prelude.discover) ? ctx.prelude.discover : null],
    ];

    const findings: Finding[] = [];
    for (const [method, ex] of candidates) {
      if (!ex) continue;
      const result = resultOf(ex);
      if (!result) continue;

      const value = result['resultType'];
      if (value === undefined) {
        findings.push(
          finding(this, {
            observed: `The ${method} result has no resultType field.`,
            expected: 'All results carry resultType: "complete" or "input_required".',
            fix: 'Add resultType: "complete" to every ordinary result. Reserve "input_required" for interim Multi Round-Trip results.',
            evidence: [ex],
          }),
        );
      } else if (typeof value !== 'string' || !VALID.has(value)) {
        findings.push(
          finding(this, {
            title: 'resultType has an invalid value',
            observed: `The ${method} result carried resultType: ${JSON.stringify(value)}.`,
            expected: 'resultType is either "complete" or "input_required".',
            fix: 'Use "complete" for ordinary results.',
            evidence: [ex],
          }),
        );
      }
    }
    return findings;
  },
};
