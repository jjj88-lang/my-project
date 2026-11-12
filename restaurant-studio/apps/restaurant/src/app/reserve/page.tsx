import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SamplePlaceholder } from "@/components/sections/SamplePlaceholder";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reservations",
  robots: { index: false, follow: false },
};

export default function ReservePage() {
  if (!site.sample || !site.links.reserve || site.links.reserve.url) notFound();
  return (
    <SamplePlaceholder
      icon="calendar"
      title="This is where reservations open."
      lead="On a live restaurant's site, the Reserve button opens the booking system the restaurant already uses, so the host stand keeps one book and nobody is double-seated."
      providers={["OpenTable", "Resy", "Tock", "Yelp Reservations", "Toast Tables", "SevenRooms", "A phone number"]}
      note="The website never confirms a table by itself. Bookings are made in the restaurant's own system, or by phone if that is how the restaurant prefers to take them."
    />
  );
}
