import type { ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { finding, type Finding, type Rule } from './types.js';

/**
 * The GET half of Streamable HTTP — the always-open server-to-client stream —
 * was replaced by `subscriptions/listen`. A GET endpoint still answering with
 * an event stream means the old notification path is live, and clients that no
 * longer open it will silently miss everything sent down it.
 */
export const MCP010: Rule = {
  id: 'MCP010',
  title: 'The removed HTTP GET stream endpoint is still served',
  remediation: 'sdk',
  severity: 'error',
  specRef: specUrl('basic/transports/streamable-http'),
  changelogRef: 'Major change 4 (SEP-2575)',
  appliesTo: ['http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    if (!ctx.transport.rawRequest) return [];
    const res = await ctx.transport.rawRequest('GET');

    // Anything other than a live event stream is fine: 405, 404 and 400 are all
    // reasonable ways to say "we do not serve GET here".
    const contentType = (res.headers['content-type'] ?? '').toLowerCase();
    const servesStream = res.status === 200 && contentType.includes('text/event-stream');
    if (!servesStream) return [];

    return [
      finding(this, {
        observed: `GET ${ctx.target} returned HTTP 200 with content-type ${contentType}.`,
        expected:
          'The GET endpoint was removed from Streamable HTTP. Server-to-client notifications now flow over subscriptions/listen, which is a POST.',
        fix: 'Stop serving GET on the MCP endpoint — respond 405 — and move change notifications to subscriptions/listen.',
        evidence: [],
      }),
    ];
  },
};
