import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { site } from "@/lib/site";

/** Alternating photo-and-text rows describing what the restaurant offers. */
export function Experiences() {
  if (site.experiences.length === 0) return null;
  return (
    <section className="py-20 md:py-28 lg:py-36" aria-label="What we offer">
      <div className="container-site grid gap-20 md:gap-28">
        {site.experiences.map((exp, i) => {
          const flip = i % 2 === 1;
          return (
            <article key={exp.title} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <div className={`reveal lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
                <MediaFrame
                  media={exp.media}
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="aspect-[16/11] w-full"
                  artClassName="h-[50%] w-[50%]"
                />
              </div>
              <div className={`reveal lg:col-span-5 ${flip ? "lg:order-1 lg:pr-6" : "lg:pl-6"}`}>
                <p className="flex items-center gap-4">
                  <span className="nums text-xs font-semibold tracking-[0.2em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px w-10 bg-accent/60" aria-hidden="true" />
                  {exp.eyebrow && <span className="eyebrow">{exp.eyebrow}</span>}
                </p>
                <h2 className="display mt-5 text-[clamp(2rem,4vw,3.25rem)]">{exp.title}</h2>
                <p className="mt-5 max-w-[52ch] text-[1.04rem] leading-[1.8] text-muted">{exp.body}</p>
                {exp.cta && (
                  <Link href={exp.cta.href} className="link-arrow mt-7">
                    {exp.cta.label}
                    <Icon name="arrow" className="size-4" />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
