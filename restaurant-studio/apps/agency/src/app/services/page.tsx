import type { Metadata } from "next";
import Link from "next/link";

import { GuestCheck } from "@/components/pricing/GuestCheck";
import { IncludesList, MenuLine, MenuSectionTitle } from "@/components/pricing/PriceMenu";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { Icon } from "@/components/ui/Icon";
import { PageIntro } from "@/components/ui/PageIntro";
import { SELF_HOSTING_COST } from "@/content/facts";
import {
  capitalize,
  catering,
  depositOf,
  domainFeeAmount,
  exampleCheck,
  inWords,
  maintenance,
  money,
  premium,
  pricing,
  starter,
} from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { smart } from "@/lib/text";

export const metadata: Metadata = pageMetadata({
  title: "Services and prices",
  description: `Every package and price in one place: the ${starter.name} at ${money(starter.price)}, the ${premium.name} at ${money(premium.price)}, catering inquiry automation and optional monthly maintenance.`,
  path: "/services",
});

const balancePercent = 100 - pricing.depositPercent;
const rounds = inWords(starter.revisionRounds);

/*
 * The comparison is built from the two "includes" lists in pricing.json, so a change to the
 * price list shows up here too. The one-page line, the list of Premium pages and the revisions
 * line become rows of their own; the rest are features.
 */
const isPagesLine = (line: string) => /^one-page|^separate pages/i.test(line);
const isRevisionLine = (line: string) => /revision/i.test(line);
const isEverythingLine = (line: string) => /^everything in/i.test(line);

const premiumPages = premium.includes.find((line) => /^separate pages/i.test(line))?.replace(/^separate pages:\s*/i, "");
const sharedFeatures = starter.includes.filter((line) => !isPagesLine(line) && !isRevisionLine(line));
const premiumFeatures = premium.includes.filter(
  (line) => !isPagesLine(line) && !isRevisionLine(line) && !isEverythingLine(line) && !starter.includes.includes(line),
);

/** "about two weeks after we have your materials" -> "about two weeks". The row label says the rest. */
const launchSpan = (text: string) => text.replace(/\s+after\b.*$/i, "");

type Row = { label: string; starter: string | boolean; premium: string | boolean };

const COMPARISON: Row[] = [
  { label: "Price", starter: money(starter.price), premium: money(premium.price) },
  { label: "Pages", starter: "One page", premium: premiumPages ? smart(premiumPages) : "Several pages" },
  {
    label: "First draft",
    starter: `${starter.firstDraftBusinessDays} business days`,
    premium: `${premium.firstDraftBusinessDays} business days`,
  },
  {
    label: "Typical launch, counted from when your materials arrive",
    starter: capitalize(launchSpan(starter.typicalLaunch)),
    premium: capitalize(launchSpan(premium.typicalLaunch)),
  },
  { label: "Revision rounds", starter: String(starter.revisionRounds), premium: String(premium.revisionRounds) },
  { label: "Fix window after launch", starter: `${pricing.bugFixWindowDays} days`, premium: `${pricing.bugFixWindowDays} days` },
  ...sharedFeatures.map((line) => ({ label: smart(line), starter: true, premium: true })),
  ...premiumFeatures.map((line) => ({ label: smart(line), starter: false, premium: true })),
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <>
        <Icon name="check" className="inline size-5 text-accent" strokeWidth={2} />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span aria-hidden="true" className="inline-block h-px w-3.5 bg-ink-soft align-middle" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span className="text-[0.88rem] sm:text-[0.95rem]">{value}</span>;
}

