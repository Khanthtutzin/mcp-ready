import { isMethodNotFound, succeeded, type ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { describe, finding, type Finding, type Rule } from './types.js';

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
      findings.push(
        finding(this, {
          title: 'Server still accepts the removed initialize method',
          severity: requiresHandshake ? 'warning' : 'error',
          observed: 'initialize returned a successful result.',
          expected:
            'initialize was removed in 2026-07-28. A compliant server reports it as method-not-found (-32601).',
          fix: 'Delete the initialize and notifications/initialized handlers. Use server/discover for version and capability advertisement.',
          evidence: [legacyInitialize],
        }),
      );
    } else if (!isMethodNotFound(legacyInitialize) && !legacyInitialize.transportError) {
      findings.push(
        finding(this, {
          title: 'initialize is rejected with an unexpected error code',
          severity: 'warning',
          observed: `initialize returned ${describe(legacyInitialize)}.`,
          expected: 'Removed methods report -32601 (Method not found).',
          fix: 'Return -32601 for methods the server does not implement, so clients can distinguish "gone" from "broken".',
          evidence: [legacyInitialize],
        }),
      );
    }

    return findings;
  },
};
