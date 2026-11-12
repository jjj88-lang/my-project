import type { Metadata } from "next";
import Link from "next/link";

import { Tickets } from "@/components/process/Tickets";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { Icon } from "@/components/ui/Icon";
import { PageIntro } from "@/components/ui/PageIntro";
import { FIRST_CALL_MINUTES } from "@/content/facts";
import { MATERIALS, PROCESS_STEPS, processFacts as f } from "@/content/process";
import { capitalize, inWords, maintenance, premium, starter } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { smart } from "@/lib/text";

export const metadata: Metadata = pageMetadata({
  title: "How it works",
  description: `From a free ${FIRST_CALL_MINUTES}-minute call to launch: scope, timeline, what I need from you, revision rounds, approval, the ${f.fixWindowDays}-day fix window and what happens afterwards.`,
  path: "/process",
});

const TIMELINE = [
  {
    name: starter.name,
    draft: `${f.starterDraftDays} business days`,
    launch: capitalize(starter.typicalLaunch.replace(/\s+after\b.*$/i, "")),
  },
  {
    name: premium.name,
    draft: `${f.premiumDraftDays} business days`,
    launch: capitalize(premium.typicalLaunch.replace(/\s+after\b.*$/i, "")),
  },
];

const AFTER = [
  {
    title: "With the maintenance plan",
    price: `${f.maintenancePrice} a month`,
    points: [
      "The site stays on the studio's hosting account, with the security certificate.",
      `Up to ${f.editMinutes} minutes of small changes a month: send me the new price, dish or hours and I make the change.`,
      "I keep the software up to date and check that the site and its forms are working.",
      `A reply within ${inWords(maintenance.responseBusinessDays)} business days, or ${inWords(maintenance.outageResponseBusinessDays)} business day if the site is down.`,
      `Month to month. ${f.cancelNoticeDays} days' notice to stop, and you get the site files.`,
    ],
  },
  {
    title: "Without it",
    price: "No monthly fee to me",
    points: [
      "I hand over the site files and help you move them to hosting in your own account.",
      "You pay the hosting company directly, and the domain stays with your registrar as before.",
      `Changes after the ${f.fixWindowDays}-day fix window are paid work at ${f.hourly} an hour, when you need them.`,
    ],
  },
];

