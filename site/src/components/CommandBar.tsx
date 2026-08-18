import { useState } from 'react';

/** A copyable shell command. The prompt is decoration; only the command copies. */
export default function CommandBar({
  command,
  className = '',
}: {
  command: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context, or denied). The text is
      // selectable, so say that rather than failing silently.
      setCopied(false);
    }
  }

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl border border-line bg-panel-2 ${className}`}
    >
      <code className="flex-1 overflow-x-auto whitespace-nowrap px-4 py-3.5 font-mono text-[0.8rem] sm:text-[0.9rem]">
        <span className="text-ready">npx </span>
        {command.replace(/^npx /, '')}
      </code>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 cursor-pointer border-l border-line px-4 font-mono text-[0.7rem] tracking-[0.1em] uppercase transition-colors hover:bg-panel hover:text-paper ${
          copied ? 'text-ready' : 'text-muted'
        }`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
