import type { Metadata } from "next";
import Link from "next/link";

import { LegalDoc } from "@/components/legal/LegalDoc";
import { pricing } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { studio } from "@/lib/studio";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  description: `The terms for using the ${studio.name} website. Paid work is covered by a separate signed agreement.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="Terms"
      title="Website terms"
      updated="November 12, 2026"
      intro={
        <p>
          These terms cover your use of this website. They are short because the site does little: it describes
          the studio&rsquo;s services and lets you ask for a call.
        </p>
      }
      sections={[
        {
          id: "agreement",
          title: "Paid work has its own agreement",
          body: (
            <p>
              Nothing on this website is a contract to build a site. Every project is covered by a separate written
              agreement that we both sign before any work or payment. That agreement sets out the scope, the price,
              the payment schedule, revisions, ownership and support. Where it differs from anything on this
              website, the signed agreement wins.
            </p>
          ),
        },
        {
          id: "prices",
          title: "Prices and descriptions",
          body: (
            <p>
              The prices on this site are in {pricing.currency === "USD" ? "US dollars" : pricing.currency} and are
              the current list prices. I keep them accurate, but they can change. The price in your signed agreement
              is the one that applies to your project. Descriptions of what a package includes are a summary; the
              agreement has the full detail.
            </p>
          ),
        },
        {
          id: "samples",
          title: "Sample sites",
          body: (
            <p>
              Hibana and Bulmat, shown on the{" "}
              <Link href="/work" className="link">
                work page
              </Link>
              , are fictional restaurants made to show what a finished site looks like. Their names, menus, addresses,
              phone numbers and prices are invented. Please do not try to visit, call or order from them.
            </p>
          ),
        },
        {
          id: "results",
          title: "No promised results",
          body: (
            <p>
              A good website makes your restaurant easier to find, read and reach. I do not promise any number of new
              customers, orders, sales or search rankings, and nothing on this site should be read as such a promise.
            </p>
          ),
        },
        {
          id: "payments",
          title: "Payments",
          body: (
            <p>
              Payments are made through Stripe-hosted payment pages, linked from the{" "}
              <Link href="/pay" className="link">
                payment page
              </Link>{" "}
              or sent with your agreement. Card details are entered on Stripe and never reach this website. Stripe&rsquo;s
              own terms apply to the payment itself.
            </p>
          ),
        },
        {
          id: "content",
          title: "Content on this site",
          body: (
            <p>
              The text, design and images on this website belong to {studio.name}, apart from the screenshots of
              sample sites, which are also the studio&rsquo;s own work. You are welcome to link to any page. Please do
              not copy the site or present it as your own.
            </p>
          ),
        },
        {
          id: "use",
          title: "Using the contact form",
          body: (
            <p>
              Please use the form only to ask about the studio&rsquo;s services. Automated submissions, spam and
              attempts to break or overload the site are not allowed, and the form limits how often it can be used.
            </p>
          ),
        },
        {
          id: "liability",
          title: "As is",
          body: (
            <p>
              This website is provided as it is, for general information. I work to keep it accurate and available
              but cannot guarantee that it is always error-free or online. To the extent the law allows, the studio
              is not liable for losses that come from using this website. This does not limit anything in a signed
              project agreement.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes and questions",
          body: (
            <p>
              These terms may be updated. The current version is always on this page, with the date at the top.
              Questions are welcome through the{" "}
              <Link href="/contact" className="link">
                contact page
              </Link>
              . The governing law and place for any dispute are set out in the signed project agreement.
            </p>
          ),
        },
      ]}
    />
  );
}
