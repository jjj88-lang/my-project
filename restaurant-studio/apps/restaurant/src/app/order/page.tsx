import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SamplePlaceholder } from "@/components/sections/SamplePlaceholder";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Online Ordering",
  robots: { index: false, follow: false },
};

export default function OrderPage() {
  // Real clients link straight to their ordering provider, so this page exists only on sample sites.
  if (!site.sample || site.links.order?.url) notFound();
  return (
    <SamplePlaceholder
      icon="bag"
      title="This is where online ordering opens."
      lead="On a live restaurant's site, the Order button takes guests straight to the ordering system the restaurant already uses, in one tap. Orders, payments and pickup times stay exactly where the kitchen expects them."
      providers={["Toast", "Square Online", "Clover", "ChowNow", "DoorDash Storefront", "Owner.com", "Menufy", "A phone number"]}
      note="No new ordering software, no commission added by the website, and nothing for staff to learn. If a restaurant does not take online orders yet, the button simply is not shown."
    />
  );
}
