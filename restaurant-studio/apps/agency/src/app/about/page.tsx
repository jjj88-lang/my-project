import type { Metadata } from "next";
import Link from "next/link";

import { ClosingCta } from "@/components/sections/ClosingCta";
import { Icon } from "@/components/ui/Icon";
import { PageIntro } from "@/components/ui/PageIntro";
import { INQUIRY_REPLY_TIME } from "@/content/facts";
import { pageMetadata } from "@/lib/seo";
import { founderName, founderStory, serviceAreaText, studio } from "@/lib/studio";
import { smart } from "@/lib/text";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: `${studio.name} is one person who has worked in restaurants and builds every site personally, for independent restaurants in ${serviceAreaText} and beyond.`,
  path: "/about",
});

/** Only things that are true of how the studio works. No years, titles or places are invented here. */
const PRINCIPLES = [
  {
    title: "You talk to the person doing the work.",
    text: "There is no account manager and no hand-off. I build every site myself, and I am the one who answers when you write.",
  },
  {
    title: "Prices are printed up front.",
    text: "The packages and prices are on the services page. You know what it costs before the first call.",
  },
  {
    title: "Everything stays yours.",
    text: "Your domain is registered in your name. Your menu, photos and listings are yours. If you leave, you take the site with you.",
  },
  {
    title: "No promises I cannot keep.",
    text: "A good website makes your restaurant easier to find, read and reach. I will not tell you it brings a number of new customers, because nobody can know that.",
  },
];

/** The name explains itself only while it is this one. */
const nameStory = /sidework/i.test(studio.name);

export default function AboutPage() {
  const hasStory = founderStory.length > 0;

  return (
    <>
      <PageIntro
        eyebrow={founderName ? `About ${studio.name}` : "About the studio"}
        title={
          founderName ? (
            <>
              I am {founderName}. <em>I build every site myself.</em>
            </>
          ) : (
            <>
              One person, <em>who has worked in restaurants.</em>
            </>
          )
        }
        aside={
          <dl className="grid gap-3 font-mono text-[0.8rem] leading-relaxed">
            {[
              ["Who", "One person, part-time"],
              ["Builds", "Every site, personally"],
              ["Serving", serviceAreaText],
            ].map(([term, detail]) => (
              <div key={term} className="grid grid-cols-[5.5rem_1fr] gap-2">
                <dt className="uppercase tracking-[0.12em] text-accent">{term}</dt>
                <dd className="text-ink-soft">{detail}</dd>
              </div>
            ))}
          </dl>
        }
      >
        <p>
          {studio.name} builds websites for independent restaurants. It is a small, part-time studio run by one
          person, and that is on purpose.
        </p>
      </PageIntro>

      <section className="bg-paper-deep">
        <div className="shell grid gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          <div className="reveal lg:col-span-4">
            <p className="eyebrow">{founderName ? `${founderName}, ${studio.founder.role.toLowerCase()}` : "Why me"}</p>
            <h2 className="display display-md mt-5">Built by someone who knows service.</h2>
          </div>
          <div className="reveal grid max-w-[60ch] gap-5 text-[1.06rem] lg:col-span-7 lg:col-start-6">
            {hasStory ? (
              founderStory.map((paragraph) => <p key={paragraph}>{smart(paragraph)}</p>)
            ) : (
              <>
                <p className="lead">
                  I have worked in restaurants. I know what a Friday night is like, and I know the website is the last
                  thing anyone has time for in the middle of one.
                </p>
                <p className="text-ink-soft">
                  That work taught me how menus, service, ordering and catering actually run. It is why the sites I
                  build start with the questions guests really ask: what is on the menu, are you open, how do I get
                  there, and can I order or book.
                </p>
                <p className="text-ink-soft">
                  I build every site personally, from typing out the menu to testing the last button on a phone. When
                  you write, I am the one who answers, usually {INQUIRY_REPLY_TIME}.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="shell py-20 md:py-28">
          <div className="reveal max-w-[40rem]">
            <p className="eyebrow">How I work</p>
            <h2 className="display display-lg mt-5">Four things you can hold me to.</h2>
          </div>
          <ol className="mt-12 grid gap-x-8 border-t border-rule-strong md:grid-cols-2">
            {PRINCIPLES.map((item, index) => (
              <li key={item.title} className="reveal grid grid-cols-[3rem_1fr] gap-x-2 border-b border-rule py-7">
                <span className="nums pt-1.5 font-mono text-[0.78rem] font-medium tracking-[0.1em] text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="display display-sm">{item.title}</h3>
                  <p className="mt-2 max-w-[46ch] text-ink-soft">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="on-band bg-band text-on-band">
        <div className="shell grid gap-y-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-8">
          {nameStory && (
            <div className="reveal lg:col-span-6">
              <p className="eyebrow">The name</p>
              <h2 className="display display-md mt-5">
                Sidework is the prep <em>nobody sees.</em>
              </h2>
              <p className="mt-6 max-w-[48ch] text-on-band-soft">
                In a restaurant, sidework is what staff do before and after service: folding napkins, filling sauce
                bottles, restocking the line. Guests never see it, but service falls apart without it. A good website
                is the same kind of job.
              </p>
            </div>
          )}
          <div className={`reveal ${nameStory ? "lg:col-span-5 lg:col-start-8" : "lg:col-span-7"}`}>
            <p className="eyebrow">Where</p>
            <h2 className="display display-md mt-5">Starting in {serviceAreaText}.</h2>
            <p className="mt-6 max-w-[48ch] text-on-band-soft">
              Those are the first places I am working in.
              {studio.worksRemotely
                ? " Everything can be done by phone, email and a shared link, so I also work with independent restaurants anywhere in the United States."
                : ""}
            </p>
            <p className="mt-6">
              <Link href="/faq" className="link-arrow">
                Read the questions owners ask
                <Icon name="arrow" className="size-4" />
              </Link>
            </p>
          </div>
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
