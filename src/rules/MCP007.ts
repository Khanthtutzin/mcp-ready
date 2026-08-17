import type { ProbeContext } from '../probe/context.js';
import { META, specUrl } from '../protocol.js';
import { checkRemovedMethod } from './helpers.js';
import type { Finding, Rule } from './types.js';

/**
 * Log level was session state, so `logging/setLevel` went with the session. It
 * is now set per request via `_meta`, and servers MUST NOT emit
 * `notifications/message` for requests that did not ask for it.
 */
export const MCP007: Rule = {
  id: 'MCP007',
  title: 'The removed logging/setLevel method is still implemented',
  remediation: 'sdk',
  severity: 'error',
  specRef: specUrl('server/utilities/logging'),
  changelogRef: 'Major change 5 (SEP-2575)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    return checkRemovedMethod(
      this,
      ctx,
      'logging/setLevel',
      { level: 'info' },
      `Delete the logging/setLevel handler. Read the per-request level from params._meta["${META.logLevel}"], and emit notifications/message only for requests that set it.`,
    );
  },
};
