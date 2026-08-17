import { errorCode, type ProbeContext } from '../probe/context.js';
import { ERROR_CODES, specUrl } from '../protocol.js';
import { NONEXISTENT_URI } from './helpers.js';
import { finding, type Finding, type Rule } from './types.js';

/**
 * Resource-not-found moved from the ad-hoc `-32002` to JSON-RPC's standard
 * `-32602` (Invalid Params). `-32002` now sits in the implementation-defined
 * block, so a client cannot tell a stale not-found from a vendor-specific
 * error.
 */
export const MCP011: Rule = {
  id: 'MCP011',
  title: 'Resource-not-found still returns the old -32002 error code',
  remediation: 'sdk',
  severity: 'error',
  specRef: specUrl('server/resources'),
  changelogRef: 'Minor change 6',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const ex = await ctx.call('resources/read', { uri: NONEXISTENT_URI });
    if (errorCode(ex) !== ERROR_CODES.legacyResourceNotFound) return [];

    return [
      finding(this, {
        observed: `resources/read on an unknown URI returned error ${ERROR_CODES.legacyResourceNotFound}.`,
        expected: `Resource-not-found is reported as ${ERROR_CODES.invalidParams} (Invalid Params), per JSON-RPC.`,
        fix: `Change the resource-not-found error code from ${ERROR_CODES.legacyResourceNotFound} to ${ERROR_CODES.invalidParams}.`,
        evidence: [ex],
      }),
    ];
  },
};
