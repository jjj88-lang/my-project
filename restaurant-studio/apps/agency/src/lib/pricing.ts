/**
 * Prices and package terms. Everything here is read from src/content/pricing.json, which is a
 * copy of config/pricing.json (kept identical by scripts/sync-shared.mjs at the repository root).
 * No price or package detail is written anywhere else on this site.
 */
import pricingJson from "@/content/pricing.json";

export const pricing = pricingJson;

export type PackageKey = keyof typeof pricing.packages;
export const PACKAGE_KEYS = Object.keys(pricing.packages) as PackageKey[];

export const starter = pricing.packages.starter;
export const premium = pricing.packages.premium;
export const catering = pricing.addons.catering;
export const maintenance = pricing.maintenance;

/** "$699", "$1,348", "$349.50". Cents are shown only when there are any. */
export function money(amount: number): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pricing.currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** The part of a price due before work starts, in dollars, rounded to the cent. */
export function depositOf(price: number): number {
  return Math.round(price * pricing.depositPercent) / 100;
}

/** The part of a price due at approval: whatever the deposit did not cover. */
export function balanceOf(price: number): number {
  return Math.round((price - depositOf(price)) * 100) / 100;
}

export type CheckLine = { name: string; price: number };

export type GuestCheck = {
  lines: CheckLine[];
  total: number;
  dueToStart: number;
  dueAtApproval: number;
  depositPercent: number;
  balancePercent: number;
  monthly: { name: string; price: number };
};

/** Totals for an example project, the way a guest check adds up a table. */
export function guestCheck(lines: CheckLine[]): GuestCheck {
  const total = lines.reduce((sum, line) => sum + line.price, 0);
  return {
    lines,
    total,
    dueToStart: depositOf(total),
    dueAtApproval: balanceOf(total),
    depositPercent: pricing.depositPercent,
    balancePercent: 100 - pricing.depositPercent,
    monthly: { name: maintenance.name, price: maintenance.pricePerMonth },
  };
}

/** The example used across the site: the larger package with the catering add-on. */
export const exampleCheck = guestCheck([
  { name: premium.name, price: premium.price },
  { name: catering.name, price: catering.price },
]);

const SMALL_NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** 2 -> "two". Numbers above twelve stay as digits, the way most style guides have it. */
export function inWords(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < SMALL_NUMBERS.length ? SMALL_NUMBERS[n] : String(n);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "5 to 7" when the packages differ, "5" when they match. */
export function draftDaysRange(): string {
  const days = PACKAGE_KEYS.map((key) => pricing.packages[key].firstDraftBusinessDays);
  const low = Math.min(...days);
  const high = Math.max(...days);
  return low === high ? String(low) : `${low} to ${high}`;
}

export const lowestPrice = Math.min(...PACKAGE_KEYS.map((key) => pricing.packages[key].price));
export const highestPrice = Math.max(...PACKAGE_KEYS.map((key) => pricing.packages[key].price));

const domainLine = pricing.notIncluded.find((line) => /domain/i.test(line));

/**
 * The domain fee as the price list words it, e.g. "about $12 to $20, paid by you to the registrar,
 * in your name". Taken from the "not included" list so the figure lives in one file only.
 */
export const domainFeeDetail: string | undefined = domainLine ? /\(([^)]+)\)/.exec(domainLine)?.[1] : undefined;

/** Just the amount, e.g. "about $12 to $20". */
export const domainFeeAmount: string | undefined = domainFeeDetail?.split(",")[0]?.trim();

/** The first sentence of a longer description, for places with room for one line. */
export function firstSentence(text: string): string {
  const match = /^(.*?[.!?])(\s|$)/.exec(text.trim());
  return match ? match[1] : text.trim();
}
