import { MediaFrame } from "@/components/ui/MediaFrame";
import { site } from "@/lib/site";

export function Intro() {
  const { intro } = site;
  return (
    <section className="py-20 md:py-28 lg:py-36" aria-labelledby="intro-heading">
      <div className="container-site">
        {intro.media ? (
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="reveal lg:col-span-7">
              {intro.eyebrow && <p className="eyebrow">{intro.eyebrow}</p>}
              <h2 id="intro-heading" className="display mt-5 max-w-[18ch] text-[clamp(2.2rem,5.2vw,4.25rem)]">
                {intro.heading}
              </h2>
              <div className="prose-site mt-8 max-w-[58ch] text-[1.06rem] leading-[1.8] text-muted">
                {intro.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
            <div className="reveal lg:col-span-4 lg:col-start-9">
              <MediaFrame
                media={intro.media}
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="aspect-[4/5] w-full max-lg:aspect-[16/10]"
              />
            </div>
          </div>
        ) : (
          // No photo: the heading and the text share the row, so the section never has an empty half.
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="reveal lg:col-span-6">
              {intro.eyebrow && <p className="eyebrow">{intro.eyebrow}</p>}
              <h2 id="intro-heading" className="display mt-5 max-w-[16ch] text-[clamp(2.2rem,5.2vw,4.25rem)]">
                {intro.heading}
              </h2>
            </div>
            <div className="prose-site reveal text-[1.06rem] leading-[1.8] text-muted lg:col-span-5 lg:col-start-8 lg:pt-10">
              {intro.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}

        {intro.highlights.length > 0 && (
          <ul className="mt-16 grid gap-x-10 gap-y-8 md:mt-24 md:grid-cols-3">
            {intro.highlights.map((h, i) => (
              <li key={h.title} className="reveal border-t border-line pt-6">
                <p className="nums text-xs font-semibold tracking-[0.2em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="display mt-3 text-[1.7rem]">{h.title}</h3>
                <p className="mt-2 text-muted">{h.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
