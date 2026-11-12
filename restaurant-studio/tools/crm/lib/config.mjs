/**
 * Reads the shared price list and studio details (restaurant-studio/config) and turns them
 * into the few things the CRM tools need. Prices are never typed into these tools by hand.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** restaurant-studio/ */
export const STUDIO_ROOT = path.resolve(here, "..", "..", "..");

export function loadConfig(root = STUDIO_ROOT) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(root, "config", name), "utf8"));
  return { pricing: read("pricing.json"), studio: read("studio.json") };
}

/** 699 -> "$699", 349.5 -> "$349.50", 1348 -> "$1,348" */
export function money(amount) {
  const whole = Number.isInteger(amount);
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    })
  );
}

export const SMALL_FIX = "Small fix at the hourly rate";
export const NO_NEED = "Does not need us";

/**
 * The choices offered in the "Suggested package" dropdown, with the list price of each.
 * `price` is null where there is no fixed price.
 */
export function packageOptions(pricing) {
  const { starter, premium } = pricing.packages;
  const catering = pricing.addons.catering;
  return [
    { id: "starter", label: starter.name, price: starter.price },
    { id: "premium", label: premium.name, price: premium.price },
    { id: "starter+catering", label: `${starter.name} + ${catering.name}`, price: starter.price + catering.price },
    { id: "premium+catering", label: `${premium.name} + ${catering.name}`, price: premium.price + catering.price },
    { id: "small-fix", label: SMALL_FIX, price: null },
    { id: "no-need", label: NO_NEED, price: null },
  ];
}

/**
 * Maps the free text a researcher wrote (for example "premium + catering inquiry automation")
 * onto one of the package options. Returns null when the text names neither package.
 */
export function matchPackage(text, pricing) {
  const value = String(text || "").toLowerCase();
  const base = value.includes("premium") ? "premium" : value.includes("starter") ? "starter" : null;
  if (!base) return null;
  const id = value.includes("catering") ? `${base}+catering` : base;
  return packageOptions(pricing).find((option) => option.id === id) || null;
}

/** Deposit and balance for a one-time price, from the deposit percentage in the price list. */
export function paymentSplit(price, pricing) {
  const deposit = Math.round(price * pricing.depositPercent) / 100;
  return { deposit, balance: Math.round((price - deposit) * 100) / 100 };
}
