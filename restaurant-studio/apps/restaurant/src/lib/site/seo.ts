import "server-only";

import type { Metadata } from "next";

import { addressOneLine, lowestPrice, telHref } from "./format";
import { openingHoursSpecification } from "./hours";
import { isPremium, menu, photo, site } from "./index";
import { reserveLink } from "./nav";

/** Public address of this deployment. SITE_URL lets a preview or staging deployment override site.json. */
export const siteUrl = (process.env.SITE_URL ?? site.url).replace(/\/+$/, "");

const { city, region } = site.contact.address;
export const place = `${city}, ${region}`;
const descriptor = site.descriptor ?? site.cuisines.join(" & ");
const sampleSuffix = site.sample ? " (Sample concept)" : "";

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} | ${descriptor} in ${place}${sampleSuffix}`,
    template: `%s | ${site.name}, ${city}${sampleSuffix}`,
  },
  description: site.description,
  applicationName: site.name,
  // Fictional demo sites must never show up in search results as if they were real restaurants.
  robots: site.sample ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_US",
    title: `${site.name} | ${descriptor} in ${place}`,
    description: site.description,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: true, address: true, email: true },
};

export function pageMetadata(page: { title: string; description: string; path: string }): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: { title: `${page.title} | ${site.name}`, description: page.description, url: page.path },
  };
}

/** schema.org Restaurant: what search engines and maps use for name, address, phone and hours. */
export function restaurantJsonLd() {
  const a = site.contact.address;
  const hero = photo(site.hero.media.image);
  const sameAs = Object.values(site.links.social).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${siteUrl}/#restaurant`,
    name: site.name,
    description: site.description,
    url: siteUrl,
    telephone: telHref(site.contact.phone).replace("tel:", ""),
    ...(site.contact.email ? { email: site.contact.email } : {}),
    ...(site.priceRange ? { priceRange: site.priceRange } : {}),
    servesCuisine: site.cuisines,
    address: {
      "@type": "PostalAddress",
      streetAddress: a.street2 ? `${a.street}, ${a.street2}` : a.street,
      addressLocality: a.city,
      addressRegion: a.region,
      postalCode: a.postalCode,
      addressCountry: a.country,
    },
    ...(site.contact.geo
      ? { geo: { "@type": "GeoCoordinates", latitude: site.contact.geo.lat, longitude: site.contact.geo.lng } }
      : {}),
    openingHoursSpecification: openingHoursSpecification(site.hours),
    menu: `${siteUrl}${isPremium ? "/menu" : "/#menu"}`,
    acceptsReservations: reserveLink ? (reserveLink.external ? reserveLink.href : true) : false,
    ...(hero ? { image: [`${siteUrl}${hero.src}`] } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** schema.org Menu with sections, items and prices. */
export function menuJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${siteUrl}/#menu`,
    name: `${site.name} menu`,
    inLanguage: "en",
    hasMenuSection: menu.sections.map((section) => ({
      "@type": "MenuSection",
      name: section.name,
      ...(section.description ? { description: section.description } : {}),
      hasMenuItem: section.items.map((item) => {
        const price = lowestPrice(item);
        return {
          "@type": "MenuItem",
          name: item.name,
          ...(item.description ? { description: item.description } : {}),
          ...(price !== undefined
            ? { offers: { "@type": "Offer", price: price.toFixed(2), priceCurrency: menu.currency } }
            : {}),
        };
      }),
    })),
  };
}

export function faqJsonLd() {
  if (site.faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: site.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export const fullAddress = addressOneLine(site.contact.address);
