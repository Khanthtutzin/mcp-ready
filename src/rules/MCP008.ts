import type { ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { checkRemovedMethod, NONEXISTENT_URI } from './helpers.js';
import type { Finding, Rule } from './types.js';

const FIX =
  'Delete the resources/subscribe and resources/unsubscribe handlers. Implement subscriptions/listen instead: a single long-lived POST-response stream that clients opt into, tagging each notification with io.modelcontextprotocol/subscriptionId.';

/**
 * Per-resource subscription methods were folded into one opt-in stream,
 * `subscriptions/listen`. Both old methods are removed.
 */
export const MCP008: Rule = {
  id: 'MCP008',
  title: 'The removed resources/subscribe methods are still implemented',
  severity: 'error',
  specRef: specUrl('server/resources'),
  changelogRef: 'Major change 4 (SEP-2575)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const subscribe = await checkRemovedMethod(
      this,
      ctx,
      'resources/subscribe',
      { uri: NONEXISTENT_URI },
      FIX,
    );
    const unsubscribe = await checkRemovedMethod(
      this,
      ctx,
      'resources/unsubscribe',
      { uri: NONEXISTENT_URI },
      FIX,
    );
    return [...subscribe, ...unsubscribe];
  },
};
