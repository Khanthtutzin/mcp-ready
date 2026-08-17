import { accessSync, constants } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';

/**
 * Turning an argv array into something `child_process.spawn` will actually run.
 *
 * On POSIX this is a no-op. On Windows it is not, and the difference matters
 * more than it sounds: most MCP servers are published to npm and launched with
 * `npx`, but on Windows `npx` is a `.cmd` shim. Node cannot resolve a bare
 * `npx` without `shell: true` (it reports ENOENT), and since the fix for
 * CVE-2024-27980 it refuses to spawn a `.cmd` file directly at all.
 *
 * We do not want `shell: true` — it would reinterpret every metacharacter in a
 * user-supplied command string, which is exactly what `tokenizeCommand` exists
 * to avoid. So instead we resolve the executable ourselves and, when it turns
 * out to be a batch shim, invoke `cmd.exe` explicitly with a command line we
 * quote ourselves.
 */

export interface SpawnPlan {
  file: string;
  args: string[];
  windowsVerbatimArguments: boolean;
  /** How the command was resolved, for diagnostics. */
  note?: string;
}

const IS_WINDOWS = process.platform === 'win32';

/**
 * Extensions Windows treats as executable, from PATHEXT.
 *
 * Takes `env` rather than reading `process.env`: the caller already threads an
 * environment through for testability, and honouring it only halfway meant
 * this resolved differently under a case-sensitive filesystem than under
 * Windows — which CI caught and a local run never would.
 */
function pathExtensions(env: NodeJS.ProcessEnv): string[] {
  const raw = env['PATHEXT'] ?? '.COM;.EXE;.BAT;.CMD';
  return raw.split(';').filter(Boolean);
}

function isFile(path: string): boolean {
  try {
    accessSync(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the real file Windows would execute for `bin`, trying each PATHEXT
 * extension in turn. Returns null when nothing matches, in which case we let
 * `spawn` fail with its own error rather than inventing one.
 */
export function resolveWindowsExecutable(
  bin: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const exts = pathExtensions(env);
  const hasSeparator = bin.includes('/') || bin.includes('\\');
  const lower = bin.toLowerCase();
  const alreadyExecutable = exts.some((ext) => lower.endsWith(ext.toLowerCase()));

  // Ordering is load-bearing. npm ships three files called `npx` in the same
  // directory: `npx` (a POSIX sh script), `npx.cmd` and `npx.ps1`. Windows
  // only runs the second, but the first matches a bare-name lookup — so
  // PATHEXT candidates must be tried before the extensionless name, exactly as
  // cmd.exe does it. Getting this backwards resolves to the sh script and
  // spawn fails with ENOENT.
  const withExtensions: string[] = [];
  const bare: string[] = [];

  const consider = (base: string) => {
    if (alreadyExecutable) withExtensions.push(base);
    for (const ext of exts) withExtensions.push(base + ext);
    if (!alreadyExecutable) bare.push(base);
  };

  if (hasSeparator || isAbsolute(bin)) {
    consider(bin);
  } else {
    const dirs = (env['PATH'] ?? env['Path'] ?? '').split(delimiter).filter(Boolean);
    for (const dir of dirs) consider(join(dir, bin));
  }

  for (const candidate of [...withExtensions, ...bare]) {
    if (isFile(candidate)) return candidate;
  }
  return null;
}

/**
 * Quote one argument for a `cmd.exe /c` command line.
 *
 * Backslashes are only special immediately before a quote, so they are doubled
 * there and left alone elsewhere — which keeps Windows paths intact. The
 * result is always wrapped in quotes so that spaces and cmd's separators
 * (`&`, `|`, `<`, `>`, `^`) are taken literally.
 *
 * Known limitation: `%NAME%` is still expanded by cmd inside double quotes.
 * There is no way to suppress that from outside, so a server command
 * containing a literal percent-delimited word will be substituted. Callers
 * pass their own command, so this is a surprise rather than a vulnerability.
 */
export function quoteForCmd(arg: string): string {
  const escaped = arg
    // Double the backslashes that precede a quote, then escape the quote.
    .replace(/(\\*)"/g, '$1$1\\"')
    // Double any trailing backslashes so they do not escape our closing quote.
    .replace(/(\\*)$/, '$1$1');
  return `"${escaped}"`;
}

/** Batch shims must go through the command interpreter; nothing else does. */
function needsCmdInterpreter(resolved: string): boolean {
  const lower = resolved.toLowerCase();
  return lower.endsWith('.cmd') || lower.endsWith('.bat');
}

/**
 * Decide how to spawn `argv`.
 *
 * @param argv Tokenized command, `argv[0]` being the executable.
 * @param platform Overridable for testing.
 */
export function planSpawn(
  argv: string[],
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): SpawnPlan {
  const bin = argv[0];
  if (!bin) throw new Error('Empty command.');
  const rest = argv.slice(1);

  if (platform !== 'win32') {
    return { file: bin, args: rest, windowsVerbatimArguments: false };
  }

  const resolved = resolveWindowsExecutable(bin, env);
  if (!resolved) {
    // Let spawn produce the ENOENT, with the name the user actually typed.
    return { file: bin, args: rest, windowsVerbatimArguments: false };
  }

  if (!needsCmdInterpreter(resolved)) {
    return {
      file: resolved,
      args: rest,
      windowsVerbatimArguments: false,
      note: `resolved ${bin} -> ${resolved}`,
    };
  }

  // `cmd /d /s /c "<line>"`: /d skips AutoRun scripts, /s makes cmd strip
  // exactly the outer pair of quotes rather than guessing.
  const line = [resolved, ...rest].map(quoteForCmd).join(' ');
  return {
    file: env['ComSpec'] ?? 'cmd.exe',
    args: ['/d', '/s', '/c', `"${line}"`],
    windowsVerbatimArguments: true,
    note: `resolved ${bin} -> ${resolved} (batch shim, via cmd.exe)`,
  };
}

export const __testing = { IS_WINDOWS };
