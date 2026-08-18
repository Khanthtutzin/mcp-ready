const REPO = 'https://github.com/Khanthtutzin/mcp-stateless';

export default function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-[min(100%-2.5rem,1080px)] items-center gap-6">
        <a href="#top" className="font-mono font-bold tracking-tight text-paper">
          <span className="text-ready">&gt; </span>mcp-stateless
        </a>
        <nav className="ml-auto flex gap-6 font-mono text-[0.8rem]">
          <a href="#what" className="hidden text-muted hover:text-paper sm:inline">
            What breaks
          </a>
          <a href="#rules" className="hidden text-muted hover:text-paper sm:inline">
            Rules
          </a>
          <a
            href={`${REPO}/blob/main/docs/migration-walkthrough.md`}
            className="text-muted hover:text-paper"
          >
            Walkthrough
          </a>
          <a href={REPO} className="text-muted hover:text-paper">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
