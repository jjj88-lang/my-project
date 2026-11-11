import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CateringSection } from "@/components/sections/CateringSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { isPremium, site } from "@/lib/site";
import { pageMetadata, place } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Catering & Private Events",
  description: `Catering and private events from ${site.name} in ${place}, for ${site.catering.minGuests} to ${site.catering.maxGuests} guests. Send your date and headcount for a quote.`,
  path: "/catering",
});

export default function CateringPage() {
  if (!isPremium || !site.catering.enabled) notFound();
  return (
    <>
      <PageHeader eyebrow="Catering" title={site.catering.heading} intro={site.catering.intro} />
      <CateringSection standalone />
    </>
  );
}
