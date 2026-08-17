import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  planSpawn,
  quoteForCmd,
  resolveWindowsExecutable,
} from '../src/transport/spawn-plan.js';

/**
 * Regression coverage for the Windows launch path.
 *
 * This was found by running the checker against the real
 * `@modelcontextprotocol/*` servers, every one of which is started with `npx`.
 * On Windows that failed with ENOENT, which made the tool useless for most of
 * the ecosystem on that platform — and the README documented the very command
 * that did not work.
 */
describe('planSpawn on POSIX', () => {
  it('passes argv through untouched', () => {
    const plan = planSpawn(['node', 'server.js', '--flag'], 'linux');
    expect(plan).toEqual({
      file: 'node',
      args: ['server.js', '--flag'],
      windowsVerbatimArguments: false,
    });
  });

  it('does not consult PATH', () => {
    // No filesystem lookup means no surprise when the binary is provided by a
    // wrapper, a shim, or a container entrypoint.
    const plan = planSpawn(['definitely-not-installed'], 'darwin');
    expect(plan.file).toBe('definitely-not-installed');
  });

  it('rejects an empty command', () => {
    expect(() => planSpawn([], 'linux')).toThrow(/Empty command/);
  });
});

describe('resolveWindowsExecutable', () => {
  it('prefers a PATHEXT match over an extensionless file of the same name', () => {
    // npm installs `npx` (a POSIX sh script), `npx.cmd` and `npx.ps1` side by
    // side. Windows runs the .cmd; a naive bare-name lookup finds the sh
    // script and spawn then fails. This ordering is the whole bug.
    const dirPath = fileURLToPath(new URL('./fixtures/fakebin/', import.meta.url));

    // Lowercase extensions so the fixture resolves on case-sensitive
    // filesystems too — this test is about ordering, not about Windows.
    const resolved = resolveWindowsExecutable('faketool', {
      PATH: dirPath,
      PATHEXT: '.com;.exe;.bat;.cmd',
    });

    expect(resolved).toBeTruthy();
    expect(resolved!.toLowerCase().endsWith('.cmd')).toBe(true);
  });

  it('returns null when nothing matches', () => {
    const resolved = resolveWindowsExecutable('no-such-binary-9f3a1c', {
      PATH: '',
      PATHEXT: '.EXE;.CMD',
    });
    expect(resolved).toBeNull();
  });
});

describe('planSpawn on Windows', () => {
  const env = {
    PATH: '',
    PATHEXT: '.COM;.EXE;.BAT;.CMD',
    ComSpec: 'C:\\Windows\\cmd.exe',
  };

  it('falls back to the typed name when resolution fails', () => {
    // Better to let spawn report ENOENT for what the user actually typed than
    // to invent a path they never mentioned.
    const plan = planSpawn(['ghost-binary'], 'win32', env);
    expect(plan.file).toBe('ghost-binary');
    expect(plan.windowsVerbatimArguments).toBe(false);
  });
});

describe('quoteForCmd', () => {
  it('wraps plain arguments', () => {
    expect(quoteForCmd('server.js')).toBe('"server.js"');
  });

  it('keeps Windows paths intact', () => {
    // Backslashes are only special before a quote; doubling them everywhere
    // would corrupt every path on the platform.
    expect(quoteForCmd('C:\\Program Files\\app\\server.js')).toBe(
      '"C:\\Program Files\\app\\server.js"',
    );
  });

  it('escapes embedded quotes', () => {
    expect(quoteForCmd('say "hi"')).toBe('"say \\"hi\\""');
  });

  it('doubles trailing backslashes so they cannot escape the closing quote', () => {
    expect(quoteForCmd('C:\\dir\\')).toBe('"C:\\dir\\\\"');
  });

  it('contains cmd separators inside the quotes', () => {
    // A metacharacter in a server command must stay an argument, never become
    // a second command.
    for (const meta of ['&', '|', '>', '<', '^']) {
      expect(quoteForCmd(`a${meta}b`)).toBe(`"a${meta}b"`);
    }
  });
});
