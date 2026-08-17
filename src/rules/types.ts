import type { ProbeContext } from '../probe/context.js';
import type { Exchange } from '../transport/types.js';

export type Severity = 'error' | 'warning';
export type TransportKind = 'stdio' | 'http';

/**
 * Who actually has to make the change.
 *
 * This distinction came out of running the checker against the official MCP
 * servers: nearly every finding was protocol plumbing owned by the SDK, not
 * something the server author wrote. Telling a maintainer to "delete the ping
 * handler" is unhelpful when they never wrote one — the SDK registered it.
 *
 * - `sdk`         — resolved by upgrading to an SDK release that targets
 *                   2026-07-28. Nothing to do in the server's own code.
 * - `application` — a choice the server author made: capabilities they
 *                   declared, schemas they wrote, features they opted into.
 */
export type Remediation = 'sdk' | 'application';

/**
 * One thing a server does that 2026-07-28 says it should not.
 *
 * A finding is written to be actionable on its own: what we saw, what the spec
 * asks for, and the concrete change that closes the gap.
 */
export interface Finding {
  ruleId: string;
  severity: Severity;
  /** Whether an SDK upgrade fixes this, or the server author must act. */
  remediation: Remediation;
  title: string;
  /** What the probe actually observed. */
  observed: string;
  /** What the target revision requires instead. */
  expected: string;
  /** The concrete change to make. */
  fix: string;
  /** Deep link into the specification. */
  specRef: string;
  /** Wire traffic backing the finding, quoted in verbose reports. */
  evidence: Exchange[];
}

/**
 * A single migration check.
 *
 * Rules receive a `ProbeContext` and nothing else. They never construct
 * transports, never assume they run in a particular order, and never depend on
 * another rule having run. Adding one is a self-contained change.
 */
export interface Rule {
  /** Stable identifier, e.g. `MCP001`. Never reused or renumbered. */
  readonly id: string;
  readonly title: string;
  /** Default severity; individual findings may override it. */
  readonly severity: Severity;
  /** Whether an SDK upgrade fixes this, or the server author must act. */
  readonly remediation: Remediation;
  /** Deep link into the specification. */
  readonly specRef: string;
  /** Which changelog entry this rule enforces, for traceability. */
  readonly changelogRef: string;
  readonly appliesTo: readonly TransportKind[];
  run(ctx: ProbeContext): Promise<Finding[]>;
}

/** Build a finding, inheriting the rule's id, title, severity and spec link. */
export function finding(
  rule: Rule,
  parts: Partial<Pick<Finding, 'title' | 'severity'>> &
    Pick<Finding, 'observed' | 'expected' | 'fix'> & { evidence?: Exchange[] },
): Finding {
  return {
    ruleId: rule.id,
    title: parts.title ?? rule.title,
    severity: parts.severity ?? rule.severity,
    remediation: rule.remediation,
    specRef: rule.specRef,
    observed: parts.observed,
    expected: parts.expected,
    fix: parts.fix,
    evidence: parts.evidence ?? [],
  };
}

/** Describe an exchange's outcome in one line, for `observed` strings. */
export function describe(ex: Exchange | null): string {
  if (!ex) return 'not probed';
  if (ex.transportError) return `no response (${ex.transportError})`;
  const err = ex.response?.error;
  if (err) return `JSON-RPC error ${err.code}: ${err.message}`;
  return 'a successful result';
}
