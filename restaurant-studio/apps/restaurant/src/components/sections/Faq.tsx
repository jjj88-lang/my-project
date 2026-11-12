import { site } from "@/lib/site";

/** Common questions, as native <details> elements: accessible and usable without JavaScript. */
export function Faq() {
  if (site.faq.length === 0) return null;
  return (
    <section className="border-t border-line py-20 md:py-28" aria-labelledby="faq-heading">
      <div className="container-site grid gap-10 lg:grid-cols-12">
        <div className="reveal lg:col-span-4">
          <p className="eyebrow">Good to know</p>
          <h2 id="faq-heading" className="display mt-4 text-[clamp(2rem,4.4vw,3.5rem)]">
            Questions guests ask
          </h2>
        </div>
        <div className="reveal border-t border-line lg:col-span-7 lg:col-start-6">
          {site.faq.map((item) => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.08rem] font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="relative size-4 shrink-0 before:absolute before:left-0 before:top-1/2 before:h-px before:w-full before:bg-accent after:absolute after:left-1/2 after:top-0 after:h-full after:w-px after:bg-accent after:transition-transform after:duration-300 group-open:after:rotate-90"
                />
              </summary>
              <p className="max-w-[60ch] pb-6 leading-[1.8] text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
