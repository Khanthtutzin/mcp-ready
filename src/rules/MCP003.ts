import type { ProbeContext } from '../probe/context.js';
import { HTTP_HEADERS, specUrl } from '../protocol.js';
import { finding, type Finding, type Rule } from './types.js';

const SESSION_HEADER = HTTP_HEADERS.legacySessionId.toLowerCase();

/**
 * Protocol-level sessions are gone, and with them `Mcp-Session-Id`. A server
 * still minting the header is carrying cross-call state that 2026-07-28
 * clients will not echo back, so that state silently stops working.
 */
export const MCP003: Rule = {
  id: 'MCP003',
  title: 'Server still uses the removed Mcp-Session-Id header',
  remediation: 'sdk',
  severity: 'error',
  specRef: specUrl('basic/transports/streamable-http'),
  changelogRef: 'Major change 1 (SEP-2567)',
  appliesTo: ['http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const offenders = ctx.transcript.filter(
      (ex) => ex.responseHeaders[SESSION_HEADER] !== undefined,
    );
    if (offenders.length === 0) return [];

    const value = offenders[0]!.responseHeaders[SESSION_HEADER]!;
    return [
      finding(this, {
        observed: `The server returned ${HTTP_HEADERS.legacySessionId}: ${value} on ${offenders.length} response(s).`,
        expected:
          'Protocol-level sessions and the Mcp-Session-Id header were removed from the Streamable HTTP transport.',
        fix: 'Stop issuing Mcp-Session-Id. Where a tool genuinely needs cross-call state, mint an explicit handle and return it as ordinary tool output, then accept it back as a normal tool argument.',
        evidence: offenders.slice(0, 3),
      }),
    ];
  },
};
