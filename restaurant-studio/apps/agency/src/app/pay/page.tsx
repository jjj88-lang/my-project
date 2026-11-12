import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { PageIntro } from "@/components/ui/PageIntro";
import { balanceOf, catering, depositOf, maintenance, money, premium, pricing, starter } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { type StripeLink, type StripeLinkKey, resolveStripeLinks } from "@/lib/stripe-links";
import { contactEmail, contactPhone } from "@/lib/studio";

export const metadata: Metadata = pageMetadata({
  title: "Pay an invoice",
  description: "Secure payment links for clients with a signed project agreement. Card details are entered on Stripe.",
  path: "/pay",
  noindex: true,
});

type Row = { key: StripeLinkKey; label: string; amount: string };

const GROUPS: Array<{ title: string; rows: Row[] }> = [
  {
    title: starter.name,
    rows: [
      { key: "starterDeposit", label: "Deposit, to start", amount: money(depositOf(starter.price)) },
      { key: "starterBalance", label: "Balance, at approval", amount: money(balanceOf(starter.price)) },
    ],
  },
  {
    title: premium.name,
    rows: [
      { key: "premiumDeposit", label: "Deposit, to start", amount: money(depositOf(premium.price)) },
      { key: "premiumBalance", label: "Balance, at approval", amount: money(balanceOf(premium.price)) },
    ],
  },
  {
    title: catering.name,
    rows: [
      { key: "cateringDeposit", label: "Deposit, to start", amount: money(depositOf(catering.price)) },
      { key: "cateringBalance", label: "Balance, at approval", amount: money(balanceOf(catering.price)) },
    ],
  },
  {
    title: maintenance.name,
    rows: [{ key: "maintenance", label: "Monthly subscription", amount: `${money(maintenance.pricePerMonth)} a month` }],
  },
];

export default function PayPage() {
  const links = resolveStripeLinks();
  const groups = GROUPS.map((group) => ({
    ...group,
    rows: group.rows.filter((row) => links[row.key]),
  })).filter((group) => group.rows.length > 0);

  return (
    <>
      <PageIntro
        eyebrow="Payments"
        title={
          <>
            Pay an invoice, <em>securely.</em>
          </>
        }
      >
        <p>
          This page is for clients with a signed project agreement. Each button opens a payment page on Stripe,
          where you enter your card. Card details never reach this website, and no card fee is added.
        </p>
      </PageIntro>

      <section className="pb-20 md:pb-28">
        <div className="shell grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-7">
            {groups.length === 0 ? (
              <div className="border-t border-rule-strong pt-6">
                <h2 className="display display-sm">Your payment links come with your agreement.</h2>
                <p className="mt-4 text-ink-soft">
                  When we have agreed on a project, I send the secure Stripe links for your deposit and balance along
                  with the project agreement. If you are expecting one and cannot find it,{" "}
                  <Link href="/contact" className="link">
                    get in touch
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="grid gap-12">
                {groups.map((group) => (
                  <section key={group.title} aria-labelledby={`pay-${group.rows[0].key}`}>
                    <h2 id={`pay-${group.rows[0].key}`} className="display display-sm">
                      {group.title}
                    </h2>
                    <ul className="mt-4 border-t border-rule-strong">
                      {group.rows.map((row) => (
                        <PayRow key={row.key} row={row} link={links[row.key]!} />
                      ))}
                    </ul>
                  </section>
                ))}
                <p className="text-[0.95rem] text-ink-soft">
                  Only pay what your agreement or invoice asks for. If the amount looks different from what we agreed,
                  stop and ask me first.
                </p>
              </div>
            )}
          </div>

          <aside className="grid content-start gap-10 lg:col-span-4 lg:col-start-9">
            <div>
              <p className="eyebrow">How payment works</p>
              <ol className="mt-5 grid gap-4">
                {[
                  `${pricing.depositPercent}% deposit when you sign the agreement. Work starts once it arrives.`,
                  `The other ${100 - pricing.depositPercent}% when you approve the finished site, before it goes live.`,
                  `${money(maintenance.pricePerMonth)} a month if you choose maintenance, starting at launch. Cancel with ${maintenance.cancelNoticeDays} days notice.`,
                ].map((step, index) => (
                  <li key={step} className="grid grid-cols-[2.25rem_1fr] border-t border-rule pt-4">
                    <span className="nums font-mono text-[0.76rem] font-medium text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-ink-soft">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex gap-3 border-l-2 border-accent pl-5">
              <Icon name="lock" className="mt-1 size-5 shrink-0 text-accent" />
              <p className="text-ink-soft">
                Stripe sends you a receipt by email. Questions about a payment:{" "}
                {contactEmail ? (
                  <a href={`mailto:${contactEmail}`} className="link [overflow-wrap:anywhere]">
                    {contactEmail}
                  </a>
                ) : contactPhone ? (
                  contactPhone
                ) : (
                  <Link href="/contact" className="link">
                    the contact page
                  </Link>
                )}
                .
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function PayRow({ row, link }: { row: Row; link: StripeLink }) {
  return (
    <li className="flex flex-col gap-3 border-b border-rule py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{row.label}</p>
        <p className="nums font-mono text-[0.85rem] text-ink-soft">
          {row.amount}
          {link.testMode ? " · test mode, no real charge" : ""}
        </p>
      </div>
      <a href={link.url} className="btn btn-primary btn-sm" rel="noopener">
        Pay on Stripe
        <span className="sr-only">
          : {row.label.toLowerCase()}, {row.amount}
        </span>
        <Icon name="arrowUpRight" className="size-4" />
      </a>
    </li>
  );
}
