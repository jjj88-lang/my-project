/**
 * What the site under test is supposed to say. Read straight from the client's own files, so the
 * tests check the built site against its source of truth instead of against copied values.
 */
import fs from "node:fs";
import path from "node:path";

export const clientSlug = process.env.CLIENT ?? "hibana";
export const appDir = path.join(__dirname, "..", "..", "apps", "restaurant");
export const clientDir = path.join(appDir, "clients", clientSlug);

function readJson(file: string) {
  const full = path.join(clientDir, file);
  if (!fs.existsSync(full)) throw new Error(`No such client file: ${full}. Set CLIENT to a folder in apps/restaurant/clients.`);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw JSON, deliberately untyped here
export const site: any = readJson("site.json");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const menu: any = readJson("menu.json");

export const isPremium = site.plan === "premium";
export const isSample = site.sample === true;
export const cateringEnabled = site.catering?.enabled === true;
export const cateringFormEnabled = cateringEnabled && site.catering?.form === true;
export const contactFormEnabled = isPremium;

const imagesDir = path.join(clientDir, "images");
const imageExists = (name: string) => fs.existsSync(path.join(imagesDir, name));
export const galleryImages: Array<{ image: string; alt: string }> = (site.gallery?.images ?? []).filter(
  (g: { image: string }) => imageExists(g.image),
);
export const galleryEnabled = isPremium && galleryImages.length > 0;

/** The pages this client's plan includes. Mirrors apps/restaurant/src/lib/site/nav.ts. */
export const routes: string[] = isPremium
  ? [
      "/",
      "/menu",
      ...(galleryEnabled ? ["/gallery"] : []),
      ...(cateringEnabled ? ["/catering"] : []),
      ...(site.about ? ["/about"] : []),
      "/contact",
    ]
  : ["/"];

/** Pages that must not exist for this client (they belong to the other plan or to unused features). */
export const absentRoutes: string[] = ["/menu", "/gallery", "/catering", "/about", "/contact"].filter(
  (r) => !routes.includes(r),
);

export const menuPath = isPremium ? "/menu" : "/";
export const visitPath = isPremium ? "/contact" : "/";
export const cateringPath = isPremium ? "/catering" : "/";

export type MenuItem = {
  name: string;
  description?: string;
  price?: number;
  variants?: Array<{ label: string; price: number }>;
  priceText?: string;
  tags?: string[];
  featured?: boolean;
};
export const menuSections: Array<{ id: string; name: string; items: MenuItem[] }> = menu.sections;
export const menuItemCount = menuSections.reduce((n, s) => n + s.items.length, 0);

export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:${digits}`;
}

export function addressLines(): [string, string] {
  const a = site.contact.address;
  return [a.street2 ? `${a.street}, ${a.street2}` : a.street, `${a.city}, ${a.region} ${a.postalCode}`];
}

/** "16:30" -> "4:30 PM", as the site prints it. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** 8 -> "8", 8.5 -> "8.50", as the menu prints it. */
export function formatPrice(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** Today's date in the restaurant's time zone. */
export function todayLocal(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: site.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Where the "local" inbox driver writes during a QA run of a real (non-sample) client. */
export const localInboxDir = path.join(appDir, "data");

export function slugForFile(route: string): string {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
}
