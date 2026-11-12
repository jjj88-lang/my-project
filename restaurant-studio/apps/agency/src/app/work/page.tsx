import type { Metadata } from "next";
import type { StaticImageData } from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { ClosingCta } from "@/components/sections/ClosingCta";
import { Icon } from "@/components/ui/Icon";
import { PageIntro } from "@/components/ui/PageIntro";
import { BehindTheScenes } from "@/components/work/BehindTheScenes";
import { BrowserFrame, PhoneFrame, SampleTag } from "@/components/work/Devices";
import { DEMO_KEYS, type DemoKey, demoUrls } from "@/lib/demos";
import { catering, money, pricing } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { studio } from "@/lib/studio";
import { demoHasShots, shot } from "@/lib/work/shots";

export const metadata: Metadata = pageMetadata({
  title: "Sample work",
  description:
    "Two sample restaurant websites, built the way a real client's would be: the phone menu, hours and directions, and a catering request form with what happens behind the scenes.",
  path: "/work",
});

/** What each sample is meant to show. Both restaurants are fictional. */
const DEMO_DETAILS: Record<DemoKey, { pitch: string; shows: string[]; addCatering: boolean }> = {
  hibana: {
    pitch:
      "A hibachi and sushi restaurant with a page for each thing guests come for: the menu, hours and location, ordering, reservations and catering.",
    shows: [
      "Separate pages, each with its own address",
      "A menu you can jump through by section",
      "Hours that say whether the restaurant is open right now",
      "A catering request form, recorded in the owner's own spreadsheet",
    ],
    addCatering: true,
  },
  bulmat: {
    pitch:
      "A Korean BBQ restaurant on a single page. Everything a guest looks for is one scroll away, and catering is handled by phone.",
    shows: [
      "One page that does the whole job",
      "The full menu, typed out, with prices",
      "Hours, address and a map link",
      "Buttons to call, get directions and order",
    ],
    addCatering: false,
  },
};

function planName(key: DemoKey): string {
  const plan = studio.demos[key].plan as keyof typeof pricing.packages;
  const name = pricing.packages[plan]?.name ?? plan;
  return DEMO_DETAILS[key].addCatering ? `${name} with ${catering.name}` : name;
}

/** The phone screens walked through below, from the first sample that has each one. */
function firstShot(page: "menu" | "visit" | "catering", device: "mobile" | "desktop") {
  for (const key of DEMO_KEYS) {
    const image = shot(key, page, device);
    if (image) return { key, image, name: studio.demos[key].name };
  }
  return undefined;
}

