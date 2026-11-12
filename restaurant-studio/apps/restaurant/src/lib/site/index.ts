/**
 * The active client's content, validated and typed.
 * Server-only: pass what a client component needs as props instead of importing this there.
 */
import "server-only";

import { clientSlug, images, rawCredits, rawMenu, rawSite } from "@/generated/client";

import { creditsSchema, menuSchema, siteSchema, type Media } from "./schema";
import { buildTheme } from "./theme";

export const slug = clientSlug;
export const site = siteSchema.parse(rawSite);
export const menu = menuSchema.parse(rawMenu);
export const credits = creditsSchema.parse(rawCredits);
export const theme = buildTheme(site.theme);

/** Look up a client photo by file name. Returns undefined when the slot has no photo yet. */
export function photo(name: string | undefined) {
  return name ? images[name] : undefined;
}

export function hasPhoto(media: Media | undefined): boolean {
  return Boolean(media?.image && images[media.image]);
}

export const isPremium = site.plan === "premium";
