import { errorCode, type ProbeContext } from '../probe/context.js';
import { ERROR_CODES, HTTP_HEADERS, META, specUrl } from '../protocol.js';
import { finding, type Finding, type Rule } from './types.js';

/** The three codes moved out of the implementation-defined block. */
const RENUMBERED: Array<{ old: number; now: number; name: string }> = [
  {
    old: ERROR_CODES.legacyUnsupportedProtocolVersion,
    now: ERROR_CODES.unsupportedProtocolVersion,
    name: 'UnsupportedProtocolVersion',
  },
  {
    old: ERROR_CODES.legacyHeaderMismatch,
    now: ERROR_CODES.headerMismatch,
    name: 'HeaderMismatch',
  },
  {
    old: ERROR_CODES.legacyMissingRequiredClientCapability,
    now: ERROR_CODES.missingRequiredClientCapability,
    name: 'MissingRequiredClientCapability',
  },
];

/**
 * 2026-07-28 partitioned the JSON-RPC server-error range: -32000..-32019 stays
 * implementation-defined and -32020..-32099 is reserved for the spec. The three
 * codes introduced during the draft were renumbered out of the first block, so
 * a server still emitting the old numbers is now colliding with the
 * vendor-defined space — a client cannot tell a protocol error from whatever
 * else that server happens to use -32001 for.
 */
export const MCP012: Rule = {
  id: 'MCP012',
  title: 'Protocol error codes were not renumbered into the reserved range',
  remediation: 'sdk',
  severity: 'error',
  specRef: specUrl('basic/index#error-codes'),
  changelogRef: 'Minor change 12',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Provoke a version rejection with a revision no server can support.
    const badVersion = await ctx.call('tools/list', {
      _meta: { [META.protocolVersion]: '1999-01-01' },
    });
    const versionCode = errorCode(badVersion);
    if (
      versionCode !== undefined &&
      versionCode === ERROR_CODES.legacyUnsupportedProtocolVersion
    ) {
      const entry = RENUMBERED[0]!;
      findings.push(
        finding(this, {
          observed: `An unsupported protocolVersion was rejected with ${entry.old}.`,
          expected: `${entry.name} is ${entry.now}; ${entry.old} now falls in the implementation-defined range.`,
          fix: `Renumber ${entry.name} from ${entry.old} to ${entry.now}.`,
          evidence: [badVersion],
        }),
      );
    }

    // Provoke a header mismatch: the Mcp-Method header disagrees with the body.
    if (ctx.kind === 'http') {
      const mismatch = await ctx.call(
        'tools/list',
        {},
        { headers: { [HTTP_HEADERS.method.toLowerCase()]: 'tools/call' } },
      );
      if (errorCode(mismatch) === ERROR_CODES.legacyHeaderMismatch) {
        const entry = RENUMBERED[1]!;
        findings.push(
          finding(this, {
            title: 'HeaderMismatch still uses the pre-renumbering code',
            observed: `A mismatched ${HTTP_HEADERS.method} header was rejected with ${entry.old}.`,
            expected: `${entry.name} is ${entry.now}.`,
            fix: `Renumber ${entry.name} from ${entry.old} to ${entry.now}.`,
            evidence: [mismatch],
          }),
        );
      }
    }

    return findings;
  },
};
