import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALL_RULES, ruleById, rulesFor } from '../src/rules/index.js';

const docsDir = fileURLToPath(new URL('../docs/rules/', import.meta.url));

describe('rule registry', () => {
  it('has unique ids', () => {
    const ids = ALL_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('numbers ids contiguously from MCP001', () => {
    // A gap means a rule was deleted rather than retired. Ids are permanent:
    // someone's CI has them in a --skip list.
    const ids = ALL_RULES.map((r) => r.id).sort();
    ids.forEach((id, i) => {
      expect(id).toBe(`MCP${String(i + 1).padStart(3, '0')}`);
    });
  });

  it('gives every rule a spec link and a changelog reference', () => {
    for (const rule of ALL_RULES) {
      expect(rule.specRef, rule.id).toMatch(/^https:\/\/modelcontextprotocol\.io\//);
      expect(rule.changelogRef, rule.id).not.toBe('');
      expect(rule.title, rule.id).not.toBe('');
      expect(rule.appliesTo.length, rule.id).toBeGreaterThan(0);
    }
  });

  it('documents every rule', () => {
    for (const rule of ALL_RULES) {
      const path = `${docsDir}${rule.id}.md`;
      expect(
        existsSync(path),
        `${rule.id} has no docs page — run npm run docs:rules`,
      ).toBe(true);
      const body = readFileSync(path, 'utf8');
      expect(body, rule.id).toContain(rule.id);
      expect(body, rule.id).toContain(rule.specRef);
    }
  });

  it('looks rules up case-insensitively', () => {
    expect(ruleById('mcp001')?.id).toBe('MCP001');
    expect(ruleById('MCP001')?.id).toBe('MCP001');
    expect(ruleById('MCP999')).toBeUndefined();
  });

  it('partitions rules by transport', () => {
    const stdio = rulesFor('stdio').map((r) => r.id);
    const http = rulesFor('http').map((r) => r.id);

    // Session headers, the GET endpoint, routing headers and HTTP+SSE have no
    // stdio equivalent.
    expect(stdio).not.toContain('MCP003');
    expect(http).toContain('MCP003');
    expect(stdio.length + http.length).toBeGreaterThan(ALL_RULES.length);
  });
});
