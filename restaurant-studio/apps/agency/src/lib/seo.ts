import "server-only";

import type { Metadata } from "next";
import type { Route } from "next";

import { catering, highestPrice, lowestPrice, maintenance, money, premium, pricing, starter } from "@/lib/pricing";
import {
  contactEmail,
  contactPhone,
  founderName,
  indexable,
  serviceAreaText,
  siteUrl,
  studio,
  telHref,
} from "@/lib/studio";

export const siteDescription = `${studio.name} builds and looks after websites for independent restaurants: your real menu, hours, directions and ordering links, made for phones. From ${money(lowestPrice)}.`;

const follow = { index: true, follow: true } as const;
const hidden = { index: false, follow: false } as const;

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${studio.name} | ${studio.tagline}`,
    template: `%s | ${studio.name}`,
  },
  description: siteDescription,
  applicationName: studio.name,
  // Until the site has its real address, search engines are asked to stay away.
  robots: indexable ? follow : hidden,
  openGraph: {
    type: "website",
    siteName: studio.name,
    locale: "en_US",
    title: `${studio.name} | ${studio.tagline}`,
    description: siteDescription,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, address: false, email: false },
};

/** Title, description, canonical link and social card text for one page. */
export function pageMetadata(page: {
  title: string;
  description: string;
  path: Route;
  /** Pages such as /pay and /thanks that should never appear in search results. */
  noindex?: boolean;
}): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: { title: `${page.title} | ${studio.name}`, description: page.description, url: page.path },
    ...(page.noindex || !indexable ? { robots: hidden } : {}),
  };
}

function offer(name: string, description: string, price: number, extra: Record<string, unknown> = {}) {
  return {
    "@type": "Offer",
    name,
    description,
    price: price.toFixed(2),
    priceCurrency: pricing.currency,
    ...extra,
  };
}

/** schema.org ProfessionalService. Only facts from the two config files; placeholders are left out. */
export function studioJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${siteUrl}/#studio`,
    name: studio.name,
    description: siteDescription,
    url: siteUrl,
    slogan: studio.tagline,
    areaServed: studio.serviceAreas.map((area) => ({ "@type": "City", name: area })),
    priceRange: `${money(lowestPrice)} to ${money(highestPrice)}`,
    ...(contactEmail ? { email: contactEmail } : {}),
    ...(contactPhone ? { telephone: telHref(contactPhone).replace("tel:", "") } : {}),
    ...(founderName ? { founder: { "@type": "Person", name: founderName } } : {}),
    knowsAbout: ["Restaurant websites", "Online menus", "Catering inquiry forms"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Website services for restaurants",
      itemListElement: [
        offer(starter.name, starter.summary, starter.price),
        offer(premium.name, premium.summary, premium.price),
        offer(catering.name, catering.summary, catering.price),
        offer(maintenance.name, maintenance.summary, maintenance.pricePerMonth, {
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: maintenance.pricePerMonth.toFixed(2),
            priceCurrency: pricing.currency,
            unitCode: "MON",
          },
        }),
      ],
    },
  };
}

export function faqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export const serviceAreaLine = serviceAreaText;
