import { succeeded, type ProbeContext } from '../probe/context.js';
import { HTTP_HEADERS, specUrl } from '../protocol.js';
import { describe, finding, type Finding, type Rule } from './types.js';

/**
 * SEP-2243 requires `Mcp-Method` and `Mcp-Name` on Streamable HTTP POSTs, so
 * that ordinary HTTP infrastructure — proxies, gateways, WAFs — can route and
 * rate-limit MCP traffic without parsing JSON bodies. A server that rejects
 * requests carrying them cannot be deployed behind that infrastructure.
 *
 * Detected the same asymmetric way as MCP013: fails with the headers, succeeds
 * without.
 */
export const MCP014: Rule = {
  id: 'MCP014',
  title: 'Server rejects the required Mcp-Method and Mcp-Name headers',
  severity: 'error',
  specRef: specUrl('basic/transports/streamable-http'),
  changelogRef: 'Minor change 4 (SEP-2243)',
  appliesTo: ['http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const withHeaders = ctx.prelude.bareToolsList;
    if (succeeded(withHeaders)) return [];
    if (succeeded(ctx.prelude.postInitToolsList)) return [];

    const withoutHeaders = await ctx.call(
      'tools/list',
      {},
      { omitStandardHeaders: true },
    );
    if (!succeeded(withoutHeaders)) return [];

    return [
      finding(this, {
        observed:
          `tools/list returned ${describe(withHeaders)} when sent with the ` +
          `${HTTP_HEADERS.method} and ${HTTP_HEADERS.name} headers, but succeeded without them.`,
        expected:
          'Streamable HTTP POSTs carry Mcp-Method and Mcp-Name so HTTP intermediaries can route on them. Servers accept these headers.',
        fix: 'Allow the Mcp-Method and Mcp-Name request headers. If you validate that Mcp-Method matches the body method, reject only genuine mismatches, with -32020.',
        evidence: [withHeaders, withoutHeaders],
      }),
    ];
  },
};
