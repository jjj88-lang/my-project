import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { isPremium, menu, site } from "@/lib/site";
import { formatMoney, lowestPrice } from "@/lib/site/format";
import type { ArtMotif, MenuItem } from "@/lib/site/schema";

const FALLBACK_ART: ArtMotif[] = ["nigiri", "flame", "maki", "bowl"];

type Featured = { item: MenuItem; sectionName: string; sectionId: string };

function pickFeatured(): Featured[] {
  const all = menu.sections.flatMap((s) =>
    s.items.map((item) => ({ item, sectionName: s.name, sectionId: s.id })),
  );
  const marked = all.filter((f) => f.item.featured);
  return (marked.length > 0 ? marked : all).slice(0, 4);
}

/** A handful of dishes on the home page, taken from menu.json items marked "featured". */
export function Featured() {
  const items = pickFeatured();
  const menuHref = isPremium ? "/menu" : "/#menu";
  const { featured } = site;

  return (
    <section className="border-y border-line bg-surface py-20 md:py-28" aria-labelledby="featured-heading">
      <div className="container-site">
        <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            {featured.eyebrow && <p className="eyebrow">{featured.eyebrow}</p>}
            <h2 id="featured-heading" className="display mt-4 max-w-[20ch] text-[clamp(2rem,4.4vw,3.5rem)]">
              {featured.heading}
            </h2>
            {featured.intro && <p className="mt-4 max-w-xl text-muted">{featured.intro}</p>}
          </div>
          <Link href={menuHref} className="link-arrow shrink-0 self-start md:self-auto">
            See the full menu
            <Icon name="arrow" className="size-4" />
          </Link>
        </div>

        <ul className="-mx-[var(--gutter)] mt-12 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-5 overflow-x-auto px-[var(--gutter)] pb-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {items.map(({ item, sectionName, sectionId }, i) => {
            const price = lowestPrice(item);
            const href = isPremium ? `/menu#${sectionId}` : `/#${sectionId}`;
            return (
              <li key={`${sectionId}-${item.name}`} className="reveal w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto">
                <Link href={href} className="group block h-full">
                  <MediaFrame
                    media={item.media}
                    fallbackArt={FALLBACK_ART[i % FALLBACK_ART.length]}
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 46vw, 78vw"
                    className="aspect-[4/5] w-full transition-transform duration-700 ease-out group-hover:-translate-y-1"
                    artClassName="h-[58%] w-[58%]"
                  />
                  <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted">{sectionName}</p>
                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <h3 className="display text-[1.65rem] transition-colors group-hover:text-accent">{item.name}</h3>
                    {price !== undefined && (
                      <p className="nums shrink-0 font-semibold text-accent">
                        {item.variants ? <span className="sr-only">from </span> : null}
                        {formatMoney(price, menu.currency)}
                      </p>
                    )}
                  </div>
                  {item.description && <p className="mt-2 text-[0.95rem] text-muted">{item.description}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
