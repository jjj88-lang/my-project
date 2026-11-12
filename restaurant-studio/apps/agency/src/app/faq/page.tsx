import type { Metadata } from "next";
import Link from "next/link";

import { FaqList } from "@/components/sections/FaqList";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageIntro } from "@/components/ui/PageIntro";
import { INQUIRY_REPLY_TIME } from "@/content/facts";
import { FAQ, FAQ_GROUPS } from "@/content/faq";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import { contactEmail, contactPhone, telHref } from "@/lib/studio";
import { smart } from "@/lib/text";

export const metadata: Metadata = pageMetadata({
  title: "Questions and answers",
  description:
    "Straight answers about cost, timeline, ownership of the site and domain, hosting, menu updates, online ordering, refunds and what happens if you want to leave.",
  path: "/faq",
});

const groupId = (group: string) => `group-${group.toLowerCase().replace(/[^a-z]+/g, "-")}`;

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(FAQ.map((item) => ({ q: smart(item.q), a: item.a.map(smart).join(" ") })))} />

      <PageIntro
        eyebrow="Questions"
        title={
          <>
            Straight answers, <em>before you ask.</em>
          </>
        }
      >
        <p>
          The questions owners ask most, answered plainly. If yours is not here, ask me directly. I would rather you
          know exactly what you are getting.
        </p>
      </PageIntro>

      <section className="pb-20 md:pb-28">
        <div className="shell grid gap-y-10 lg:grid-cols-12 lg:gap-x-8">
          <nav aria-label="Question topics" className="lg:col-span-3">
            <ul className="flex flex-wrap gap-2 border-t border-rule-strong pt-5 lg:sticky lg:top-28 lg:flex-col lg:gap-0">
              {FAQ_GROUPS.map((group) => (
                <li key={group}>
                  <a
                    href={`#${groupId(group)}`}
                    className="inline-flex min-h-11 items-center gap-3 border border-rule-strong px-4 font-mono text-[0.76rem] uppercase tracking-[0.12em] text-ink hover:border-accent hover:text-accent lg:border-0 lg:px-0"
                  >
                    {group}
                    <span className="nums text-ink-soft">
                      {String(FAQ.filter((item) => item.group === group).length).padStart(2, "0")}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid gap-16 lg:col-span-8 lg:col-start-5">
            {FAQ_GROUPS.map((group) => (
              <section key={group} id={groupId(group)} aria-labelledby={`${groupId(group)}-title`} className="scroll-mt-24">
                <h2 id={`${groupId(group)}-title`} className="eyebrow mb-5">
                  {group}
                </h2>
                <FaqList items={FAQ.filter((item) => item.group === group)} />
              </section>
            ))}

            <div className="border-l-2 border-accent pl-5">
              <h2 className="display display-sm">Still wondering about something?</h2>
              <p className="mt-3 max-w-[52ch] text-ink-soft">
                Ask it on a free call or in a message. I reply personally, usually {INQUIRY_REPLY_TIME}.
                {contactEmail && (
                  <>
                    {" "}
                    You can also write to{" "}
                    <a href={`mailto:${contactEmail}`} className="link [overflow-wrap:anywhere]">
                      {contactEmail}
                    </a>
                    {contactPhone ? " or call " : "."}
                  </>
                )}
                {contactPhone && (
                  <>
                    {!contactEmail && " You can also call "}
                    <a href={telHref(contactPhone)} className="link nums">
                      {contactPhone}
                    </a>
                    .
                  </>
                )}
              </p>
              <p className="mt-5">
                <Link href="/contact" className="link-arrow">
                  Ask your question
                  <Icon name="arrow" className="size-4" />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
