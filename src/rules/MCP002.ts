import {
  errorCode,
  isMethodNotFound,
  succeeded,
  type ProbeContext,
} from '../probe/context.js';
import { ERROR_CODES, specUrl } from '../protocol.js';
import type { Exchange } from '../transport/types.js';
import { describe, finding, type Finding, type Rule } from './types.js';

/**
 * `initialize` is gone from the schema entirely, and the spec does not say
 * which error replaces it. Two answers are defensible and both are useful to a
 * client: `-32601` because the method no longer exists, or `-32022`
 * (UnsupportedProtocolVersion) because receiving `initialize` at all is a
 * legacy-era client announcing itself. The reference TypeScript SDK chose the
 * latter, so faulting it would be inventing a requirement.
 */
function isVersionRejection(ex: Exchange): boolean {
  return errorCode(ex) === ERROR_CODES.unsupportedProtocolVersion;
}

/**
 * The `initialize` / `notifications/initialized` handshake was removed. Two
 * distinct failures fall out of that, and they are not equally severe:
 *
 *  - The server *requires* the handshake before it will serve anything. Every
 *    2026-07-28 client breaks against it. That is an error.
 *  - The server merely still *accepts* `initialize`. Clients work, but the
 *    method is gone from the spec and will be dropped. That is a warning.
 */
export const MCP002: Rule = {
  id: 'MCP002',
  title: 'Server still requires the initialize handshake',
  remediation: 'sdk',
  severity: 'error',
  specRef: specUrl('basic/lifecycle'),
  changelogRef: 'Major change 2 (SEP-2575)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const { bareToolsList, legacyInitialize, postInitToolsList } = ctx.prelude;
    const findings: Finding[] = [];

    const requiresHandshake =
      !succeeded(bareToolsList) &&
      succeeded(legacyInitialize) &&
      succeeded(postInitToolsList);

    if (requiresHandshake) {
      findings.push(
        finding(this, {
          observed:
            `tools/list without a handshake returned ${describe(bareToolsList)}, ` +
            'but the same call succeeded after initialize. The server is still stateful.',
          expected:
            'Every request stands alone. Servers MUST serve tools/list with no prior handshake, reading the protocol version and client capabilities from each request’s _meta.',
          fix: 'Remove the initialization gate from your request handling. Read io.modelcontextprotocol/protocolVersion and io.modelcontextprotocol/clientCapabilities from params._meta on each request instead of from stored session state.',
          evidence: [bareToolsList, legacyInitialize, postInitToolsList!],
        }),
      );
    }

    if (succeeded(legacyInitialize)) {
      // Accepting `initialize` is only a fault if the server cannot also serve
      // the new era. A server that answers server/discover AND still handles
      // the old handshake is dual-era — the SDK's own documented, recommended
      // migration path for the twelve-month window. Marking that NOT READY
      // would fail exactly the servers that did the right thing.
      const alsoServesModern = succeeded(ctx.prelude.discover);
      findings.push(
        finding(this, {
          title: alsoServesModern
            ? 'Server also serves the legacy era (dual-era)'
            : 'Server still accepts the removed initialize method',
          severity: alsoServesModern || requiresHandshake ? 'warning' : 'error',
          observed: 'initialize returned a successful result.',
          expected: alsoServesModern
            ? 'Nothing, for now. Serving both eras is the recommended migration path while the deprecation window is open.'
            : 'initialize was removed in 2026-07-28. A compliant server reports it as method-not-found (-32601).',
          fix: alsoServesModern
            ? 'No action needed today. Drop the initialize and notifications/initialized handlers once you stop supporting pre-2026 clients.'
            : 'Delete the initialize and notifications/initialized handlers. Use server/discover for version and capability advertisement.',
          evidence: [legacyInitialize],
        }),
      );
    } else if (
      !isMethodNotFound(legacyInitialize) &&
      !isVersionRejection(legacyInitialize) &&
      !legacyInitialize.transportError
    ) {
      findings.push(
        finding(this, {
          title: 'initialize is rejected with an unexpected error code',
          severity: 'warning',
          observed: `initialize returned ${describe(legacyInitialize)}.`,
          expected:
            'A rejection a client can act on: -32601 (Method not found), or -32022 (UnsupportedProtocolVersion) if the server reads the call as a legacy-era client.',
          fix: 'Return -32601 for methods the server does not implement, or -32022 to tell a legacy client to renegotiate.',
          evidence: [legacyInitialize],
        }),
      );
    }

    return findings;
  },
};
