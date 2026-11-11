import type { MenuItem, SiteConfig } from "./schema";

type Address = SiteConfig["contact"]["address"];

/** "(785) 555-0142" -> "+17855550142" for tel: links. Assumes US numbers when 10 digits. */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:${digits}`;
}

export function addressLines(a: Address): [string, string] {
  const line1 = a.street2 ? `${a.street}, ${a.street2}` : a.street;
  return [line1, `${a.city}, ${a.region} ${a.postalCode}`];
}

export function addressOneLine(a: Address): string {
  return addressLines(a).join(", ");
}

/** Google Maps directions link built from the name and address (documented Maps URLs format). */
export function directionsUrl(site: Pick<SiteConfig, "name" | "contact">): string {
  const destination = `${site.name}, ${addressOneLine(site.contact.address)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function mapsUrl(site: Pick<SiteConfig, "name" | "contact">): string {
  if (site.contact.mapsUrl) return site.contact.mapsUrl;
  const query = `${site.name}, ${addressOneLine(site.contact.address)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** 12 -> "12", 12.5 -> "12.50". Menus read better without a currency symbol on every line. */
export function formatPrice(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function formatMoney(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

/** The lowest price of an item, for "from $X" labels and structured data. */
export function lowestPrice(item: Pick<MenuItem, "price" | "variants">): number | undefined {
  if (item.price !== undefined) return item.price;
  if (item.variants?.length) return Math.min(...item.variants.map((v) => v.price));
  return undefined;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
