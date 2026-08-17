import { createProbeContext } from './probe/context.js';
import { TARGET_REVISION } from './protocol.js';
import { rulesFor } from './rules/index.js';
import type { Finding, Rule } from './rules/types.js';
import type { Exchange, Transport } from './transport/types.js';

export interface RunOptions {
  /** Only run these rule ids. Mutually exclusive with `skip`. */
  only?: string[];
  /** Skip these rule ids. */
  skip?: string[];
  timeoutMs?: number;
}

export interface RuleOutcome {
  rule: Rule;
  findings: Finding[];
  /** Set when the rule itself threw. A crashed rule is a bug in us, not them. */
  crashed?: string;
  durationMs: number;
}

export interface RunReport {
  target: string;
  transport: 'stdio' | 'http';
  targetRevision: string;
  startedAt: string;
  durationMs: number;
  outcomes: RuleOutcome[];
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  /** No errors. Warnings do not block. */
  ready: boolean;
  /**
   * Set when the server never answered anything. No rules were run, and the
   * findings list is empty — reporting eighteen conformance failures against a
   * server that failed to start would be actively misleading.
   */
  unreachable?: string;
  /** Out-of-band notes from the transport, e.g. child-process stderr. */
  diagnostics: string[];
}

function selectRules(kind: 'stdio' | 'http', options: RunOptions): Rule[] {
  const applicable = rulesFor(kind);
  const only = options.only?.map((id) => id.toUpperCase());
  const skip = new Set(options.skip?.map((id) => id.toUpperCase()) ?? []);

  return applicable.filter((rule) => {
    if (only && !only.includes(rule.id.toUpperCase())) return false;
    return !skip.has(rule.id.toUpperCase());
  });
}

/**
 * Decide whether the prelude failed to reach a server at all.
 *
 * The distinction that matters: a JSON-RPC *error* is a conversation — the
 * server is there and has opinions. A transport error on every single probe
 * means there is nothing on the other end, and every conformance verdict we
 * could draw from that would be an artefact of our own failure to connect.
 */
function unreachableReason(transcript: Exchange[]): string | undefined {
  if (transcript.length === 0) return 'No probes were sent.';
  const failures = transcript.filter((ex) => ex.transportError);
  if (failures.length !== transcript.length) return undefined;
  return failures[0]!.transportError;
}

/**
 * Probe a server and evaluate every applicable rule.
 *
 * Rules are run sequentially and in id order. That is deliberate: they share
 * one connection, several of them provoke error paths, and a server under
 * concurrent probing produces reports that are hard to reproduce.
 *
 * The caller owns the transport's lifetime — this function does not close it,
 * so a caller can inspect diagnostics afterwards.
 */
export async function runChecks(
  transport: Transport,
  options: RunOptions = {},
): Promise<RunReport> {
  const startedAt = new Date().toISOString();
  const start = Date.now();

  const ctx = await createProbeContext(transport, { timeoutMs: options.timeoutMs });

  const unreachable = unreachableReason(ctx.transcript);
  if (unreachable) {
    return {
      target: transport.target,
      transport: transport.kind,
      targetRevision: TARGET_REVISION,
      startedAt,
      durationMs: Date.now() - start,
      outcomes: [],
      findings: [],
      errorCount: 0,
      warningCount: 0,
      ready: false,
      unreachable,
      diagnostics: transport.diagnostics(),
    };
  }

  const rules = selectRules(transport.kind, options);
  const outcomes: RuleOutcome[] = [];

  for (const rule of rules) {
    const ruleStart = Date.now();
    try {
      const findings = await rule.run(ctx);
      outcomes.push({ rule, findings, durationMs: Date.now() - ruleStart });
    } catch (err) {
      outcomes.push({
        rule,
        findings: [],
        crashed: err instanceof Error ? (err.stack ?? err.message) : String(err),
        durationMs: Date.now() - ruleStart,
      });
    }
  }

  const findings = outcomes.flatMap((o) => o.findings);
  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;

  return {
    target: transport.target,
    transport: transport.kind,
    targetRevision: TARGET_REVISION,
    startedAt,
    durationMs: Date.now() - start,
    outcomes,
    findings,
    errorCount,
    warningCount,
    ready: errorCount === 0,
    diagnostics: transport.diagnostics(),
  };
}