export default function ProcessPage() {
  return (
    <>
      <PageIntro
        eyebrow="How it works"
        title={
          <>
            Five tickets, <em>in order.</em>
          </>
        }
        aside={
          <p className="font-mono text-[0.82rem] leading-relaxed text-ink-soft">
            First draft in {f.starterDraftDays} to {f.premiumDraftDays} business days after your materials arrive.{" "}
            {capitalize(f.rounds)} rounds of changes. {f.fixWindowDays} days of fixes after launch.
          </p>
        }
      >
        <p>
          Every project runs the same way, so you always know what happens next and what I need from you. Here is the
          whole thing, start to finish.
        </p>
      </PageIntro>

      <section className="on-band overflow-x-clip bg-band text-on-band">
        <div className="shell py-16 md:py-24">
          <h2 className="sr-only">The five steps</h2>
          <Tickets steps={PROCESS_STEPS} />
        </div>
      </section>

      {/* Scope and timeline ---------------------------------------------------------------------- */}
      <section>
        <div className="shell grid gap-y-14 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          <div className="reveal lg:col-span-5">
            <p className="eyebrow">01 · Scope</p>
            <h2 className="display display-md mt-5">We agree on the job before it starts.</h2>
            <div className="mt-6 grid max-w-[46ch] gap-4 text-ink-soft">
              <p>
                After the call, you get a short written agreement: the package, any add-on, the pages, the price and
                the dates. Work starts when it is signed and the {f.depositPercent}% deposit is paid.
              </p>
              <p>
                If you want something the package does not cover, I say so before I do it. Extra work is {f.hourly} an
                hour, with a minimum of {f.hourlyMinimumMinutes} minutes, and only with your yes.
              </p>
            </div>
          </div>

          <div className="reveal lg:col-span-6 lg:col-start-7">
            <p className="eyebrow">02 · Timeline</p>
            <h2 className="display display-md mt-5">The clock starts when your materials arrive.</h2>
            <table className="mt-7 w-full border-collapse text-left">
              <caption className="sr-only">Typical timeline for each package</caption>
              <thead>
                <tr className="border-b border-rule-strong font-mono text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
                  <th scope="col" className="py-3 pr-3">
                    Package
                  </th>
                  <th scope="col" className="px-2 py-3">
                    First draft
                  </th>
                  <th scope="col" className="py-3 pl-2">
                    Launch
                  </th>
                </tr>
              </thead>
              <tbody>
                {TIMELINE.map((row) => (
                  <tr key={row.name} className="border-b border-rule align-top">
                    <th scope="row" className="py-4 pr-3 font-semibold">
                      {row.name}
                    </th>
                    <td className="nums px-2 py-4 text-[0.95rem]">{row.draft}</td>
                    <td className="py-4 pl-2 text-[0.95rem] text-ink-soft">{row.launch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-5 text-ink-soft">
              The biggest variable is how quickly changes go back and forth. A missing menu or a slow reply moves the
              dates, and I will tell you when that happens instead of letting it slide.
            </p>
          </div>
        </div>
      </section>

      {/* Materials checklist ------------------------------------------------------------------------ */}
      <section id="materials" className="scroll-mt-20 bg-paper-deep">
        <div className="shell grid gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          <div className="reveal lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
            <p className="eyebrow">03 · Prep list</p>
            <h2 className="display display-lg mt-5">What I need from you.</h2>
            <p className="lead mt-6 max-w-[34ch] text-ink-soft">
              Think of it as sidework before service. Send what you have, in any form. Rough is fine; I tidy it up.
            </p>
          </div>
          <ul className="menu-card reveal grid gap-0 px-5 py-6 sm:px-9 sm:py-8 lg:col-span-7 lg:col-start-6">
            {MATERIALS.map((item) => (
              <li key={item.item} className="grid grid-cols-[1.75rem_1fr] gap-x-3 border-b border-rule py-4 last:border-b-0">
                <span aria-hidden="true" className="mt-1 size-[1.15rem] border-[1.5px] border-field bg-card" />
                <div>
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-semibold">{item.item}</span>
                    {item.when && (
                      <span className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-accent">
                        {item.when} only
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[0.96rem] text-ink-soft">{smart(item.note)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Revisions, approval, launch, fix window ----------------------------------------------------- */}
      <section>
        <div className="shell py-20 md:py-28">
          <div className="reveal max-w-[40rem]">
            <p className="eyebrow">04 · From draft to live</p>
            <h2 className="display display-lg mt-5">Revisions, approval and launch.</h2>
          </div>
          <dl className="mt-12 border-t border-rule-strong">
            {[
              {
                term: "A revision round",
                text: [
                  `You look at the draft on your own phone and send me one list of everything you want changed. I make all of it and send the link back. That is one round, and you get ${f.rounds}.`,
                  "Fixing my own mistakes, such as a typo I made or a link that goes nowhere, never uses up a round. A new page or a feature the package does not include is extra work, and I will say so first.",
                ],
              },
              {
                term: "Approval",
                text: [
                  `When the site is right, you tell me so in writing; an email is enough. The other ${f.balancePercent}% is due at that point, before launch.`,
                ],
              },
              {
                term: "Launch",
                text: [
                  "I connect your domain, switch on the security certificate, and test every button, link and form on a phone and a computer. Your page titles and restaurant details are set up the way search engines read them.",
                ],
              },
              {
                term: `The ${f.fixWindowDays}-day fix window`,
                text: [
                  `For ${f.fixWindowDays} days after launch, anything that does not work as agreed gets fixed at no charge. New changes of mind are not fixes, and on the maintenance plan the small ones fit in the monthly minutes.`,
                ],
              },
            ].map((row) => (
              <div key={row.term} className="reveal grid gap-x-8 gap-y-2 border-b border-rule py-7 lg:grid-cols-12">
                <dt className="display display-sm lg:col-span-4">{row.term}</dt>
                <dd className="grid max-w-[60ch] gap-3 text-ink-soft lg:col-span-7 lg:col-start-6">
                  {row.text.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Afterwards ------------------------------------------------------------------------------------ */}
      <section className="on-band bg-band text-on-band">
        <div className="shell py-20 md:py-28">
          <div className="reveal grid gap-y-6 lg:grid-cols-12 lg:gap-x-8">
            <div className="lg:col-span-7">
              <p className="eyebrow">05 · Afterwards</p>
              <h2 className="display display-lg mt-5">After launch, two ways to go.</h2>
            </div>
            <p className="max-w-[44ch] text-on-band-soft lg:col-span-4 lg:col-start-9 lg:self-end">
              Either way the domain, the content and the listings are yours. The only question is who looks after
              the site from here.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {AFTER.map((option) => (
              <article key={option.title} className="reveal bg-band-raised px-6 py-8 sm:px-8">
                <h3 className="display display-sm">{option.title}</h3>
                <p className="mt-2 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-accent-on-band">
                  {option.price}
                </p>
                <ul className="mt-6 grid gap-3">
                  {option.points.map((point) => (
                    <li key={point} className="flex gap-3 text-on-band-soft">
                      <Icon name="check" className="mt-[0.3rem] size-4 shrink-0 text-accent-on-band" strokeWidth={2} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-10">
            <Link href="/services#maintenance" className="link-arrow">
              What the maintenance plan includes
              <Icon name="arrow" className="size-4" />
            </Link>
          </p>
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
