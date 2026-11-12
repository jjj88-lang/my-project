/**
 * Who the studio is. Read from src/content/studio.json, a copy of config/studio.json.
 *
 * Several values in that file are placeholders until the owner fills them in. This module never
 * lets a placeholder reach a visitor: an example.com address or an empty phone number is treated
 * as "not set", and pages are written to read naturally without it. `npm run preflight` lists
 * what is still missing.
 */
import studioJson from "@/content/studio.json";

type DemoEntry = { name: string; descriptor: string; plan: string; url: string };

type StudioFile = {
  name: string;
  nameIsTemporary: boolean;
  tagline: string;
  url: string;
  email: string;
  phone: string;
  mailingAddress: string;
  serviceAreas: string[];
  worksRemotely: boolean;
  founder: { name: string; role: string; story: string | string[] };
  legalReviewed: boolean;
  demos: Record<"hibana" | "bulmat", DemoEntry>;
};

export const studio: StudioFile = studioJson;

/** True for empty values and for the example.com / example.org stand-ins. */
export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value || !value.trim()) return true;
  return /(^|[/@.])example\.(com|org|net)\b/i.test(value) || /\bTODO\b/.test(value);
}

function real(value: string | undefined): string | undefined {
  return isPlaceholder(value) ? undefined : value!.trim();
}

/** The studio's public email, or undefined while it is still a placeholder. */
export const contactEmail = real(studio.email);

/** The studio's public phone number, or undefined while it is empty. */
export const contactPhone = real(studio.phone);

export const mailingAddress = real(studio.mailingAddress);

export const founderName = real(studio.founder.name);

/** The founder's story as paragraphs. Empty until the owner writes it. */
export const founderStory: string[] = (
  Array.isArray(studio.founder.story) ? studio.founder.story : studio.founder.story.split(/\n\s*\n/)
)
  .map((paragraph) => paragraph.trim())
  .filter((paragraph) => paragraph !== "" && !isPlaceholder(paragraph));

/** "tel:+17855550142" from "(785) 555-0142". Ten-digit numbers are assumed to be US numbers. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+1${digits}`;
  return `tel:+${digits}`;
}

/** "Topeka, Kansas and Ithaca, New York" */
export function listWithAnd(items: string[], separator = ", "): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(separator)}${separator}and ${items[items.length - 1]}`;
}

/** Service areas contain commas ("Topeka, Kansas"), so a longer list is separated with semicolons. */
export const serviceAreaText =
  studio.serviceAreas.length > 2 ? listWithAnd(studio.serviceAreas, "; ") : listWithAnd(studio.serviceAreas);

/** "Topeka" from "Topeka, Kansas". */
export const serviceCities = studio.serviceAreas.map((area) => area.split(",")[0].trim());

/**
 * Public address of this deployment, without a trailing slash. SITE_URL lets a preview or staging
 * deployment override studio.json.
 */
export const siteUrl = (process.env.SITE_URL?.trim() || studio.url).replace(/\/+$/, "");

/**
 * Search engines are kept out until the site has a real address. A site still pointing at
 * example.com is unfinished, and its canonical links would be wrong anyway.
 */
export const indexable = !isPlaceholder(siteUrl) && /^https:\/\//.test(siteUrl);
