import { describe, expect, it } from 'vitest';
import { runChecks } from '../src/run.js';
import { renderMarkdown } from '../src/report/markdown.js';
import { renderTerminal } from '../src/report/terminal.js';
import { toJsonReport } from '../src/report/json.js';
import { StdioTransport } from '../src/transport/stdio.js';
import { HttpTransport } from '../src/transport/http.js';

/**
 * A server that never answers must not be reported as a non-conformant server.
 * Eighteen confident findings against something that failed to start is worse
 * than no output at all — it sends a maintainer chasing bugs that do not exist.
 */
describe('unreachable servers', () => {
  it('reports a stdio command that exits immediately as unreachable', async () => {
    const transport = new StdioTransport('node --eval "process.exit(1)"');
    try {
      const report = await runChecks(transport, { timeoutMs: 2000 });

      expect(report.unreachable).toBeTruthy();
      expect(report.findings).toEqual([]);
      expect(report.outcomes).toEqual([]);
      expect(report.ready).toBe(false);
      expect(report.errorCount).toBe(0);
    } finally {
      await transport.close();
    }
  });

  it('reports a closed HTTP port as unreachable', async () => {
    // Port 1 is reserved and never listening.
    const transport = new HttpTransport('http://127.0.0.1:1/mcp');
    try {
      const report = await runChecks(transport, { timeoutMs: 2000 });
      expect(report.unreachable).toBeTruthy();
      expect(report.findings).toEqual([]);
    } finally {
      await transport.close();
    }
  });

  it('says so plainly in every output format', async () => {
    const transport = new StdioTransport('node --eval "process.exit(1)"');
    try {
      const report = await runChecks(transport, { timeoutMs: 2000 });

      const text = renderTerminal(report, { color: false });
      expect(text).toContain('UNREACHABLE');
      expect(text).toContain('No checks were run');
      expect(text).not.toContain('NOT READY');

      expect(renderMarkdown(report)).toContain('**Unreachable.**');
      expect(toJsonReport(report, '1.0.0').unreachable).toBeTruthy();
    } finally {
      await transport.close();
    }
  });

  it('still runs checks when the server answers even one probe', async () => {
    // A server that errors on everything is reachable and IS a conformance
    // subject, unlike one that never responds.
    const transport = new StdioTransport(
      "node --eval \"process.stdin.on('data',d=>{for(const l of String(d).split('\\n')){if(!l.trim())continue;const r=JSON.parse(l);if(r.id!=null)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:r.id,error:{code:-32601,message:'nope'}})+'\\n')}})\"",
    );
    try {
      const report = await runChecks(transport, { timeoutMs: 3000 });
      expect(report.unreachable).toBeUndefined();
      expect(report.outcomes.length).toBeGreaterThan(0);
    } finally {
      await transport.close();
    }
  });
});
