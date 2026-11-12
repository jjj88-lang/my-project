import type { ReactNode } from "react";

import { PageIntro } from "@/components/ui/PageIntro";
import { studio } from "@/lib/studio";

/**
 * Layout for /privacy and /terms. While studio.json says the text has not been reviewed by a
 * lawyer, a notice at the top says so plainly.
 */
export function LegalDoc({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  /** Written out, for example "November 12, 2026". */
  updated: string;
  intro: ReactNode;
  sections: Array<{ id: string; title: string; body: ReactNode }>;
}) {
  return (
    <>
      <PageIntro eyebrow={eyebrow} title={title}>
        {intro}
      </PageIntro>

      <section className="pb-20 md:pb-28">
        <div className="shell grid gap-y-10 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <p className="mono-note text-ink-soft">Last updated {updated}</p>
              <nav aria-label="On this page" className="mt-6 hidden lg:block">
                <ol className="grid gap-1 border-l border-rule">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[0.92rem] text-ink-soft hover:border-accent hover:text-ink"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-8 lg:col-start-5">
            {!studio.legalReviewed ? (
              <div role="note" className="mb-12 border border-accent bg-card px-5 py-5 sm:px-6">
                <p className="eyebrow">Draft</p>
                <p className="mt-2">
                  This is a first draft written in plain language. It has not yet been reviewed by a lawyer and may
                  change before it is final. If anything here matters to a decision you are making, ask me first.
                </p>
              </div>
            ) : null}

            <div className="grid gap-12">
              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-24" aria-labelledby={`${section.id}-h`}>
                  <h2 id={`${section.id}-h`} className="display display-sm flex items-baseline gap-4">
                    <span className="nums font-mono text-[0.8rem] font-medium text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </h2>
                  <div className="mt-4 grid gap-4 text-ink-soft [&_strong]:text-ink [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5">
                    {section.body}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
