import { resultOf, succeeded, type ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { describe, finding, type Finding, type Rule } from './types.js';

/**
 * `server/discover` became mandatory in 2026-07-28. It carries the identity and
 * version information the removed `initialize` handshake used to negotiate, and
 * doubles as the backward-compatibility probe on stdio.
 */
export const MCP001: Rule = {
  id: 'MCP001',
  title: 'server/discover is not implemented',
  severity: 'error',
  specRef: specUrl('basic/lifecycle'),
  changelogRef: 'Major change 3 (SEP-2575)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const ex = ctx.prelude.discover;

    if (!succeeded(ex)) {
      return [
        finding(this, {
          observed: `server/discover returned ${describe(ex)}.`,
          expected:
            'Servers MUST implement server/discover, advertising supported protocol versions, capabilities and identity.',
          fix: 'Add a server/discover handler returning { protocolVersions, capabilities, serverInfo }. Current SDKs (TypeScript, Python, Go, C#) implement this for you once upgraded to a 2026-07-28 release.',
          evidence: [ex],
        }),
      ];
    }

    // Implemented, but the payload still has to be usable.
    const result = resultOf(ex) ?? {};
    const findings: Finding[] = [];

    const versions = result['protocolVersions'];
    if (!Array.isArray(versions) || versions.length === 0) {
      findings.push(
        finding(this, {
          title: 'server/discover does not advertise protocolVersions',
          observed: `server/discover succeeded but protocolVersions was ${JSON.stringify(versions)}.`,
          expected:
            'The result MUST list every protocol revision the server supports, so clients can select one up front.',
          fix: 'Return a non-empty protocolVersions array, e.g. ["2026-07-28"].',
          evidence: [ex],
        }),
      );
    }

    if (!result['serverInfo'] || typeof result['serverInfo'] !== 'object') {
      findings.push(
        finding(this, {
          title: 'server/discover does not advertise serverInfo',
          severity: 'warning',
          observed: 'server/discover succeeded but returned no serverInfo object.',
          expected: 'The result identifies the server via serverInfo { name, version }.',
          fix: 'Include serverInfo in the server/discover result.',
          evidence: [ex],
        }),
      );
    }

    return findings;
  },
};
