import Nav from './components/Nav';
import Hero from './components/Hero';
import Section from './components/Section';
import CommandBar from './components/CommandBar';

const REPO = 'https://github.com/Khanthtutzin/mcp-stateless';

const REMOVED = [
  'initialize handshake',
  'Mcp-Session-Id and sessions',
  'ping, logging/setLevel',
  'resources/subscribe',
  'Server-initiated requests',
  'SSE stream resumability',
];

const ADDED = [
  'server/discover (mandatory)',
  'Per-request _meta envelope',
  'resultType on every result',
  'ttlMs / cacheScope',
  'Multi Round-Trip Requests',
  'Renumbered error codes',
];

const RULES: { id: string; tone: 'break' | 'advisory'; what: string; who: string }[] = [
  {
    id: 'MCP001',
    tone: 'break',
    what: 'server/discover not implemented',
    who: 'SDK upgrade',
  },
  {
    id: 'MCP002',
    tone: 'break',
    what: 'Still requires the initialize handshake',
    who: 'SDK upgrade',
  },
  {
    id: 'MCP004',
    tone: 'break',
    what: 'Results missing required resultType',
    who: 'SDK upgrade',
  },
  {
    id: 'MCP011',
    tone: 'break',
    what: 'Resource-not-found still returns -32002',
    who: 'SDK upgrade',
  },
  {
    id: 'MCP013',
    tone: 'break',
    what: 'Rejects the _meta protocol envelope',
    who: 'your code',
  },
  {
    id: 'MCP017',
    tone: 'advisory',
    what: 'tools/list ordering not deterministic',
    who: 'your code',
  },
];

const STATS = [
  { n: '18', label: 'rules, each citing a changelog entry' },
  { n: '64', label: 'tests, across three platforms' },
  { n: '0', label: 'runtime dependencies', accent: true },
  { n: 'MIT', label: 'signed provenance on every release', accent: true },
];

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />

        <Section
          id="what"
          eyebrow="What changed"
          title="The largest breaking change in the protocol's history."
          intro="Revision 2026-07-28 made MCP stateless. Every server has to migrate, on a twelve-month deprecation clock."
        >
          <div className="mt-9 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {[
              { head: 'Removed', items: REMOVED, tone: 'text-break' },
              { head: 'Added', items: ADDED, tone: 'text-ready' },
            ].map((col) => (
              <div key={col.head} className="bg-panel-2 p-6">
                <p
                  className={`font-mono text-[0.72rem] tracking-[0.14em] uppercase ${col.tone}`}
                >
                  {col.head}
                </p>
                <ul className="mt-4 space-y-2 font-mono text-[0.82rem] text-paper">
                  {col.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-9 rounded-r-xl border border-l-[3px] border-line border-l-ready bg-panel-2 p-6 sm:p-8">
            <pre className="overflow-x-auto font-mono text-[0.7rem] leading-[1.7] sm:text-[0.8rem]">
              <code>
                <span className="text-break">NOT READY</span>
                <span className="text-muted">
                  {' '}
                  — 7 breaking issues across 14 checks.
                  {'\n  7 of those are protocol plumbing owned by your MCP SDK.'}
                  {'\n  None require a change to your own code.'}
                </span>
              </code>
            </pre>
            <p className="mt-5 max-w-[62ch] text-muted">
              Most of what breaks is plumbing your SDK owns. You never wrote a{' '}
              <code className="font-mono text-paper">ping</code> handler — the SDK
              registered one. So every rule declares who fixes it, and the verdict splits
              on that line. Seven findings can mean zero work for you and one dependency
              bump. Knowing which is worth more than the list above it.
            </p>
          </div>
        </Section>

        <Section
          id="rules"
          eyebrow="18 rules · 14 breaking · 4 advisory"
          title="Every finding cites the changelog entry it enforces."
          intro="No heuristics and no opinions. Each rule maps to a named change in the specification, and reports the JSON-RPC exchange behind it."
        >
          <div className="mt-9 overflow-hidden rounded-xl border border-line">
            {RULES.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[6rem_1fr] items-baseline gap-x-4 gap-y-1 border-b border-line bg-panel-2 px-5 py-3.5 last:border-b-0 sm:grid-cols-[6.5rem_1fr_auto]"
              >
                <code
                  className={`font-mono text-[0.8rem] ${
                    r.tone === 'break' ? 'text-break' : 'text-advisory'
                  }`}
                >
                  {r.id}
                </code>
                <span className="text-[0.95rem]">{r.what}</span>
                <span className="col-start-2 font-mono text-[0.72rem] whitespace-nowrap text-muted sm:col-start-3">
                  {r.who}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-5">
            <a
              href={`${REPO}/blob/main/docs/rules/README.md`}
              className="text-link underline-offset-4 hover:text-paper"
            >
              All 18 rules, with a page each →
            </a>
          </p>
        </Section>

        <Section
          eyebrow="Proven against real servers"
          title="Tested on software nobody here wrote."
          intro="Fixtures only prove a tool against servers built to trip it. This is also run against the official MCP servers, and against the TypeScript SDK v2 built from source — where it found five defects in itself, all fixed and covered by regression tests."
        >
          <div className="mt-9 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-panel-2 p-6">
                <b
                  className={`block font-mono text-[1.75rem] leading-none font-bold tracking-tight ${
                    s.accent ? 'text-ready' : 'text-paper'
                  }`}
                >
                  {s.n}
                </b>
                <span className="mt-2 block text-[0.88rem] text-muted">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-8">
            <a
              href={`${REPO}/blob/main/docs/migration-walkthrough.md`}
              className="text-link underline-offset-4 hover:text-paper"
            >
              Read the walkthrough — one server, seven findings to READY →
            </a>
          </p>
        </Section>

        <Section eyebrow="Run it" title="Nothing to install.">
          <CommandBar
            command="npx mcp-stateless --http https://api.example.com/mcp"
            className="mt-9 max-w-[620px]"
          />
          <p className="mt-6 max-w-[60ch] text-muted">
            Exit <code className="font-mono text-paper">0</code> ready ·{' '}
            <code className="font-mono text-paper">1</code> findings ·{' '}
            <code className="font-mono text-paper">2</code> unreachable. Add{' '}
            <code className="font-mono text-paper">--format sarif</code> to surface
            findings in GitHub code scanning, or use the Action:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-panel-2 px-4 py-4 font-mono text-[0.8rem] leading-relaxed">
            <code>
              {
                '- uses: Khanthtutzin/mcp-stateless@v1\n  with:\n    stdio: node dist/server.js'
              }
            </code>
          </pre>
        </Section>
      </main>

      <footer className="border-t border-line py-10 text-[0.88rem] text-muted">
        <div className="mx-auto flex w-[min(100%-2.5rem,1080px)] flex-wrap items-baseline gap-x-8 gap-y-3">
          <span>MIT · built for the 2026-07-28 migration window</span>
          <nav className="ml-auto flex flex-wrap gap-6">
            <a
              href="https://www.npmjs.com/package/mcp-stateless"
              className="hover:text-paper"
            >
              npm
            </a>
            <a href={REPO} className="hover:text-paper">
              GitHub
            </a>
            <a href={`${REPO}/blob/main/CONTRIBUTING.md`} className="hover:text-paper">
              Contributing
            </a>
            <a
              href="https://modelcontextprotocol.io/specification/2026-07-28/changelog"
              className="hover:text-paper"
            >
              Specification
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
