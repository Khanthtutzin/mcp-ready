import type { ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { checkRemovedMethod } from './helpers.js';
import type { Finding, Rule } from './types.js';

/**
 * `ping` existed to keep a session alive. With no session to keep alive, it was
 * removed. Liveness is now a transport concern.
 */
export const MCP006: Rule = {
  id: 'MCP006',
  title: 'The removed ping method is still implemented',
  severity: 'error',
  specRef: specUrl('basic/index'),
  changelogRef: 'Major change 5 (SEP-2575)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    return checkRemovedMethod(
      this,
      ctx,
      'ping',
      {},
      'Delete the ping handler. Health checking belongs to the transport: use an HTTP health endpoint, or process liveness for stdio.',
    );
  },
};
