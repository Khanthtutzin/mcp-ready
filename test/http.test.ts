import { describe, expect, it } from 'vitest';
import { checkHttp, crashedRules, ruleIds } from './helpers.js';

describe('http — legacy 2025-11-25 server', () => {
  it('reports the transport-level breaking changes', async () => {
    const report = await checkHttp('legacy');

    expect(crashedRules(report)).toEqual([]);
    expect(report.ready).toBe(false);
    expect(ruleIds(report, 'error')).toEqual(
      expect.arrayContaining([
        'MCP003', // Mcp-Session-Id still minted
        'MCP010', // GET stream endpoint still served
      ]),
    );
  });

  it('flags the deprecated HTTP+SSE handshake', async () => {
    const report = await checkHttp('legacy', { only: ['MCP016'] });
    const finding = report.findings.find((f) => f.ruleId === 'MCP016')!;
    expect(finding.severity).toBe('warning');
    expect(finding.observed).toMatch(/endpoint/);
  });

  it('detects the pre-renumbering HeaderMismatch code', async () => {
    const report = await checkHttp('legacy', { only: ['MCP012'] });
    const titles = report.findings.map((f) => f.title);
    expect(titles).toContain('HeaderMismatch still uses the pre-renumbering code');
  });

  it('quotes the offending session header as evidence', async () => {
    const report = await checkHttp('legacy', { only: ['MCP003'] });
    const finding = report.findings.find((f) => f.ruleId === 'MCP003')!;
    expect(finding.observed).toContain('fixture-session-1');
    expect(finding.evidence.length).toBeGreaterThan(0);
  });
});

describe('http — compliant 2026-07-28 server', () => {
  it('reports nothing at all', async () => {
    const report = await checkHttp('modern');

    expect(crashedRules(report)).toEqual([]);
    expect(report.findings).toEqual([]);
    expect(report.ready).toBe(true);
  });

  it('runs every http rule', async () => {
    const report = await checkHttp('modern');
    expect(report.outcomes.length).toBe(18);
  });
});

describe('http — server that rejects the routing headers', () => {
  it('identifies MCP014 as the cause', async () => {
    const report = await checkHttp('strict-headers');
    expect(crashedRules(report)).toEqual([]);

    const finding = report.findings.find((f) => f.ruleId === 'MCP014')!;
    expect(finding).toBeDefined();
    expect(finding.observed).toMatch(/succeeded without them/);
  });

  it('does not also blame the _meta envelope', async () => {
    // Both MCP013 and MCP014 look for "fails one way, succeeds another".
    // MCP013's control call still carries the headers, so it must stay quiet.
    const report = await checkHttp('strict-headers');
    expect(ruleIds(report)).not.toContain('MCP013');
  });
});
