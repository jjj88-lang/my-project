import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { GuestCheck } from "@/components/pricing/GuestCheck";
import { IncludesList, PriceMenuBrief } from "@/components/pricing/PriceMenu";
import { Tickets } from "@/components/process/Tickets";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { FaqList } from "@/components/sections/FaqList";
import { Icon } from "@/components/ui/Icon";
import { BrowserFrame, PhoneFrame, SampleTag } from "@/components/work/Devices";
import { FIRST_CALL_MINUTES } from "@/content/facts";
import { HOME_FAQ_IDS, faqById } from "@/content/faq";
import { PROCESS_STEPS } from "@/content/process";
import { DEMO_KEYS } from "@/lib/demos";
import { draftDaysRange, lowestPrice, maintenance, money, pricing, starter } from "@/lib/pricing";
import { founderName, studio } from "@/lib/studio";
import { demoHasShots, shot } from "@/lib/work/shots";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const JOBS = [
  {
    name: "The menu",
    text: "Real text with prices, laid out the way your printed menu is. Nothing to download, nothing to pinch and zoom.",
  },
  {
    name: "Today’s hours",
    text: "Regular hours, holiday hours, and a plain answer to the question every guest is asking: are you open right now?",
  },
  {
    name: "The way there",
    text: "Your address, a button that opens directions in their maps app, and a phone number they can tap to call.",
  },
  {
    name: "A way to order or book",
    text: "Clear buttons that go straight to the online ordering and reservation systems you already use.",
  },
];

const SITUATIONS = [
  {
    situation: "The menu is a PDF or a photo.",
    fix: "I type it out as real text, section by section, with prices. It reads properly on a phone and it is quick to change.",
  },
  {
    situation: "The hours changed, and the website did not.",
    fix: "Hours live in one place on the new site, with holiday hours built in. On the maintenance plan, you send me the change and I make it.",
  },
  {
    situation: "The Order Online button goes to an old page.",
    fix: "Every button points to the ordering and reservation systems you use today, and I check each one before launch.",
  },
  {
    situation: "The person who built the site has moved on.",
    fix: "You get someone who answers. And your domain name is registered in your own name, so you are never locked out of your own address.",
  },
  {
    situation: "A Facebook page is standing in for a website.",
    fix: "Keep the page. A small site of your own gives guests the menu, hours and directions without an account, and it is yours.",
  },
];

