import Image from "next/image";
import Link from "next/link";

import { Art } from "@/components/ui/Art";
import { Icon } from "@/components/ui/Icon";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { OpenStatus } from "@/components/ui/OpenStatus";
import { isPremium, photo, site } from "@/lib/site";
import { addressLines, directionsUrl, telHref } from "@/lib/site/format";
import { orderLink, reserveLink, type ActionLink } from "@/lib/site/nav";

/** Fixed positions so the sparks are identical on the server and in the browser. */
const EMBERS = [
  { left: "8%", size: 3, d: 11, delay: 0, x: "3rem", o: 0.8 },
  { left: "17%", size: 2, d: 14, delay: 3.2, x: "-2rem", o: 0.6 },
  { left: "29%", size: 2, d: 9, delay: 6.1, x: "4rem", o: 0.9 },
  { left: "41%", size: 3, d: 13, delay: 1.4, x: "-3rem", o: 0.7 },
  { left: "52%", size: 2, d: 10, delay: 4.7, x: "2rem", o: 0.85 },
  { left: "61%", size: 4, d: 15, delay: 7.9, x: "-4rem", o: 0.55 },
  { left: "69%", size: 2, d: 9, delay: 2.3, x: "3rem", o: 0.9 },
  { left: "77%", size: 3, d: 12, delay: 5.5, x: "-2rem", o: 0.75 },
  { left: "84%", size: 2, d: 11, delay: 0.8, x: "2rem", o: 0.8 },
  { left: "91%", size: 3, d: 14, delay: 8.6, x: "-3rem", o: 0.6 },
  { left: "35%", size: 2, d: 16, delay: 9.4, x: "5rem", o: 0.5 },
  { left: "73%", size: 2, d: 10, delay: 11, x: "-5rem", o: 0.7 },
];

function Embers() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember absolute bottom-[-2%] rounded-full bg-accent opacity-0 shadow-[0_0_10px_2px_var(--c-accent)]"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              "--ember-d": `${e.d}s`,
              "--ember-delay": `${e.delay}s`,
              "--ember-x": e.x,
              "--ember-o": e.o,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Headline({ text, className }: { text: string; className: string }) {
  const lines = text.split("\n");
  return (
    <h1 className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`block ${lines.length > 1 && i === lines.length - 1 ? "accent-line" : ""}`}>
          {line}
        </span>
      ))}
    </h1>
  );
}

