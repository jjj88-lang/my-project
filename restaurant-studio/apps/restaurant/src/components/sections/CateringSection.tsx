import { InquiryForm } from "@/components/forms/InquiryForm";
import { Icon } from "@/components/ui/Icon";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { cateringFormEnabled, getFormDef } from "@/lib/forms/server";
import { site } from "@/lib/site";
import { telHref } from "@/lib/site/format";

const FORM_STEPS = [
  { title: "Tell us about your event", text: "The date, the headcount and what you have in mind. It takes about two minutes." },
  { title: "We get back to you", text: "A person, not a robot, reviews your request and contacts you with options and a quote." },
  { title: "You confirm", text: "Nothing is booked until you and the restaurant have agreed on the details." },
];

const PHONE_STEPS = [
  { title: "Call or email us", text: "Tell us the date, the headcount and what you have in mind." },
  { title: "We talk it through", text: "We go over the options with you and put together a quote." },
  { title: "You confirm", text: "Nothing is booked until you and the restaurant have agreed on the details." },
];

/**
 * Catering details plus either the inquiry form (when the client has the automation add-on)
 * or plain contact details. Used as the body of /catering and as a section on one-page sites.
 */
export function CateringSection({ standalone = false }: { standalone?: boolean }) {
  const { catering } = site;
  if (!catering.enabled) return null;
  const def = cateringFormEnabled ? getFormDef("catering") : undefined;
  const phoneHref = telHref(site.contact.phone);
  const steps = def ? FORM_STEPS : PHONE_STEPS;
  // On its own page this sits directly under the page title, so its headings are one level higher.
  const Sub = standalone ? "h2" : "h3";

  return (
    <section id="catering" className={standalone ? "py-16 md:py-24" : "border-t border-line py-20 md:py-28"} aria-labelledby={standalone ? undefined : "catering-heading"}>
      <div className="container-site grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          {!standalone && (
            <>
              <p className="eyebrow">Catering</p>
              <h2 id="catering-heading" className="display mt-4 text-[clamp(2.2rem,5vw,4rem)]">
                {catering.heading}
              </h2>
              {catering.intro && <p className="mt-6 text-[1.04rem] leading-[1.8] text-muted">{catering.intro}</p>}
            </>
          )}

          {catering.media && (
            <MediaFrame
              media={catering.media}
              sizes="(min-width: 1024px) 40vw, 100vw"
              className={`aspect-[16/10] w-full ${standalone ? "" : "mt-10"}`}
              artClassName="h-[56%] w-[56%]"
            />
          )}

          {catering.points.length > 0 && (
            <>
              <Sub className="eyebrow mt-10">What we can do</Sub>
              <ul className="mt-4 grid gap-3">
                {catering.points.map((point) => (
                  <li key={point} className="flex items-start gap-3.5">
                    <Icon name="check" className="mt-1 size-4 text-accent" strokeWidth={2} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <Sub className="eyebrow mt-10">How it works</Sub>
          <ol className="mt-4 grid gap-5">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="nums mt-0.5 text-xs font-semibold tracking-[0.2em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-semibold">{step.title}</span>
                  <span className="mt-1 block text-[0.95rem] text-muted">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-site-lg border border-line bg-surface p-6 md:p-10">
            {def ? (
              <>
                <Sub className="display text-[1.9rem]">Request a quote</Sub>
                <p className="mt-2 text-muted">
                  For {catering.minGuests} to {catering.maxGuests} guests. We reply to every request personally.
                </p>
                <div className="mt-6">
                  <InquiryForm def={def} timeZone={site.timezone} phone={site.contact.phone} phoneHref={phoneHref} />
                </div>
              </>
            ) : (
              <>
                <Sub className="display text-[1.9rem]">Let&apos;s plan it together</Sub>
                <p className="mt-3 max-w-[52ch] text-muted">
                  Call us with your date and headcount, and we will walk you through the options and put together a
                  quote. Nothing is booked until you have confirmed the details with us.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a href={phoneHref} className="btn btn-solid">
                    <Icon name="phone" className="size-4" />
                    <span className="nums">Call {site.contact.phone}</span>
                  </a>
                  {site.contact.email && (
                    <a href={`mailto:${site.contact.email}?subject=${encodeURIComponent("Catering inquiry")}`} className="btn btn-ghost">
                      <Icon name="mail" className="size-4" />
                      Email us
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
