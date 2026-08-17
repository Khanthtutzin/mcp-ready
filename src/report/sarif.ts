import type { RunReport } from '../run.js';
import { ALL_RULES } from '../rules/index.js';

/**
 * SARIF 2.1.0 output, so a run can be uploaded with
 * `github/codeql-action/upload-sarif` and surface in a repository's Security
 * tab and on pull requests.
 *
 * SARIF is file-oriented and this tool probes a live server, so there is no
 * real source location to point at. We anchor every result to the repository
 * root, which is what other non-file scanners do and what GitHub renders
 * acceptably.
 */
const ANCHOR = 'README.md';

export function renderSarif(report: RunReport, version: string): string {
  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'mcp-ready',
            version,
            informationUri: 'https://github.com/mcp-ready/mcp-ready',
            rules: ALL_RULES.map((rule) => ({
              id: rule.id,
              name: rule.id,
              shortDescription: { text: rule.title },
              fullDescription: {
                text: `${rule.title}. Enforces: ${rule.changelogRef} of the MCP ${report.targetRevision} specification.`,
              },
              helpUri: rule.specRef,
              defaultConfiguration: {
                level: rule.severity === 'error' ? 'error' : 'warning',
              },
              properties: {
                tags: ['mcp', 'migration', report.targetRevision],
              },
            })),
          },
        },
        invocations: [
          {
            executionSuccessful: true,
            startTimeUtc: report.startedAt,
            commandLine: `mcp-ready ${report.target}`,
          },
        ],
        results: report.findings.map((f) => ({
          ruleId: f.ruleId,
          level: f.severity === 'error' ? 'error' : 'warning',
          message: {
            text: `${f.title}. Found: ${f.observed} Expected: ${f.expected} Fix: ${f.fix}`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: ANCHOR },
                region: { startLine: 1 },
              },
            },
          ],
          partialFingerprints: {
            // Stable across runs so GitHub can track a finding over time; the
            // target is included so two servers in one repo do not collide.
            mcpReadyFindingV1: `${f.ruleId}:${report.target}`,
          },
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
