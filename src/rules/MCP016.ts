import type { ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { finding, type Finding, type Rule } from './types.js';

/**
 * The original HTTP+SSE transport — a GET stream that opens with an `endpoint`
 * event naming a separate POST URL — has been deprecated since 2025-03-26 and
 * was reclassified under the formal lifecycle policy in 2026-07-28.
 *
 * Distinct from MCP010, which flags a leftover GET stream on a Streamable HTTP
 * endpoint. This rule looks for the two-endpoint handshake specifically.
 */
export const MCP016: Rule = {
  id: 'MCP016',
  title: 'Deprecated HTTP+SSE transport detected',
  remediation: 'sdk',
  severity: 'warning',
  specRef: specUrl('basic/transports/streamable-http'),
  changelogRef: 'Deprecated 2 (SEP-2596)',
  appliesTo: ['http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    if (!ctx.transport.rawRequest) return [];
    const res = await ctx.transport.rawRequest('GET');

    const isStream = (res.headers['content-type'] ?? '').includes('text/event-stream');
    const announcesEndpoint = /^event:\s*endpoint/m.test(res.bodyPreview);
    if (!isStream || !announcesEndpoint) return [];

    return [
      finding(this, {
        observed:
          `GET ${ctx.target} opened an event stream whose first event is "endpoint", ` +
          'the HTTP+SSE two-endpoint handshake.',
        expected:
          'HTTP+SSE has been deprecated since protocol version 2025-03-26 and is now Deprecated under the feature lifecycle policy.',
        fix: 'Migrate to Streamable HTTP: a single endpoint that accepts POSTed JSON-RPC and replies with either application/json or a text/event-stream response body.',
        evidence: [],
      }),
    ];
  },
};
