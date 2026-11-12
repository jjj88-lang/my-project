#!/usr/bin/env node
/**
 * Re-embeds the price presets from config/pricing.json (and the studio details from
 * config/studio.json) into invoice.html, so the invoice stays a single file with no network.
 *
 *   node build.mjs           rewrite the embedded block in invoice.html
 *   node build.mjs --check   exit 1 if invoice.html is out of date (changes nothing)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, "..", "..");
export const HTML_PATH = join(here, "invoice.html");

const BLOCK = /(<script id="presets" type="application\/json">)([\s\S]*?)(<\/script>)/;

const dollarsToCents = (d) => Math.round(Number(d) * 100);

/** A placeholder such as hello@example.com is treated as empty, so the invoice asks for it. */
const real = (v) => (typeof v === "string" && v.trim() && !/example\.com/i.test(v) ? v.trim() : "");

/** Pure: config objects in, the presets object embedded in the HTML out. */
export function buildPresets(pricing, studio) {
  const { packages, addons, maintenance } = pricing;
  const items = [
    { key: "starter", name: packages.starter.name, unitCents: dollarsToCents(packages.starter.price), recurring: false },
    { key: "premium", name: packages.premium.name, unitCents: dollarsToCents(packages.premium.price), recurring: false },
    { key: "catering", name: addons.catering.name, unitCents: dollarsToCents(addons.catering.price), recurring: false },
    { key: "maintenance", name: maintenance.name, unitCents: dollarsToCents(maintenance.pricePerMonth), recurring: true },
    { key: "hourly", name: "Work outside the agreed scope (per hour)", unitCents: dollarsToCents(pricing.hourlyRate), recurring: false },
  ];
  return {
    generatedFrom: "config/pricing.json and config/studio.json",
    currency: pricing.currency,
    depositPercent: pricing.depositPercent,
    hourlyRate: pricing.hourlyRate,
    revisionRounds: packages.starter.revisionRounds,
    bugFixWindowDays: pricing.bugFixWindowDays,
    cancelNoticeDays: maintenance.cancelNoticeDays,
    studio: {
      name: real(studio.name),
      email: real(studio.email),
      phone: real(studio.phone),
      url: real(studio.url),
      mailingAddress: real(studio.mailingAddress),
    },
    items,
  };
}

export function readConfig(root = ROOT) {
  const read = (f) => JSON.parse(readFileSync(join(root, "config", f), "utf8"));
  return { pricing: read("pricing.json"), studio: read("studio.json") };
}

export function readEmbedded(html) {
  const m = html.match(BLOCK);
  if (!m) throw new Error('invoice.html has no <script id="presets" type="application/json"> block');
  return JSON.parse(m[2]);
}

export function embed(html, presets) {
  if (!BLOCK.test(html)) throw new Error("presets block not found");
  const json = "\n" + JSON.stringify(presets, null, 2).replace(/</g, "\\u003c") + "\n";
  return html.replace(BLOCK, (_, open, _old, close) => open + json + close);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { pricing, studio } = readConfig();
  const presets = buildPresets(pricing, studio);
  const html = readFileSync(HTML_PATH, "utf8");
  const next = embed(html, presets);
  if (process.argv.includes("--check")) {
    if (next !== html) {
      console.error("invoice.html is out of date. Run: node tools/invoice/build.mjs");
      process.exit(1);
    }
    console.log("invoice.html presets match config.");
  } else if (next === html) {
    console.log("invoice.html already up to date.");
  } else {
    writeFileSync(HTML_PATH, next);
    console.log("invoice.html presets updated from config.");
  }
}
