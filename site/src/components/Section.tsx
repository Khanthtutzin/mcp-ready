import type { ReactNode } from 'react';

/** A titled band. `eyebrow` uses the mono utility face the CLI prints in. */
export default function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line py-16 sm:py-24">
      <div className="mx-auto w-[min(100%-2.5rem,1080px)]">
        <p className="font-mono text-[0.72rem] tracking-[0.14em] text-muted uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-[22ch] text-2xl leading-tight font-bold tracking-tight sm:text-[2.1rem]">
          {title}
        </h2>
        {intro ? <p className="mt-4 max-w-[60ch] text-muted">{intro}</p> : null}
        {children}
      </div>
    </section>
  );
}
