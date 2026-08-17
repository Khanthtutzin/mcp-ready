import { describe, expect, it } from 'vitest';
import { renderJson, toJsonReport } from '../src/report/json.js';
import { renderMarkdown } from '../src/report/markdown.js';
import { renderSarif } from '../src/report/sarif.js';
import { renderTerminal } from '../src/report/terminal.js';
import { checkStdio } from './helpers.js';

describe('reporters', () => {
  it('renders a terminal report without ANSI when colour is off', async () => {
    const report = await checkStdio('legacy');
    const text = renderTerminal(report, { color: false });

    // eslint-disable-next-line no-control-regex
    expect(text).not.toMatch(/\[/);
    expect(text).toContain('NOT READY');
    expect(text).toContain('MCP001');
    expect(text).toContain('https://modelcontextprotocol.io/');
  });

  it('marks a compliant server as ready', async () => {
    const report = await checkStdio('modern');
    expect(renderTerminal(report, { color: false })).toContain('READY');
  });

  it('includes wire traffic only when verbose', async () => {
    const report = await checkStdio('legacy', { only: ['MCP006'] });
    expect(renderTerminal(report, { color: false, verbose: false })).not.toContain(
      'traffic',
    );
    expect(renderTerminal(report, { color: false, verbose: true })).toContain('traffic');
  });

  it('emits JSON matching the documented shape', async () => {
    const report = await checkStdio('legacy');
    const json = toJsonReport(report, '1.2.3');

    expect(json.schemaVersion).toBe(1);
    expect(json.tool).toEqual({ name: 'mcp-ready', version: '1.2.3' });
    expect(json.ready).toBe(false);
    expect(json.summary.errors).toBeGreaterThan(0);
    expect(json.summary.crashed).toBe(0);
    for (const f of json.findings) {
      expect(Object.keys(f).sort()).toEqual([
        'expected',
        'fix',
        'observed',
        'ruleId',
        'severity',
        'specRef',
        'title',
      ]);
    }
    // Must survive a round trip: the shape is a public contract.
    expect(JSON.parse(renderJson(report, '1.2.3'))).toEqual(json);
  });

  it('emits valid SARIF 2.1.0 with one rule descriptor per rule', async () => {
    const report = await checkStdio('legacy');
    const sarif = JSON.parse(renderSarif(report, '1.2.3'));

    expect(sarif.version).toBe('2.1.0');
    const run = sarif.runs[0];
    expect(run.tool.driver.name).toBe('mcp-ready');
    expect(run.tool.driver.rules.length).toBe(18);
    expect(run.results.length).toBe(report.findings.length);

    // Every result must reference a declared rule, or GitHub drops it.
    const declared = new Set(run.tool.driver.rules.map((r: { id: string }) => r.id));
    for (const result of run.results) {
      expect(declared.has(result.ruleId)).toBe(true);
      expect(['error', 'warning']).toContain(result.level);
      expect(result.locations[0].physicalLocation.artifactLocation.uri).toBeTruthy();
    }
  });

  it('emits markdown with a table and a details block', async () => {
    const report = await checkStdio('legacy');
    const md = renderMarkdown(report);

    expect(md).toContain('## mcp-ready');
    expect(md).toContain('**Not ready.**');
    expect(md).toContain('| Rule | Issue |');
    expect(md).toContain('<details>');
  });
});
