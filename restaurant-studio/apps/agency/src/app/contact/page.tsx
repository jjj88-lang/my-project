import type { Metadata } from "next";
import Link from "next/link";

import { LeadForm } from "@/components/forms/LeadForm";
import { Icon } from "@/components/ui/Icon";
import { PageIntro } from "@/components/ui/PageIntro";
import { FIRST_CALL_MINUTES, INQUIRY_REPLY_TIME } from "@/content/facts";
import { pageMetadata } from "@/lib/seo";
import { contactEmail, contactPhone, serviceAreaText, studio, telHref } from "@/lib/studio";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: `Ask for a free ${FIRST_CALL_MINUTES}-minute call about a website for your restaurant. ${studio.name} replies ${INQUIRY_REPLY_TIME}.`,
  path: "/contact",
});

const NEXT_STEPS = [
  `I read your request and look at your current site or listing on my own phone.`,
  `I reply ${INQUIRY_REPLY_TIME}, the way you asked me to, to set up a ${FIRST_CALL_MINUTES}-minute call.`,
  "On the call we talk about what you need. If it is a fit, you get a written quote and agreement. No pressure if it is not.",
];

export default function ContactPage() {
  const phoneHref = contactPhone ? telHref(contactPhone) : undefined;

  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title={
          <>
            Tell me about <em>your restaurant.</em>
          </>
        }
      >
        <p>
          A few details are enough to start. I will reply {INQUIRY_REPLY_TIME} to set up a free{" "}
          {FIRST_CALL_MINUTES}-minute call. You are not signing up for anything.
        </p>
      </PageIntro>

      <section className="pb-20 md:pb-28">
        <div className="shell grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-7">
            <div className="rounded-[0.6rem] border border-rule-strong bg-card px-5 py-7 sm:px-8 sm:py-9">
              <LeadForm email={contactEmail} phone={contactPhone} phoneHref={phoneHref} replyTime={INQUIRY_REPLY_TIME} />
            </div>
          </div>

          <aside className="grid content-start gap-12 lg:col-span-4 lg:col-start-9">
            <div>
              <p className="eyebrow">What happens next</p>
              <ol className="mt-5 grid gap-5">
                {NEXT_STEPS.map((step, index) => (
                  <li key={step} className="grid grid-cols-[2.25rem_1fr] border-t border-rule pt-4">
                    <span className="nums font-mono text-[0.76rem] font-medium text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-ink-soft">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {contactEmail || contactPhone ? (
              <div>
                <p className="eyebrow">Rather not use a form</p>
                <ul className="mt-5 grid gap-3">
                  {contactEmail ? (
                    <li>
                      <a href={`mailto:${contactEmail}`} className="link inline-flex min-h-11 items-center gap-3">
                        <Icon name="mail" className="size-5 shrink-0" />
                        {contactEmail}
                      </a>
                    </li>
                  ) : null}
                  {contactPhone && phoneHref ? (
                    <li>
                      <a href={phoneHref} className="link inline-flex min-h-11 items-center gap-3">
                        <Icon name="phone" className="size-5 shrink-0" />
                        {contactPhone}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <div className="border-l-2 border-accent pl-5">
              <p className="text-ink-soft">
                Working with restaurants in {serviceAreaText}
                {studio.worksRemotely ? ", and anywhere in the United States by phone and video" : ""}.
              </p>
              <p className="mt-4">
                <Link href="/services" className="link-arrow">
                  Prices and packages
                  <Icon name="arrow" className="size-4" />
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
