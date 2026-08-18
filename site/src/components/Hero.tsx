import { useState } from 'react';
import CommandBar from './CommandBar';
import ReportOutput from './ReportOutput';
import { TABS } from '../data/reports';

/**
 * The page's thesis, and its one memorable element: the same server reported
 * twice. Everything the tool exists to say — you are broken, almost none of it
 * is your fault, one upgrade clears it — is legible from the two tabs without
 * reading a word of marketing copy.
 */
export default function Hero() {
  const [active, setActive] = useState(0);
  const tab = TABS[active]!;

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    setActive(next);
    document.getElementById(`tab-${TABS[next]!.id}`)?.focus();
  }

  return (
    <section
      id="top"
      className="mx-auto w-[min(100%-2.5rem,1080px)] pt-14 pb-16 sm:pb-24"
    >
      <p className="font-mono text-[0.72rem] tracking-[0.14em] text-muted uppercase">
        MCP conformance · revision 2026-07-28
      </p>

      <h1 className="mt-4 max-w-[17ch] text-[2.3rem] leading-[1.04] font-extrabold tracking-[-0.035em] sm:text-[3.4rem] lg:text-[4.1rem]">
        Your MCP server stopped being compliant on{' '}
        {/* The date set in the utility face against the display sans: the
            collision is the point, since the revision is the whole reason
            this tool exists. */}
        <span className="font-mono font-bold tracking-[-0.04em] whitespace-nowrap text-break">
          2026-07-28
        </span>
        .
      </h1>

      <p className="mt-6 max-w-[56ch] text-[1.05rem] text-muted sm:text-[1.2rem]">
        The protocol went stateless. The handshake, sessions,{' '}
        <code className="font-mono text-paper">ping</code> and per-resource subscriptions
        were all removed. One command tells you exactly what your server fails — and
        usually, that none of it is your code.
      </p>

      <CommandBar
        command='npx mcp-stateless --stdio "node dist/server.js"'
        className="mt-8 max-w-[620px]"
      />

      <div className="mt-10 overflow-hidden rounded-xl border border-line bg-panel-2">
        <div
          role="tablist"
          aria-label="Example report"
          className="flex flex-wrap items-center gap-2 border-b border-line bg-panel p-2"
        >
          <span className="mr-auto pl-2 font-mono text-[0.72rem] tracking-[0.14em] text-muted uppercase">
            notes server · stdio
          </span>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
              tabIndex={i === active ? 0 : -1}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-[0.76rem] transition-colors ${
                i === active
                  ? 'border-line bg-panel-2 text-paper'
                  : 'border-transparent text-muted hover:text-paper'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id={`panel-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`}>
          <ReportOutput command={tab.command} body={tab.body} />
        </div>
      </div>
    </section>
  );
}
