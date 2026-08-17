#!/usr/bin/env node
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { renderJson } from '../report/json.js';
import { renderMarkdown } from '../report/markdown.js';
import { renderSarif } from '../report/sarif.js';
import { renderTerminal } from '../report/terminal.js';
import { TARGET_REVISION } from '../protocol.js';
import { ALL_RULES, ruleById } from '../rules/index.js';
import { runChecks } from '../run.js';
import { HttpTransport } from '../transport/http.js';
import { StdioTransport } from '../transport/stdio.js';
import type { Transport } from '../transport/types.js';

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_USAGE = 2;

function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(resolve(here, '../../package.json'), 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const HELP = `
mcp-ready — check whether an MCP server is ready for the ${TARGET_REVISION} stateless spec

USAGE
  mcp-ready --stdio "<command>"      probe a server over stdio
  mcp-ready --http <url>             probe a server over Streamable HTTP

OPTIONS
  --stdio <command>     Command that starts the server on stdio.
  --http <url>          Streamable HTTP endpoint.
  --header <k:v>        Extra HTTP header. Repeatable.
  --cwd <dir>           Working directory for the --stdio command.

  --format <fmt>        text (default), json, sarif, markdown.
  --output <file>       Write the report to a file instead of stdout.
  --verbose             Include the JSON-RPC traffic behind each finding.
  --no-color            Disable ANSI colour.

  --only <ids>          Comma-separated rule ids to run exclusively.
  --skip <ids>          Comma-separated rule ids to skip.
  --timeout <ms>        Per-request timeout. Default 10000.
  --fail-on <level>     error (default), warning, or never.

  --list-rules          Print the rule catalogue and exit.
  --version, --help

EXIT CODES
  0  ready              1  findings at or above --fail-on
  2  usage or connection error

EXAMPLES
  mcp-ready --stdio "node dist/server.js"
  mcp-ready --http https://api.example.com/mcp --header "Authorization: Bearer $TOKEN"
  mcp-ready --stdio "npx -y my-server" --format sarif --output mcp-ready.sarif
`;

function listRules(): string {
  const lines = [`mcp-ready rule catalogue — MCP ${TARGET_REVISION}`, ''];
  for (const rule of ALL_RULES) {
    const level = rule.severity === 'error' ? 'error  ' : 'warning';
    lines.push(`  ${rule.id}  ${level}  ${rule.title}`);
    lines.push(
      `            ${rule.appliesTo.join(', ').padEnd(12)} ${rule.changelogRef}`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function parseHeaders(values: string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const raw of values) {
    const idx = raw.indexOf(':');
    if (idx === -1)
      throw new Error(`Malformed --header "${raw}". Expected "Name: value".`);
    headers[raw.slice(0, idx).trim().toLowerCase()] = raw.slice(idx + 1).trim();
  }
  return headers;
}

function parseRuleIds(csv: string | undefined, flag: string): string[] | undefined {
  if (!csv) return undefined;
  const ids = csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = ids.filter((id) => !ruleById(id));
  if (unknown.length) {
    throw new Error(
      `Unknown rule id(s) in ${flag}: ${unknown.join(', ')}. Run --list-rules to see the catalogue.`,
    );
  }
  return ids;
}

export async function main(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: false,
      options: {
        stdio: { type: 'string' },
        http: { type: 'string' },
        header: { type: 'string', multiple: true, default: [] },
        cwd: { type: 'string' },
        format: { type: 'string', default: 'text' },
        output: { type: 'string' },
        verbose: { type: 'boolean', default: false },
        color: { type: 'boolean', default: true },
        only: { type: 'string' },
        skip: { type: 'string' },
        timeout: { type: 'string' },
        'fail-on': { type: 'string', default: 'error' },
        'list-rules': { type: 'boolean', default: false },
        version: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
    });
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n${HELP}`);
    return EXIT_USAGE;
  }

  const opts = parsed.values;

  if (opts.help) {
    process.stdout.write(HELP);
    return EXIT_OK;
  }
  if (opts.version) {
    process.stdout.write(`${packageVersion()}\n`);
    return EXIT_OK;
  }
  if (opts['list-rules']) {
    process.stdout.write(listRules());
    return EXIT_OK;
  }

  if (!opts.stdio && !opts.http) {
    process.stderr.write(`Specify a target with --stdio or --http.\n${HELP}`);
    return EXIT_USAGE;
  }
  if (opts.stdio && opts.http) {
    process.stderr.write('Specify only one of --stdio or --http.\n');
    return EXIT_USAGE;
  }

  const format = String(opts.format);
  if (!['text', 'json', 'sarif', 'markdown'].includes(format)) {
    process.stderr.write(`Unknown --format "${format}".\n`);
    return EXIT_USAGE;
  }

  const failOn = String(opts['fail-on']);
  if (!['error', 'warning', 'never'].includes(failOn)) {
    process.stderr.write(`Unknown --fail-on "${failOn}".\n`);
    return EXIT_USAGE;
  }

  let only: string[] | undefined;
  let skip: string[] | undefined;
  let headers: Record<string, string>;
  try {
    only = parseRuleIds(opts.only, '--only');
    skip = parseRuleIds(opts.skip, '--skip');
    headers = parseHeaders(opts.header as string[]);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return EXIT_USAGE;
  }

  let timeoutMs: number | undefined;
  if (opts.timeout !== undefined) {
    timeoutMs = Number(opts.timeout);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      process.stderr.write(`--timeout must be a positive number of milliseconds.\n`);
      return EXIT_USAGE;
    }
  }

  const transport: Transport = opts.stdio
    ? new StdioTransport(opts.stdio, opts.cwd)
    : new HttpTransport(opts.http!, headers);

  try {
    const report = await runChecks(transport, { only, skip, timeoutMs });
    const version = packageVersion();

    let output: string;
    switch (format) {
      case 'json':
        output = renderJson(report, version);
        break;
      case 'sarif':
        output = renderSarif(report, version);
        break;
      case 'markdown':
        output = renderMarkdown(report);
        break;
      default:
        output = renderTerminal(report, {
          color: opts.color !== false && process.stdout.isTTY === true,
          verbose: opts.verbose,
        });
    }

    if (opts.output) {
      writeFileSync(opts.output, output.endsWith('\n') ? output : `${output}\n`, 'utf8');
      process.stdout.write(`Report written to ${opts.output}\n`);
    } else {
      process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
    }

    // A server we could not reach is an operational failure, not a conformance
    // verdict, so it gets the usage exit code rather than the findings one.
    if (report.unreachable) return EXIT_USAGE;
    if (failOn === 'never') return EXIT_OK;
    if (failOn === 'warning') {
      return report.errorCount + report.warningCount > 0 ? EXIT_FINDINGS : EXIT_OK;
    }
    return report.errorCount > 0 ? EXIT_FINDINGS : EXIT_OK;
  } catch (err) {
    process.stderr.write(`mcp-ready failed: ${(err as Error).message}\n`);
    return EXIT_USAGE;
  } finally {
    await transport.close();
  }
}

/**
 * True when this file was invoked directly rather than imported. Compared via
 * realpath so that npm's bin symlinks and Windows path casing both resolve.
 */
function isDirectInvocation(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectInvocation()) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      process.stderr.write(`mcp-ready crashed: ${(err as Error).stack ?? err}\n`);
      process.exitCode = EXIT_USAGE;
    },
  );
}