const COSTS = [
  {
    what: "Building the website",
    who: "Paid to me",
    amount: `${money(starter.price)} or ${money(premium.price)}, once`,
    note: `${pricing.depositPercent}% to start, ${balancePercent}% when you approve the site.`,
  },
  {
    what: "Your domain name",
    who: "Paid to the registrar",
    amount: domainFeeAmount ? `${capitalize(domainFeeAmount)} a year` : "A yearly fee",
    note: "Registered in your name, in your own account. You pay the registrar directly, never me.",
  },
  {
    what: "Hosting, on the maintenance plan",
    who: "Paid to me",
    amount: `Included in ${money(maintenance.pricePerMonth)} a month`,
    note: "The site runs on the studio's paid hosting account, together with the updates and small changes.",
  },
  {
    what: "Hosting, without the plan",
    who: "Paid to the hosting company",
    amount: capitalize(SELF_HOSTING_COST),
    note: "I hand over the site files and help you move them into a hosting account in your own name.",
  },
  {
    what: "Online ordering and reservations",
    who: "Paid to your current provider",
    amount: "No change",
    note: "The site links to the system you already use. I do not sell or run one.",
  },
  {
    what: "Card fees on what you pay me",
    who: "Covered by me",
    amount: "$0 to you",
    note: "You pay through a secure Stripe page, and I cover the card processing fees.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Services and prices"
        title={
          <>
            The whole menu, <em>with prices.</em>
          </>
        }
        aside={
          <p className="font-mono text-[0.82rem] leading-relaxed text-ink-soft">
            {pricing.depositPercent}% to start. {balancePercent}% when you approve the site. {capitalize(rounds)} rounds of
            revisions and {pricing.bugFixWindowDays} days of fixes after launch, on every package.
          </p>
        }
      >
        <p>
          Two website packages, one add-on for catering requests, and an optional monthly plan. The prices are fixed,
          so you know the cost before we talk.
        </p>
      </PageIntro>

      {/* The full price menu ------------------------------------------------------------------ */}
      <section className="bg-paper-deep">
        <div className="shell py-16 md:py-24">
          <div className="menu-card reveal mx-auto max-w-[56rem] px-5 py-10 sm:px-12 sm:py-14">
            <p className="text-center font-mono text-[0.72rem] font-medium uppercase tracking-[0.24em] text-ink-soft">
              Price list
            </p>
            <h2 className="display mt-2 text-center text-[2.2rem] italic leading-none text-accent">The menu</h2>

            <div className="mt-10 grid gap-12">
              <div className="grid gap-9">
                <MenuSectionTitle>Websites</MenuSectionTitle>
                <MenuLine id="starter" name={starter.name} price={starter.price} size="lg">
                  <p className="mt-2 max-w-[56ch] text-ink-soft">{smart(starter.summary)}</p>
                  <p className="mt-2 font-mono text-[0.74rem] tracking-[0.04em] text-ink-soft">
                    First draft in {starter.firstDraftBusinessDays} business days · launch {starter.typicalLaunch}
                  </p>
                  <div className="mt-5">
                    <IncludesList items={starter.includes} columns />
                  </div>
                </MenuLine>
                <MenuLine id="premium" name={premium.name} price={premium.price} size="lg">
                  <p className="mt-2 max-w-[56ch] text-ink-soft">{smart(premium.summary)}</p>
                  <p className="mt-2 font-mono text-[0.74rem] tracking-[0.04em] text-ink-soft">
                    First draft in {premium.firstDraftBusinessDays} business days · launch {premium.typicalLaunch}
                  </p>
                  <div className="mt-5">
                    <IncludesList items={premium.includes} columns />
                  </div>
                </MenuLine>
              </div>

              <div className="grid gap-9">
                <MenuSectionTitle>Add-on</MenuSectionTitle>
                <MenuLine id="catering" name={catering.name} price={catering.price}>
                  <p className="mt-2 max-w-[56ch] text-ink-soft">{smart(catering.summary)}</p>
                  <div className="mt-5">
                    <IncludesList items={catering.includes} />
                  </div>
                  <p className="mt-4 font-mono text-[0.74rem] leading-relaxed tracking-[0.04em] text-ink-soft">
                    {smart(catering.requires)}
                  </p>
                </MenuLine>
              </div>

              <div className="grid gap-9">
                <MenuSectionTitle>After launch</MenuSectionTitle>
                <MenuLine
                  id="maintenance"
                  name={maintenance.name}
                  price={maintenance.pricePerMonth}
                  unit="a month"
                  unitShort="/mo"
                >
                  <p className="mt-2 max-w-[56ch] text-ink-soft">Optional. {smart(maintenance.summary)}</p>
                  <div className="mt-5">
                    <IncludesList items={maintenance.includes} />
                  </div>
                </MenuLine>
              </div>
            </div>

            <hr className="dash-rule mt-12" />
            <p className="mt-5 text-center font-mono text-[0.76rem] leading-relaxed tracking-[0.04em] text-ink-soft">
              {pricing.depositPercent}% to start <span aria-hidden="true">·</span> {balancePercent}% at approval{" "}
              <span aria-hidden="true">·</span> work outside the agreed scope {money(pricing.hourlyRate)} an hour
            </p>
          </div>
        </div>
      </section>

      {/* Starter or Premium ----------------------------------------------------------------------- */}
      <section>
        <div className="shell grid gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          <div className="reveal lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
            <p className="eyebrow">Side by side</p>
            <h2 className="display display-lg mt-5">Starter or Premium?</h2>
            <div className="mt-6 grid max-w-[38ch] gap-4 text-ink-soft">
              <p>
                The {starter.name} suits most places: one page that answers what a guest needs to know, and nothing to
                maintain beyond the menu and the hours.
              </p>
              <p>
                The {premium.name} is for restaurants with more to show: a story worth telling, a lot of photos, a
                catering business, or a menu long enough to need its own page.
              </p>
              <p>Not sure? Ask on the call. I will tell you if the smaller one is enough.</p>
            </div>
          </div>

          <div className="reveal lg:col-span-8 lg:col-start-5">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">What each website package includes</caption>
              <thead>
                <tr className="border-b border-rule-strong align-bottom font-mono text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
                  <th scope="col" className="py-3 pr-3">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="w-[24%] px-2 py-3 sm:w-[26%]">
                    Starter
                  </th>
                  <th scope="col" className="w-[30%] py-3 pl-2 sm:w-[30%]">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-rule align-top">
                    <th scope="row" className="py-3.5 pr-3 text-[0.98rem] font-normal">
                      {row.label}
                    </th>
                    <td className="px-2 py-3.5">
                      <Cell value={row.starter} />
                    </td>
                    <td className="py-3.5 pl-2">
                      <Cell value={row.premium} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Catering add-on --------------------------------------------------------------------- */}
      <section className="on-band bg-band text-on-band">
        <div className="shell grid gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          <div className="reveal lg:col-span-5">
            <p className="eyebrow">The add-on</p>
            <h2 className="display display-lg mt-5">Catering requests that do not get lost.</h2>
            <p className="lead mt-6 max-w-[40ch] text-on-band-soft">
              {money(catering.price)}, once, with either package. Catering requests often arrive at the worst moment,
              by phone, during service. This gives them one place to land.
            </p>
            <p className="mt-8">
              <Link href="/work#behind-the-scenes" className="link-arrow">
                See it work on the sample site
                <Icon name="arrow" className="size-4" />
              </Link>
            </p>
          </div>
          <ol className="reveal grid gap-px self-end bg-rule-on-band lg:col-span-6 lg:col-start-7">
            {[
              ["Recorded", "Every request is saved as a new row in a Google Sheet that belongs to the restaurant."],
              ["You are told", "An email with every detail goes to you the moment the request arrives."],
              [
                "The customer hears back",
                "They get a short note that the request arrived and that you will reply. It confirms nothing.",
              ],
              [
                "You decide",
                "Dates, availability and prices are yours to confirm, in your own words, when you are ready.",
              ],
            ].map(([title, text], index) => (
              <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-x-2 bg-band-raised px-5 py-5">
                <span className="nums pt-1 font-mono text-[0.76rem] font-medium text-accent-on-band">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-on-band-soft">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Maintenance ------------------------------------------------------------------------------ */}
      <section>
        <div className="shell grid gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          <div className="reveal lg:col-span-5">
            <p className="eyebrow">After launch</p>
            <h2 className="display display-lg mt-5">
              {money(maintenance.pricePerMonth)} a month, <em>if you want it.</em>
            </h2>
            <p className="lead mt-6 max-w-[40ch] text-ink-soft">
              The plan is optional and month to month. It is there so a price change or new holiday hours take one
              email, not a weekend.
            </p>
          </div>
          <div className="reveal grid gap-8 lg:col-span-6 lg:col-start-7">
            <IncludesList items={maintenance.includes} />
            <dl className="grid grid-cols-2 border-t border-rule-strong">
              {[
                [`${maintenance.includedEditMinutes} min`, "of small changes each month"],
                [`${maintenance.responseBusinessDays} days`, "business days to a reply"],
                [`${maintenance.outageResponseBusinessDays} day`, "business day if the site is down"],
                [`${maintenance.cancelNoticeDays} days`, "notice to cancel"],
              ].map(([figure, note], index) => (
                <div
                  key={note}
                  className={`border-b border-rule py-4 ${index % 2 === 1 ? "border-l pl-4" : "pr-4"}`}
                >
                  <dt className="display nums text-[1.45rem] leading-tight">{figure}</dt>
                  <dd className="mt-1 font-mono text-[0.74rem] leading-relaxed text-ink-soft">{note}</dd>
                </div>
              ))}
            </dl>
            <p className="text-ink-soft">
              Bigger jobs, such as a new page or a redesigned section, are quoted before I start, at{" "}
              {money(pricing.hourlyRate)} an hour.
            </p>
          </div>
        </div>
      </section>

      {/* Not included, and what things cost -------------------------------------------------------- */}
      <section className="bg-paper-deep">
        <div className="shell py-20 md:py-28">
          <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-8">
            <div className="reveal lg:col-span-5">
              <p className="eyebrow">Not on the menu</p>
              <h2 className="display display-md mt-5">What the prices do not include.</h2>
              <ul className="mt-7 grid gap-3 border-t border-rule-strong pt-6">
                {pricing.notIncluded.map((line) => (
                  <li key={line} className="flex gap-3 text-ink-soft">
                    <span aria-hidden="true" className="mt-[0.7rem] h-px w-3 shrink-0 bg-ink-soft" />
                    <span>{smart(line)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-ink-soft">
                Anything outside the agreed scope is {money(pricing.hourlyRate)} an hour, with a minimum of{" "}
                {pricing.hourlyMinimumMinutes} minutes, and always agreed with you before I do it.
              </p>
            </div>

            <div className="reveal lg:col-span-6 lg:col-start-7">
              <p className="eyebrow">Who pays whom</p>
              <h2 className="display display-md mt-5">Hosting, the domain, and the rest.</h2>
              <dl className="mt-7 border-t border-rule-strong">
                {COSTS.map((cost) => (
                  <div key={cost.what} className="grid gap-x-6 gap-y-1 border-b border-rule py-5 sm:grid-cols-[1fr_minmax(0,15rem)]">
                    <dt className="font-semibold">{cost.what}</dt>
                    <dd className="nums font-mono text-[0.84rem] sm:pt-0.5 sm:text-right">{cost.amount}</dd>
                    <dd className="text-[0.95rem] text-ink-soft sm:col-span-2">
                      <span className="mb-1 mt-1 block font-mono text-[0.72rem] uppercase tracking-[0.12em] text-accent">
                        {cost.who}
                      </span>
                      {cost.note}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Ownership and the guest check --------------------------------------------------------------- */}
      <section>
        <div className="shell grid gap-y-14 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          <div className="reveal lg:col-span-6">
            <p className="eyebrow">The ownership promise</p>
            <h2 className="display display-lg mt-5">
              Yours, <em>all of it.</em>
            </h2>
            <ul className="mt-8 grid gap-5 border-t border-rule-strong pt-6">
              {[
                ["Your domain name", "Registered in your name, in your own account. Nobody can hold it hostage."],
                ["Your content", "The menu, photos, words and logo stay yours, on the site and off it."],
                ["Your listings", "Your Google and other business listings stay in your own accounts, under your control."],
                [
                  "Your way out",
                  `No contract to escape. Without the plan, or after ${maintenance.cancelNoticeDays} days' notice, you get the site files and help moving them.`,
                ],
              ].map(([title, text]) => (
                <li key={title} className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-6">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-ink-soft">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal lg:col-span-5 lg:col-start-8">
            <p className="eyebrow">An example, added up</p>
            <p className="mt-5 max-w-[40ch] text-ink-soft">
              The {premium.name} with the catering add-on comes to {money(exampleCheck.total)}. You pay{" "}
              {money(depositOf(exampleCheck.total))} to start and the rest when you approve the site. The monthly plan
              only starts after launch, and only if you choose it.
            </p>
            <div className="mt-10">
              <GuestCheck />
            </div>
          </div>
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