export default function HomePage() {
  // The first sample that has screenshots is the one shown here. With none, the page still reads properly.
  const featured = DEMO_KEYS.find((key) => demoHasShots(key));
  const demo = featured ? studio.demos[featured] : undefined;
  const heroDesktop = featured ? shot(featured, "home", "desktop") : undefined;
  const heroMobile = featured ? shot(featured, "home", "mobile") : undefined;
  const menuMobile = featured ? shot(featured, "menu", "mobile") : undefined;
  const visitMobile = featured ? shot(featured, "visit", "mobile") : undefined;
  const sampleLabel = demo ? `Sample concept: ${demo.name}, a fictional restaurant` : "";
  const hasPhones = Boolean(menuMobile || visitMobile || heroMobile);

  const facts = [
    { figure: `From ${money(lowestPrice)}`, note: `for the one-page ${starter.name}` },
    { figure: `${draftDaysRange()} business days`, note: "to a first draft you can tap through" },
    { figure: `${pricing.depositPercent}% to start`, note: "the rest when you approve the site" },
    { figure: `${money(maintenance.pricePerMonth)} a month`, note: "optional upkeep, month to month" },
  ];

  return (
    <>
      {/* Hero ------------------------------------------------------------------------------ */}
      <section className="overflow-x-clip">
        <div className="shell pb-14 pt-10 md:pb-20 md:pt-16 lg:pt-20">
          <p className="eyebrow enter">{studio.tagline}</p>
          <h1
            className="display display-xl enter mt-5 max-w-[13ch] lg:max-w-none lg:[text-wrap:wrap]"
            style={{ "--i": 1 } as CSSProperties}
          >
            <span className="lg:block">Your restaurant&rsquo;s website,</span> <em>handled.</em>
          </h1>

          <div className="mt-8 grid gap-y-12 lg:mt-10 lg:grid-cols-12 lg:gap-x-8">
            <div className="enter lg:col-span-5" style={{ "--i": 2 } as CSSProperties}>
              <p className="lead max-w-[40ch] text-ink-soft">
                I build fast, phone-first websites for independent restaurants: your real menu, your hours,
                directions, and buttons to the ordering and reservation systems you already use.{" "}
                <span className="text-ink">
                  From {money(lowestPrice)}, with a first draft in {draftDaysRange()} business days.
                </span>
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/work" className="btn btn-primary">
                  See the sample site
                  <Icon name="arrow" className="btn-arrow size-5" />
                </Link>
                <Link href="/contact" className="btn btn-ghost">
                  Book a free {FIRST_CALL_MINUTES}-minute call
                </Link>
              </div>
            </div>

            <div
              className="enter lg:col-span-7 lg:col-start-6 lg:-mt-28 xl:-mt-32"
              style={{ "--i": 3 } as CSSProperties}
            >
              {heroDesktop || heroMobile ? (
                <figure>
                  <div className="relative">
                    {heroDesktop ? (
                      <BrowserFrame
                        image={heroDesktop}
                        alt={`The home page of ${demo!.name}, a sample restaurant website, on a laptop screen`}
                        address={`sample concept · ${demo!.name.toLowerCase()}`}
                        sizes="(min-width: 1024px) 52vw, 92vw"
                        preload
                        className={heroMobile ? "ml-[12%] sm:ml-[16%]" : ""}
                      />
                    ) : null}
                    {heroMobile ? (
                      <PhoneFrame
                        image={heroMobile}
                        alt={`The same site on a phone, with buttons to reserve a table and order online`}
                        sizes="(min-width: 1024px) 15vw, 34vw"
                        preload={!heroDesktop}
                        className={
                          heroDesktop
                            ? "absolute bottom-[-9%] left-0 w-[33%] sm:w-[27%]"
                            : "mx-auto w-[min(17rem,70%)]"
                        }
                      />
                    ) : null}
                  </div>
                  <figcaption className={heroDesktop && heroMobile ? "mt-12 sm:mt-14 lg:text-right" : "mt-6 lg:text-right"}>
                    <SampleTag>{sampleLabel}</SampleTag>
                  </figcaption>
                </figure>
              ) : (
                <GuestCheck />
              )}
            </div>
          </div>

          <dl className="mt-14 grid grid-cols-2 border-t border-rule-strong md:mt-20 lg:grid-cols-4">
            {facts.map((fact, index) => (
              <div
                key={fact.figure}
                className={[
                  "border-b border-rule py-5 lg:border-b-0 lg:py-6",
                  // Two columns on small screens: the right-hand cell gets the dividing line.
                  index % 2 === 1 ? "border-l pl-4" : "pr-4",
                  // Four columns on wide screens: every cell after the first gets one.
                  index > 0 ? "lg:border-l lg:pl-6" : "lg:pl-0",
                  "lg:pr-4",
                ].join(" ")}
              >
                <dt className="display nums text-[1.35rem] leading-tight sm:text-[1.7rem]">{fact.figure}</dt>
                <dd className="mt-1 font-mono text-[0.74rem] leading-relaxed text-ink-soft">{fact.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The job a restaurant site has to do ------------------------------------------------ */}
      <section className="bg-paper-deep">
        <div className="shell grid gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          <div className="reveal lg:col-span-5">
            <p className="eyebrow">The job</p>
            <h2 className="display display-lg mt-5">Four things a guest wants from your site.</h2>
            <p className="lead mt-6 max-w-[36ch] text-ink-soft">
              Someone deciding where to eat opens your site on a phone. They are not there to admire it. They want an
              answer, and then they want dinner.
            </p>
          </div>
          <ol className="lg:col-span-6 lg:col-start-7">
            {JOBS.map((job, index) => (
              <li key={job.name} className="reveal grid grid-cols-[3rem_1fr] gap-x-2 border-t border-rule-strong py-6 last:border-b">
                <span className="nums pt-1.5 font-mono text-[0.78rem] font-medium tracking-[0.1em] text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="display display-sm">{job.name}</h3>
                  <p className="mt-2 max-w-[48ch] text-ink-soft">{job.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Common situations ------------------------------------------------------------------ */}
      <section>
        <div className="shell py-20 md:py-28">
          <div className="reveal grid gap-y-6 lg:grid-cols-12 lg:gap-x-8">
            <div className="lg:col-span-7">
              <p className="eyebrow">Sound familiar?</p>
              <h2 className="display display-lg mt-5">Common situations, and what I do about them.</h2>
            </div>
            <p className="max-w-[44ch] text-ink-soft lg:col-span-4 lg:col-start-9 lg:self-end">
              None of these mean anybody did something wrong. Restaurants are busy, and the website is rarely the
              thing on fire. All of them can be fixed.
            </p>
          </div>

          <dl className="mt-12 border-t border-rule-strong">
            {SITUATIONS.map((row) => (
              <div key={row.situation} className="reveal grid gap-x-8 gap-y-2 border-b border-rule py-6 lg:grid-cols-12 lg:py-7">
                <dt className="display display-sm lg:col-span-5">{row.situation}</dt>
                <dd className="max-w-[58ch] text-ink-soft lg:col-span-6 lg:col-start-7">{row.fix}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* What you get -------------------------------------------------------------------------- */}
      <section className="overflow-x-clip bg-paper-deep">
        {/* In reading order: heading, screenshots, list. On wide screens the screenshots take the left column. */}
        <div className="shell grid gap-y-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-9">
          <div className={`reveal ${hasPhones ? "lg:col-span-6 lg:col-start-7 lg:row-start-1" : "lg:col-span-8"}`}>
            <p className="eyebrow">What you get</p>
            <h2 className="display display-lg mt-5">A finished site, not a kit.</h2>
            <p className="lead mt-6 max-w-[44ch] text-ink-soft">
              You send the menu, the hours and whatever photos you have. I do the rest, and you see it on your own
              phone before anything goes live.
            </p>
          </div>

          {hasPhones && (
            <figure className="reveal lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">
              <div className="mx-auto flex max-w-[27rem] items-start justify-center gap-4 sm:gap-6">
                {(menuMobile ?? heroMobile) && (
                  <PhoneFrame
                    image={(menuMobile ?? heroMobile)!}
                    alt={
                      menuMobile
                        ? `The menu page of ${demo!.name} on a phone: sections, dishes and prices as text`
                        : `The home page of ${demo!.name} on a phone`
                    }
                    sizes="(min-width: 1024px) 17vw, 42vw"
                    className="w-1/2"
                  />
                )}
                {visitMobile && (
                  <PhoneFrame
                    image={visitMobile}
                    alt={`The hours and location page of ${demo!.name} on a phone, showing that the restaurant is open now`}
                    sizes="(min-width: 1024px) 17vw, 42vw"
                    className="mt-10 w-1/2 sm:mt-14"
                  />
                )}
              </div>
              <figcaption className="mt-8 text-center">
                <SampleTag>{sampleLabel}</SampleTag>
              </figcaption>
            </figure>
          )}

          <div className={`reveal ${hasPhones ? "lg:col-span-6 lg:col-start-7 lg:row-start-2" : "lg:col-span-8"}`}>
            <h3 className="font-semibold">Every {starter.name} includes:</h3>
            <div className="mt-5">
              <IncludesList items={starter.includes} />
            </div>
            <p className="mt-8">
              <Link href="/services" className="link-arrow">
                Compare the packages
                <Icon name="arrow" className="size-4" />
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Pricing in brief ------------------------------------------------------------------------- */}
      <section>
        {/* In reading order: heading, price list, link. On wide screens the link sits under the heading. */}
        <div className="shell grid gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-6">
          <div className="reveal lg:col-span-4 lg:row-start-1">
            <p className="eyebrow">Prices</p>
            <h2 className="display display-lg mt-5">Printed on the menu, like yours.</h2>
            <p className="lead mt-6 max-w-[34ch] text-ink-soft">
              You should not have to ask what something costs. These are the prices, and there is no separate quote
              to wait for.
            </p>
          </div>
          <div className="reveal lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
            <PriceMenuBrief />
          </div>
          <p className="reveal lg:col-span-4 lg:col-start-1 lg:row-start-2">
            <Link href="/services" className="link-arrow">
              See everything that is included
              <Icon name="arrow" className="size-4" />
            </Link>
          </p>
        </div>
      </section>

      {/* Process tickets ------------------------------------------------------------------------- */}
      <section className="on-band overflow-x-clip bg-band text-on-band">
        <div className="shell py-20 md:py-28">
          <div className="reveal grid gap-y-6 lg:grid-cols-12 lg:gap-x-8">
            <div className="lg:col-span-7">
              <p className="eyebrow">How it goes</p>
              <h2 className="display display-lg mt-5">From first call to open for business, in five tickets.</h2>
            </div>
            <p className="max-w-[44ch] text-on-band-soft lg:col-span-4 lg:col-start-9 lg:self-end">
              The order of work is the same every time, so you always know which ticket is up and what I need from
              you next.
            </p>
          </div>
          <div className="mt-12 md:mt-16">
            <Tickets steps={PROCESS_STEPS} />
          </div>
          <p className="mt-12 text-center">
            <Link href="/process" className="link-arrow">
              Read the process in detail
              <Icon name="arrow" className="size-4" />
            </Link>
          </p>
        </div>
      </section>

      {/* Founder ----------------------------------------------------------------------------------- */}
      <section>
        <div className="shell grid gap-y-8 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          <div className="reveal lg:col-span-5">
            <p className="eyebrow">Who you work with</p>
            <h2 className="display display-lg mt-5">One person, who has worked in restaurants.</h2>
          </div>
          <div className="reveal grid max-w-[58ch] gap-4 lg:col-span-6 lg:col-start-7">
            <p className="lead">
              {founderName ? `I am ${founderName}. ` : ""}I have worked in restaurants, so I know the website is the
              last thing on your mind in the middle of a Friday rush.
            </p>
            <p className="text-ink-soft">
              That work taught me how menus, service, ordering and catering actually run, and why the hours online
              have to match the hours on the door. I build every site myself, and I am the one who answers when you
              write.
            </p>
            <p>
              <Link href="/about" className="link-arrow">
                More about the studio
                <Icon name="arrow" className="size-4" />
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Four questions ------------------------------------------------------------------------------ */}
      <section className="bg-paper-deep">
        <div className="shell grid gap-y-8 py-20 md:py-28 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-6">
          <div className="reveal lg:col-span-4 lg:row-start-1">
            <p className="eyebrow">Questions</p>
            <h2 className="display display-lg mt-5">Asked before most calls.</h2>
          </div>
          <div className="reveal lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
            <FaqList items={HOME_FAQ_IDS.map(faqById)} />
          </div>
          <p className="reveal lg:col-span-4 lg:col-start-1 lg:row-start-2">
            <Link href="/faq" className="link-arrow">
              All questions and answers
              <Icon name="arrow" className="size-4" />
            </Link>
          </p>
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
