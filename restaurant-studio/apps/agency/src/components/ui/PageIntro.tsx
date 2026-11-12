import type { CSSProperties, ReactNode } from "react";

/** The opening of an inner page: a small label, a large headline and a short introduction. */
export function PageIntro({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  /** A short note set in the right-hand column on wide screens. */
  aside?: ReactNode;
}) {
  return (
    <section className="shell pb-12 pt-12 md:pb-16 md:pt-20 lg:pt-24">
      <div className="grid gap-y-7 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-10">
          <p className="eyebrow enter">{eyebrow}</p>
          <h1 className="display display-lg enter mt-5" style={{ "--i": 1 } as CSSProperties}>
            {title}
          </h1>
        </div>
        {children && (
          <div
            className="lead enter grid gap-4 text-ink-soft lg:col-span-7"
            style={{ "--i": 2 } as CSSProperties}
          >
            {children}
          </div>
        )}
        {aside && (
          <aside
            className="enter border-l-2 border-accent pl-5 lg:col-span-4 lg:col-start-9 lg:self-end"
            style={{ "--i": 3 } as CSSProperties}
          >
            {aside}
          </aside>
        )}
      </div>
    </section>
  );
}