function Cta({ action, className }: { action: ActionLink; className: string }) {
  return action.external ? (
    <a href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
      {action.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  );
}

function HeroActions() {
  const menuHref = isPremium ? "/menu" : "/#menu";
  const primary = reserveLink ?? orderLink;
  return (
    <div className="flex flex-wrap gap-3">
      {primary && <Cta action={primary} className="btn btn-solid" />}
      <Link href={menuHref} className={`btn ${primary ? "btn-ghost" : "btn-solid"}`}>
        View the menu
      </Link>
      {primary && orderLink && primary !== orderLink && <Cta action={orderLink} className="btn btn-ghost" />}
    </div>
  );
}

function HeroFacts() {
  const [line1, line2] = addressLines(site.contact.address);
  return (
    <ul className="flex flex-col gap-x-10 gap-y-3 text-[0.94rem] sm:flex-row sm:flex-wrap sm:items-center">
      <li>
        <OpenStatus hours={site.hours} timeZone={site.timezone} />
      </li>
      <li>
        <a
          href={directionsUrl(site)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 py-1 transition-colors hover:text-accent"
        >
          <Icon name="pin" className="size-4 text-accent" />
          <span>
            {line1}, {line2}
          </span>
          <span className="sr-only"> (directions open in a new tab)</span>
        </a>
      </li>
      <li>
        <a
          href={telHref(site.contact.phone)}
          className="nums inline-flex items-center gap-2.5 py-1 transition-colors hover:text-accent"
        >
          <Icon name="phone" className="size-4 text-accent" />
          {site.contact.phone}
        </a>
      </li>
    </ul>
  );
}

/** Full-bleed hero: the photo (or a composed line-art scene) sits behind the headline. */
function CinematicHero() {
  const { hero } = site;
  const image = photo(hero.media.image);

  return (
    <section className="relative isolate -mt-[var(--header-h)] flex min-h-[min(calc(100svh-4.75rem),58rem)] flex-col justify-end overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {image ? (
          <>
            <Image
              src={image}
              alt={hero.media.alt ?? ""}
              fill
              preload
              sizes="100vw"
              placeholder={image.blurDataURL ? "blur" : "empty"}
              className="enter-fade object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.55)_0%,rgb(0_0_0/0.15)_30%,rgb(0_0_0/0.5)_62%,var(--c-bg)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.55)_0%,transparent_65%)]" />
          </>
        ) : (
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(58%_62%_at_78%_72%,color-mix(in_srgb,var(--c-accent)_36%,transparent),transparent_70%),radial-gradient(40%_40%_at_88%_22%,color-mix(in_srgb,var(--c-accent)_13%,transparent),transparent_72%),radial-gradient(50%_40%_at_10%_100%,color-mix(in_srgb,var(--c-accent)_12%,transparent),transparent_70%)]" />
            <div className="pattern-waves absolute inset-0 opacity-[0.06]" />
            {/* Phones: a faint oversized watermark behind the text. Desktop: a clear motif in the right-hand third. */}
            <div className="absolute inset-y-0 right-[-35%] grid w-[120%] place-items-center opacity-25 sm:right-[-10%] sm:w-[70%] lg:right-0 lg:w-[42%] lg:opacity-100">
              <Art motif={hero.media.art ?? "rings"} strokeWidth={0.55} className="breathe h-[72%] max-w-full text-accent" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,var(--c-bg))]" />
          </div>
        )}
      </div>

      {hero.embers && <Embers />}

      <div className="container-site pb-10 pt-[calc(var(--header-h)+5rem)] md:pb-14">
        {hero.eyebrow && (
          <p className="eyebrow enter" style={{ "--i": 0 } as React.CSSProperties}>
            {hero.eyebrow}
          </p>
        )}
        <Headline
          text={hero.headline}
          className="display enter mt-5 max-w-[15ch] text-[clamp(2.9rem,9vw,7.25rem)] [--i:1]"
        />
        {hero.subhead && (
          <p
            className="enter mt-7 max-w-xl text-[1.08rem] leading-relaxed text-ink/85 md:text-lg"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            {hero.subhead}
          </p>
        )}
        <div className="enter mt-9" style={{ "--i": 3 } as React.CSSProperties}>
          <HeroActions />
        </div>
        <div
          className="enter mt-12 border-t border-ink/20 pt-5 md:mt-16"
          style={{ "--i": 4 } as React.CSSProperties}
        >
          <HeroFacts />
        </div>
      </div>
    </section>
  );
}

/** Split hero: headline on one side, photo or art on the other. Works well for light themes. */
function SplitHero() {
  const { hero } = site;
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="container-site grid items-center gap-10 py-12 md:py-16 lg:grid-cols-12 lg:gap-12 lg:py-20">
        <div className="lg:col-span-6">
          {hero.eyebrow && <p className="eyebrow enter">{hero.eyebrow}</p>}
          <Headline text={hero.headline} className="display enter mt-5 text-[clamp(2.75rem,7.5vw,5.75rem)]" />
          {hero.subhead && (
            <p
              className="enter mt-6 max-w-xl text-[1.08rem] leading-relaxed text-muted md:text-lg"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              {hero.subhead}
            </p>
          )}
          <div className="enter mt-8" style={{ "--i": 3 } as React.CSSProperties}>
            <HeroActions />
          </div>
          <div className="enter mt-10 border-t border-line pt-5" style={{ "--i": 4 } as React.CSSProperties}>
            <HeroFacts />
          </div>
        </div>
        <div className="enter-fade lg:col-span-6">
          <MediaFrame
            media={hero.media}
            fallbackArt="bowl"
            preload
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/3] w-full rounded-site-lg lg:aspect-[5/5.2]"
            artClassName="h-[58%] w-[58%]"
          />
        </div>
      </div>
    </section>
  );
}

export function Hero() {
  return site.theme.hero === "split" ? <SplitHero /> : <CinematicHero />;
}
