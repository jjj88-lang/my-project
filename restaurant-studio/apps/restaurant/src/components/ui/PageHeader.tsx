import type { ReactNode } from "react";

/** The title band at the top of every inner page. */
export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden border-b border-line">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(55%_120%_at_92%_0%,color-mix(in_srgb,var(--c-accent)_17%,transparent),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="pattern-waves absolute inset-0 -z-10 opacity-[0.045]" aria-hidden="true" />
      <div className="container-site py-14 md:py-20">
        <p className="eyebrow enter">{eyebrow}</p>
        <h1 className="display enter mt-4 max-w-[18ch] text-[clamp(2.6rem,7vw,5.5rem)] [--i:1]">{title}</h1>
        {intro && <p className="enter mt-6 max-w-2xl text-[1.06rem] leading-relaxed text-muted [--i:2]">{intro}</p>}
        {children && <div className="enter mt-8 [--i:3]">{children}</div>}
      </div>
    </header>
  );
}
