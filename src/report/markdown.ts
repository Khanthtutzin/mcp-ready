import type { RunReport } from '../run.js';

/**
 * Markdown suitable for a GitHub step summary or a PR comment.
 */
export function renderMarkdown(report: RunReport): string {
  const lines: string[] = [];
  const errors = report.findings.filter((f) => f.severity === 'error');
  const warnings = report.findings.filter((f) => f.severity === 'warning');

  lines.push(`## mcp-ready — MCP ${report.targetRevision} readiness`);
  lines.push('');

  if (report.unreachable) {
    lines.push(`**Unreachable.** ${report.unreachable}`);
    lines.push('');
    lines.push('No checks were run, so this is not a verdict on conformance.');
    lines.push('');
    lines.push(`\`${report.target}\` · ${report.transport}`);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(
    report.ready
      ? `**Ready.** No breaking issues across ${report.outcomes.length} checks.`
      : `**Not ready.** ${errors.length} breaking issue${errors.length === 1 ? '' : 's'} across ${report.outcomes.length} checks.`,
  );
  lines.push('');
  lines.push(`\`${report.target}\` · ${report.transport} · ${report.durationMs}ms`);
  lines.push('');

  if (errors.length) {
    lines.push('### Breaking');
    lines.push('');
    lines.push(...table(errors));
  }

  if (warnings.length) {
    lines.push('### Deprecations and advisories');
    lines.push('');
    lines.push(...table(warnings));
  }

  if (errors.length || warnings.length) {
    lines.push('<details><summary>How to fix</summary>');
    lines.push('');
    for (const f of [...errors, ...warnings]) {
      lines.push(`**${f.ruleId} — ${f.title}**`);
      lines.push('');
      lines.push(`- Found: ${f.observed}`);
      lines.push(`- Expected: ${f.expected}`);
      lines.push(`- Fix: ${f.fix}`);
      lines.push(`- Spec: ${f.specRef}`);
      lines.push('');
    }
    lines.push('</details>');
    lines.push('');
  }

  return lines.join('\n');
}

function table(findings: RunReport['findings']): string[] {
  const rows = ['| Rule | Issue |', '| --- | --- |'];
  for (const f of findings) {
    rows.push(`| [${f.ruleId}](${f.specRef}) | ${escapePipes(f.title)} |`);
  }
  rows.push('');
  return rows;
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, '\\|');
}