export default function WorkPage() {
  const demos = DEMO_KEYS.filter((key) => demoHasShots(key));
  const menu = firstShot("menu", "mobile");
  const visit = firstShot("visit", "mobile");
  const cateringMobile = firstShot("catering", "mobile");
  const cateringDesktop = firstShot("catering", "desktop");

  return (
    <>
      <PageIntro
        eyebrow="Sample work"
        title={
          <>
            Sample restaurants, built the way <em>yours would be.</em>
          </>
        }
        aside={
          <p className="text-[0.98rem] text-ink-soft">
            These restaurants do not exist. I made them so you can tap through a finished site before you decide
            anything. A real client&rsquo;s site uses their own menu, hours, photos and links.
          </p>
        }
      >
        <p>
          Each sample is a working website, not a picture of one. Open it on your phone and try the menu, the
          hours and the buttons a guest would use.
        </p>
      </PageIntro>

      {/* The samples ---------------------------------------------------------------------------- */}
      {demos.length === 0 ? (
        <section className="shell pb-20">
          <p className="max-w-[60ch] border-t border-rule-strong pt-6 text-ink-soft">
            Screenshots of the sample sites are being retaken. Ask on a call and I will show you the live samples.
          </p>
        </section>
      ) : (
        demos.map((key, index) => <DemoFeature key={key} demo={key} flip={index % 2 === 1} tinted={index % 2 === 0} />)
      )}

      {/* What you receive ------------------------------------------------------------------------ */}
      {menu || visit || cateringMobile ? (
        <section className="pt-20 md:pt-28" aria-labelledby="receive-title">
          <div className="shell">
            <div className="grid gap-y-6 lg:grid-cols-12 lg:gap-x-8">
              <div className="reveal lg:col-span-7">
                <p className="eyebrow">What you receive</p>
                <h2 id="receive-title" className="display display-lg mt-5">
                  The parts of the site guests <em>actually use.</em>
                </h2>
              </div>
              <p className="reveal lead self-end text-ink-soft lg:col-span-4 lg:col-start-9">
                Most visits to a restaurant site happen on a phone, often in a car or on a sidewalk. These are the
                screens that matter there.
              </p>
            </div>

            <div className="mt-16 grid gap-24 md:mt-20">
              {menu ? (
                <Walkthrough
                  number="01"
                  title="The menu, typed out"
                  image={menu.image}
                  alt={`The menu page of ${menu.name}, a sample restaurant site, on a phone`}
                  sample={menu.name}
                  notes={[
                    ["Real text, not a PDF", "It loads quickly, reads at any size and can be found by search engines."],
                    ["Sections to jump between", "Guests skip straight to the part they came for."],
                    ["Your ordering link, one tap away", "It goes to the system you already use. I do not sell one."],
                    ["Easy to change", "A price or a dish changes in minutes, not with a new PDF."],
                  ]}
                />
              ) : null}
              {visit ? (
                <Walkthrough
                  flip
                  number="02"
                  title="Hours and directions"
                  image={visit.image}
                  alt={`The hours and location page of ${visit.name}, showing that it is open now`}
                  sample={visit.name}
                  notes={[
                    ["Open now, or not", "The site works it out from your hours, so guests do not have to."],
                    ["Every day spelled out", "Split lunch and dinner hours are shown the way you keep them."],
                    ["Call, directions, order", "A bar at the bottom of every phone screen, always in reach."],
                    ["One place to change hours", "When they change, they change everywhere on the site at once."],
                  ]}
                />
              ) : null}
              {cateringMobile ? (
                <Walkthrough
                  number="03"
                  title="A catering request"
                  image={cateringMobile.image}
                  alt={`The catering request form of ${cateringMobile.name}, a sample restaurant site, on a phone`}
                  sample={cateringMobile.name}
                  desktop={cateringDesktop?.image}
                  notes={[
                    ["The questions you would ask", "Date, guest count, pickup or delivery, and anything else you need."],
                    ["Checked before it is sent", "Missing details are pointed out clearly, field by field."],
                    ["Your notice rules", "If you need three days, the form says so and the guest is asked to call."],
                    ["It promises nothing", "No date, price or availability is confirmed. You reply when ready."],
                  ]}
                />
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* Behind the scenes -------------------------------------------------------------------- */}
      <section
        id="behind-the-scenes"
        className="on-band mt-20 scroll-mt-20 bg-band text-on-band md:mt-28"
        aria-labelledby="behind-title"
      >
        <div className="shell py-20 md:py-28">
          <div className="grid gap-y-6 lg:grid-cols-12 lg:gap-x-8">
            <div className="reveal lg:col-span-7">
              <p className="eyebrow">Behind the scenes · {catering.name}</p>
              <h2 id="behind-title" className="display display-lg mt-5">
                What happens when someone <em>asks about catering.</em>
              </h2>
            </div>
            <p className="reveal lead self-end text-on-band-soft lg:col-span-4 lg:col-start-9">
              {money(catering.price)}, once, added to either package. Shown here with a sample request to the
              fictional Hibana.
            </p>
          </div>
          <div className="mt-14">
            <BehindTheScenes />
          </div>
        </div>
      </section>

      <ClosingCta showWorkLink={false} />
    </>
  );
}

function DemoFeature({ demo, flip, tinted }: { demo: DemoKey; flip: boolean; tinted: boolean }) {
  const info = studio.demos[demo];
  const details = DEMO_DETAILS[demo];
  const desktop = shot(demo, "home", "desktop");
  const mobile = shot(demo, "home", "mobile");
  const url = demoUrls[demo];
  const label = `Sample concept: ${info.name}, a fictional restaurant`;

  return (
    <section
      id={demo}
      className={`scroll-mt-20 overflow-x-clip ${tinted ? "bg-paper-deep" : ""}`}
      aria-labelledby={`${demo}-title`}
    >
      <div className="shell grid gap-y-12 py-20 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-x-8">
        <figure className={`reveal lg:col-span-7 ${flip ? "lg:order-2 lg:col-start-6" : ""}`}>
          <div className="relative">
            {desktop ? (
              <BrowserFrame
                image={desktop}
                alt={`The home page of ${info.name}, a sample ${info.descriptor.toLowerCase()} restaurant website`}
                address={`sample concept · ${info.name.toLowerCase()}`}
                sizes="(min-width: 1024px) 52vw, 92vw"
                className={mobile ? (flip ? "mr-[12%] sm:mr-[16%]" : "ml-[12%] sm:ml-[16%]") : ""}
              />
            ) : null}
            {mobile ? (
              <PhoneFrame
                image={mobile}
                alt={`${info.name} on a phone`}
                sizes="(min-width: 1024px) 15vw, 34vw"
                className={
                  desktop
                    ? `absolute bottom-[-9%] w-[33%] sm:w-[27%] ${flip ? "right-0" : "left-0"}`
                    : "mx-auto w-[min(17rem,70%)]"
                }
              />
            ) : null}
          </div>
          <figcaption className={desktop && mobile ? "mt-12 sm:mt-14" : "mt-6"}>
            <SampleTag>{label}</SampleTag>
          </figcaption>
        </figure>

        <div className={`reveal lg:col-span-4 ${flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-9"}`}>
          <p className="eyebrow">{info.descriptor}</p>
          <h2 id={`${demo}-title`} className="display display-lg mt-4">
            {info.name}
          </h2>
          <p className="mt-5 text-ink-soft">{details.pitch}</p>

          <dl className="mt-8 border-t border-rule-strong">
            <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 border-b border-rule py-3">
              <dt className="font-mono text-[0.74rem] uppercase tracking-[0.1em] text-ink-soft">Plan</dt>
              <dd>{planName(demo)}</dd>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 border-b border-rule py-3">
              <dt className="font-mono text-[0.74rem] uppercase tracking-[0.1em] text-ink-soft">Shows</dt>
              <dd>
                <ul className="grid gap-1.5">
                  {details.shows.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>

          {url ? (
            <p className="mt-8">
              <a href={url} className="btn btn-ghost" target="_blank" rel="noopener">
                Open the live sample
                <Icon name="arrowUpRight" className="size-5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Walkthrough({
  number,
  title,
  image,
  alt,
  sample,
  notes,
  desktop,
  flip = false,
}: {
  number: string;
  title: string;
  image: StaticImageData;
  alt: string;
  sample: string;
  notes: Array<[string, string]>;
  desktop?: StaticImageData;
  flip?: boolean;
}): ReactNode {
  return (
    <article className="grid gap-y-10 lg:grid-cols-12 lg:items-start lg:gap-x-8">
      {/* Text first in the page, so on a phone the heading comes before its screenshot. */}
      <div className={`reveal lg:col-span-6 ${flip ? "lg:order-1 lg:col-start-1" : "lg:order-2 lg:col-start-7"}`}>
        <p className="nums font-mono text-[0.8rem] font-medium tracking-[0.12em] text-accent">{number}</p>
        <h3 className="display display-md mt-3">{title}</h3>
        <ol className="mt-8 border-t border-rule-strong">
          {notes.map(([heading, text], index) => (
            <li
              key={heading}
              className="grid grid-cols-[2.25rem_1fr] gap-x-2 border-b border-rule py-4"
              style={{ "--i": index } as CSSProperties}
            >
              <span
                className="nums mt-0.5 grid size-6 place-items-center rounded-full border border-rule-strong font-mono text-[0.7rem] text-ink"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div>
                <p className="font-semibold">{heading}</p>
                <p className="mt-1 text-ink-soft">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <figure className={`reveal lg:col-span-5 ${flip ? "lg:order-2 lg:col-start-8" : "lg:order-1 lg:col-start-1"}`}>
        <div className="relative">
          {desktop ? (
            <BrowserFrame
              image={desktop}
              alt={`The same form on a laptop`}
              address={`sample concept · ${sample.toLowerCase()}`}
              sizes="(min-width: 1024px) 34vw, 80vw"
              className="ml-[22%] hidden sm:block"
            />
          ) : null}
          <PhoneFrame
            image={image}
            alt={alt}
            sizes="(min-width: 1024px) 20vw, 60vw"
            className={desktop ? "mx-auto w-[min(17rem,72%)] sm:absolute sm:bottom-[-12%] sm:left-0 sm:w-[42%]" : "mx-auto w-[min(17rem,72%)]"}
          />
        </div>
        <figcaption className={`${desktop ? "sm:mt-20" : ""} mt-6 text-center lg:text-left`}>
          <SampleTag>{`Sample concept: ${sample}, a fictional restaurant`}</SampleTag>
        </figcaption>
      </figure>

    </article>
  );
}
