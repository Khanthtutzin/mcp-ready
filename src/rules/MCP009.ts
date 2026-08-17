import { isMethodNotFound, type ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { serverCapabilities } from './helpers.js';
import { describe, finding, type Finding, type Rule } from './types.js';

const LIST_CHANGED_CAPS = ['tools', 'prompts', 'resources'] as const;

/**
 * A server that advertises `listChanged` is promising to tell clients when its
 * listings change. Under 2026-07-28 the only way to deliver on that promise is
 * `subscriptions/listen`, so advertising one without the other is a broken
 * contract rather than a style issue.
 */
export const MCP009: Rule = {
  id: 'MCP009',
  title: 'subscriptions/listen is missing despite advertised listChanged capabilities',
  remediation: 'application',
  severity: 'error',
  specRef: specUrl('server/utilities/subscriptions'),
  changelogRef: 'Major change 4 (SEP-2575)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const caps = serverCapabilities(ctx);
    const advertised = LIST_CHANGED_CAPS.filter((key) => caps[key]?.listChanged === true);
    if (advertised.length === 0) return [];

    // A working implementation holds the stream open, so a timeout here is a
    // pass, not a failure. Only an explicit method-not-found is conclusive.
    const ex = await ctx.call(
      'subscriptions/listen',
      { subscribe: { toolsListChanged: true } },
      { timeoutMs: 2500 },
    );

    if (!isMethodNotFound(ex)) return [];

    return [
      finding(this, {
        observed:
          `The server advertises listChanged for ${advertised.join(', ')}, ` +
          `but subscriptions/listen returned ${describe(ex)}.`,
        expected:
          'Change notifications are delivered over subscriptions/listen, a single long-lived POST-response stream clients opt into.',
        fix: 'Either implement subscriptions/listen, or stop advertising listChanged for capabilities you cannot notify on. The old HTTP GET stream is no longer an option.',
        evidence: [ex],
      }),
    ];
  },
};
