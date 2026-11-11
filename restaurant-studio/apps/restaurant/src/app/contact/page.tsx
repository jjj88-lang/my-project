import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InquiryForm } from "@/components/forms/InquiryForm";
import { Visit } from "@/components/sections/Visit";
import { getFormDef } from "@/lib/forms/server";
import { isPremium, site } from "@/lib/site";
import { telHref } from "@/lib/site/format";
import { fullAddress, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Hours, Location & Contact",
  description: `Visit ${site.name} at ${fullAddress}. Hours, directions, parking, phone number and a contact form.`,
  path: "/contact",
});

export default function ContactPage() {
  if (!isPremium) notFound();
  const def = getFormDef("contact");

  return (
    <>
      <Visit headingLevel="h1" />
      {def && (
        <section className="border-t border-line bg-surface py-20 md:py-28" aria-labelledby="message-heading">
          <div className="container-site grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow">Write to us</p>
              <h2 id="message-heading" className="display mt-4 text-[clamp(2rem,4.4vw,3.5rem)]">
                Send a message
              </h2>
              <p className="mt-5 text-muted">
                Questions, feedback or a note for the kitchen. For a table tonight, calling is quickest.
              </p>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <InquiryForm
                def={def}
                timeZone={site.timezone}
                phone={site.contact.phone}
                phoneHref={telHref(site.contact.phone)}
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
