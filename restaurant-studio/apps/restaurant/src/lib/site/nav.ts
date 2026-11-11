import "server-only";

import { images } from "@/generated/client";

import { isPremium, site } from "./index";

export type NavItem = { label: string; href: string };

const hasGallery = site.gallery.images.some((g) => images[g.image]);

/** Primary navigation. Starter sites are one page, so their links are in-page anchors. */
export const navItems: NavItem[] = isPremium
  ? [
      { label: "Menu", href: "/menu" },
      ...(hasGallery ? [{ label: "Gallery", href: "/gallery" }] : []),
      ...(site.catering.enabled ? [{ label: "Catering", href: "/catering" }] : []),
      ...(site.about ? [{ label: "Our Story", href: "/about" }] : []),
      { label: "Visit", href: "/contact" },
    ]
  : [
      { label: "Menu", href: "/#menu" },
      ...(site.catering.enabled ? [{ label: "Catering", href: "/#catering" }] : []),
      { label: "Hours & Location", href: "/#visit" },
    ];

export const galleryEnabled = isPremium && hasGallery;

/** Every page that exists for this client, for the sitemap and the QA crawler. */
export const routes: string[] = isPremium
  ? [
      "/",
      "/menu",
      ...(hasGallery ? ["/gallery"] : []),
      ...(site.catering.enabled ? ["/catering"] : []),
      ...(site.about ? ["/about"] : []),
      "/contact",
    ]
  : ["/"];

export type ActionLink = { label: string; href: string; external: boolean };

/**
 * Ordering and reservation buttons. A real client's button opens their provider in a new tab.
 * A sample site has no provider, so it links to a page explaining what the button would do.
 * A real client with no link gets no button at all.
 */
function action(link: { url?: string; label?: string } | undefined, fallbackLabel: string, samplePath: string): ActionLink | undefined {
  if (link?.url) return { label: link.label ?? fallbackLabel, href: link.url, external: true };
  if (site.sample && link) return { label: link.label ?? fallbackLabel, href: samplePath, external: false };
  return undefined;
}

export const orderLink = action(site.links.order, "Order online", "/order");
export const reserveLink = action(site.links.reserve, "Reserve a table", "/reserve");
export const giftCardLink = site.links.giftCards?.url
  ? { label: site.links.giftCards.label ?? "Gift cards", href: site.links.giftCards.url, external: true }
  : undefined;
