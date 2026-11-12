import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { PageIntro } from "@/components/ui/PageIntro";
import { INQUIRY_REPLY_TIME } from "@/content/facts";
import { pricing } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { contactEmail, contactPhone } from "@/lib/studio";

export const metadata: Metadata = pageMetadata({
  title: "Thank you",
  description: "Your payment went through. Here is what happens next.",
  path: "/thanks",
  noindex: true,
});

export default function ThanksPage() {
  return (
    <>
      <PageIntro
        eyebrow="Payment received"
        title={
          <>
            Thank you. <em>We are on.</em>
          </>
        }
      >
        <p>
          Your payment went through on Stripe, and Stripe is emailing you a receipt. You do not need to do anything
          else on this page.
        </p>
      </PageIntro>

      <section className="pb-20 md:pb-28">
        <div className="shell grid gap-y-12 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-7">
            <p className="eyebrow">What happens next</p>
            <ol className="mt-5 border-t border-rule-strong">
              {[
                [
                  "If this was a deposit",
                  `I confirm it by email ${INQUIRY_REPLY_TIME} and we set the start date. If I still need materials from you, the email lists them.`,
                ],
                [
                  "If this was the balance",
                  `I put the approved site live on your domain and let you know as soon as it is up. The ${pricing.bugFixWindowDays}-day fix window starts on launch day.`,
                ],
                [
                  "If this was maintenance",
                  "Your plan is active. Send content changes whenever you need them, and I will take it from there.",
                ],
              ].map(([title, text], index) => (
                <li key={title} className="grid grid-cols-[2.25rem_1fr] gap-x-2 border-b border-rule py-5">
                  <span className="nums font-mono text-[0.76rem] font-medium text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="font-semibold">{title}</h2>
                    <p className="mt-1 text-ink-soft">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="grid content-start gap-6 lg:col-span-4 lg:col-start-9">
            <p className="text-ink-soft">
              Something look wrong with the payment? Tell me and I will sort it out.
            </p>
            <div className="flex flex-col gap-3">
              {contactEmail ? (
                <a href={`mailto:${contactEmail}`} className="btn btn-ghost">
                  <Icon name="mail" className="size-5" />
                  Email me
                </a>
              ) : null}
              {contactPhone ? <p className="nums font-mono">{contactPhone}</p> : null}
              <Link href="/" className="link-arrow min-h-11">
                Back to the home page
                <Icon name="arrow" className="size-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
