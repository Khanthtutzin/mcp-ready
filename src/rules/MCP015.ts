import type { ProbeContext } from '../probe/context.js';
import { specUrl } from '../protocol.js';
import { serverCapabilities } from './helpers.js';
import { finding, type Finding, type Rule } from './types.js';

/** The three deprecated features, each with its suggested replacement. */
const DEPRECATED_CAPABILITIES: Array<{
  key: string;
  label: string;
  migration: string;
}> = [
  {
    key: 'logging',
    label: 'Logging',
    migration:
      'Log to stderr on stdio, or emit OpenTelemetry spans. 2026-07-28 documents trace-context propagation through _meta (traceparent, tracestate, baggage).',
  },
  {
    key: 'sampling',
    label: 'Sampling',
    migration:
      'Call an LLM provider API directly rather than borrowing the client’s model.',
  },
  {
    key: 'roots',
    label: 'Roots',
    migration:
      'Accept directories and files as ordinary tool parameters, resource URIs, or server configuration.',
  },
];

/**
 * SEP-2577 deprecated Roots, Sampling and Logging. They still work — the
 * deprecation window is at least twelve months — but they are scheduled for
 * removal, so anything new should not adopt them, and anything existing should
 * plan a migration while the window is open.
 */
export const MCP015: Rule = {
  id: 'MCP015',
  title: 'Server declares deprecated Roots, Sampling or Logging capabilities',
  severity: 'warning',
  specRef: specUrl('deprecated'),
  changelogRef: 'Deprecated 1 (SEP-2577)',
  appliesTo: ['stdio', 'http'],

  async run(ctx: ProbeContext): Promise<Finding[]> {
    const caps = serverCapabilities(ctx);
    return DEPRECATED_CAPABILITIES.filter((entry) => caps[entry.key] !== undefined).map(
      (entry) =>
        finding(this, {
          title: `${entry.label} is deprecated`,
          observed: `The server declares the "${entry.key}" capability.`,
          expected: `${entry.label} remains functional during the deprecation window but is scheduled for removal. New implementations should not adopt it.`,
          fix: entry.migration,
          evidence: [ctx.prelude.discover],
        }),
    );
  },
};
