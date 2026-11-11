import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { isPremium, site } from "@/lib/site";

/** Home-page band pointing to catering and private events. */
export function CateringBand() {
  const { catering } = site;
  if (!catering.enabled) return null;
  const href = isPremium ? "/catering" : "/#catering";

  return (
    <section className="relative isolate overflow-hidden border-y border-line bg-surface" aria-labelledby="catering-band-heading">
      <div className="pattern-waves absolute inset-0 -z-10 opacity-[0.06]" aria-hidden="true" />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_90%_at_100%_50%,color-mix(in_srgb,var(--c-accent)_20%,transparent),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="container-site grid gap-10 py-20 md:py-28 lg:grid-cols-12 lg:items-center">
        <div className="reveal lg:col-span-6">
          <p className="eyebrow">
            Parties of {catering.minGuests} to {catering.maxGuests}
          </p>
          <h2 id="catering-band-heading" className="display mt-4 text-[clamp(2.2rem,5vw,4rem)]">
            {catering.heading}
          </h2>
          {catering.intro && <p className="mt-6 max-w-[54ch] text-[1.04rem] leading-[1.8] text-muted">{catering.intro}</p>}
          <Link href={href} className="btn btn-solid mt-9">
            Plan your event
            <Icon name="arrow" className="size-4" />
          </Link>
        </div>
        {catering.points.length > 0 && (
          <ul className="reveal grid gap-px overflow-hidden rounded-site border border-line bg-line lg:col-span-5 lg:col-start-8">
            {catering.points.map((point) => (
              <li key={point} className="flex items-start gap-4 bg-bg px-6 py-5">
                <Icon name="check" className="mt-1 size-4 text-accent" strokeWidth={2} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
