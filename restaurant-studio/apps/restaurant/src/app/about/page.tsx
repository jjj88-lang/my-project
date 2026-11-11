import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/Icon";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { isPremium, site } from "@/lib/site";
import { pageMetadata, place } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Our Story",
  description: `The story behind ${site.name}, serving ${site.cuisines.join(", ").toLowerCase()} in ${place}.`,
  path: "/about",
});

export default function AboutPage() {
  const about = site.about;
  if (!isPremium || !about) notFound();

  return (
    <>
      <PageHeader eyebrow="Our story" title={about.heading} />
      <section className="py-16 md:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="prose-site max-w-[62ch] text-[1.08rem] leading-[1.85] text-muted lg:col-span-7">
            {about.body.map((p, i) => (
              <p key={i} className={i === 0 ? "text-ink" : ""}>
                {p}
              </p>
            ))}
            <p className="!mt-10">
              <Link href="/menu" className="link-arrow">
                See the menu
                <Icon name="arrow" className="size-4" />
              </Link>
            </p>
          </div>
          {about.media && (
            <div className="lg:col-span-4 lg:col-start-9">
              <MediaFrame media={about.media} sizes="(min-width: 1024px) 33vw, 100vw" className="aspect-[4/5] w-full max-lg:aspect-[16/10]" />
            </div>
          )}
        </div>

        {about.values.length > 0 && (
          <div className="container-site">
            <ul className="mt-16 grid gap-x-10 gap-y-8 md:mt-24 md:grid-cols-3">
              {about.values.map((v, i) => (
                <li key={v.title} className="border-t border-line pt-6">
                  <p className="nums text-xs font-semibold tracking-[0.2em] text-accent">{String(i + 1).padStart(2, "0")}</p>
                  <h2 className="display mt-3 text-[1.7rem]">{v.title}</h2>
                  <p className="mt-2 text-muted">{v.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
