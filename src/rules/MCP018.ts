import { effectiveToolsList, resultOf, type ProbeContext } from '../probe/context.js';
import { META, specUrl } from '../protocol.js';
import { finding, type Finding, type Rule } from './types.js';

/**
 * The handshake used to tell a client who it was talking to exactly once.
 * Statelessly, servers identify themselves in each result's `_meta` instead, so
 * a client that reconnects — or an intermediary that sees one response in
 * isolation — can still attribute it.
 */
export const MCP018: Rule = {
  id: 'MCP018',
  title: 'Results do not identify the server via _meta serverInfo',
  remediation: 'sdk',
  severity: 'warning',
  specRef: specUrl('basic/index#meta'),
  changelogRef: 'Major change 2 (SEP-2575)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const ex = effectiveToolsList(ctx);
    if (!ex) return [];
    const result = resultOf(ex);
    if (!result) return [];

    const meta = result['_meta'];
    const serverInfo =
      meta && typeof meta === 'object'
        ? (meta as Record<string, unknown>)[META.serverInfo]
        : undefined;
    if (serverInfo && typeof serverInfo === 'object') return [];

    return [
      finding(this, {
        observed: `The tools/list result carries no ${META.serverInfo} entry in _meta.`,
        expected:
          'Servers SHOULD identify themselves in each result’s _meta, now that no handshake carries that identity.',
        fix: `Add _meta: { "${META.serverInfo}": { name, version } } to results.`,
        evidence: [ex],
      }),
    ];
  },
};
