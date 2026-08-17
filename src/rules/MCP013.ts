import { succeeded, type ProbeContext } from '../probe/context.js';
import { META, specUrl } from '../protocol.js';
import { describe, finding, type Finding, type Rule } from './types.js';

/**
 * With the handshake gone, every request carries its protocol version and
 * client capabilities in `params._meta`. Servers with strict schema validation
 * — particularly those that set `additionalProperties: false` on params —
 * reject these requests outright, which breaks every 2026-07-28 client while
 * leaving older ones working.
 *
 * The tell is asymmetric: the request fails *with* `_meta` and succeeds
 * without it.
 */
export const MCP013: Rule = {
  id: 'MCP013',
  title: 'Server rejects requests carrying the _meta protocol envelope',
  remediation: 'application',
  severity: 'error',
  specRef: specUrl('basic/index#meta'),
  changelogRef: 'Major change 2 (SEP-2575)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const withMeta = ctx.prelude.bareToolsList;
    if (succeeded(withMeta)) return [];
    // A server that requires the handshake fails this call for an unrelated
    // reason. MCP002 owns that diagnosis; do not double-report it.
    if (succeeded(ctx.prelude.postInitToolsList)) return [];

    const withoutMeta = await ctx.callLegacy('tools/list', {});
    if (!succeeded(withoutMeta)) return [];

    return [
      finding(this, {
        observed:
          `tools/list returned ${describe(withMeta)} when params._meta carried ` +
          `${META.protocolVersion} and ${META.clientCapabilities}, but succeeded when _meta was omitted.`,
        expected:
          'Servers read the protocol version and client capabilities from each request’s _meta. Unknown _meta keys are ignored, never rejected.',
        fix: 'Relax params validation to permit _meta (drop additionalProperties: false, or allow _meta explicitly), then read io.modelcontextprotocol/protocolVersion from it.',
        evidence: [withMeta, withoutMeta],
      }),
    ];
  },
};
