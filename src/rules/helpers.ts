import { isMethodNotFound, type ProbeContext } from '../probe/context.js';
import { describe, finding, type Finding, type Rule } from './types.js';

/**
 * Shared implementation for "this method was removed, is it gone?".
 *
 * The three-way outcome matters. Method-not-found is a pass. A successful
 * result means the method is still live and must be deleted. Any other error
 * usually means the handler is still registered but rejected our arguments —
 * still a failure, but worth wording differently so the maintainer is not sent
 * hunting for the wrong thing.
 */
export async function checkRemovedMethod(
  rule: Rule,
  ctx: ProbeContext,
  method: string,
  params: unknown,
  fix: string,
): Promise<Finding[]> {
  const ex = await ctx.call(method, params);

  if (ex.transportError) {
    // No answer at all tells us nothing about whether the handler exists.
    return [];
  }
  if (isMethodNotFound(ex)) return [];

  const stillLive = ex.response?.error === undefined;
  return [
    finding(rule, {
      severity: stillLive ? rule.severity : 'warning',
      observed: `${method} returned ${describe(ex)}.`,
      expected: `${method} was removed in 2026-07-28 and MUST report -32601 (Method not found).`,
      fix,
      evidence: [ex],
    }),
  ];
}

/** Extract declared server capabilities from whichever probe surfaced them. */
export function serverCapabilities(ctx: ProbeContext): Record<string, any> {
  const fromDiscover = ctx.prelude.discover.response?.result?.capabilities;
  if (fromDiscover && typeof fromDiscover === 'object') return fromDiscover;
  const fromInit = ctx.prelude.legacyInitialize.response?.result?.capabilities;
  if (fromInit && typeof fromInit === 'object') return fromInit;
  return {};
}

/** A URI no real server should resolve, used to trigger not-found paths. */
export const NONEXISTENT_URI =
  'file:///mcp-ready-probe/definitely-not-a-real-resource-9f3a1c.txt';
