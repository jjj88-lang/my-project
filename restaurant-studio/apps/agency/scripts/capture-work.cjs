#!/usr/bin/env node
/**
 * Retakes every screenshot of the sample sites shown on /work and the home page.
 *
 *   node scripts/capture-work.cjs --hibana http://localhost:3001 --bulmat http://localhost:3002
 *   node scripts/capture-work.cjs --bulmat http://localhost:3002          (only Bulmat)
 *   node scripts/capture-work.cjs ... --out some/other/folder             (default: public/work)
 *
 * A sample given no URL is skipped, and its existing images are left alone. Start the samples
 * first (see apps/restaurant/README.md, "preview two clients side by side"), then run this, then
 * rebuild the agency site: the images are picked up at build time (src/lib/work/shots.ts).
 *
 * Output names are fixed, because the site looks for them by name:
 *   <demo>-home-desktop.png     1440 x 900
 *   <demo>-home-mobile.png      390 x 844 at 2x
 *   <demo>-menu-desktop.png     the /menu page, or the #menu section of a one-page site
 *   <demo>-menu-mobile.png
 *   hibana-catering-desktop.png, hibana-catering-mobile.png   the /catering page, at the form
 *   hibana-visit-mobile.png     the /contact page (hours and location)
 *
 * Uses the globally installed Playwright (do not npm-install it). Exits 1 if any shot failed.
 */
const fs = require("node:fs");
const path = require("node:path");

const { chromium } = require("playwright");

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/**
 * What to capture for each sample. `scrollTo` is a CSS selector brought to the top of the screen
 * before the shot; `offset` leaves a little room above it (and clears a sticky header).
 */
const PLANS = {
  hibana: [
    { name: "home", path: "/", devices: ["desktop", "mobile"] },
    { name: "menu", path: "/menu", devices: ["desktop", "mobile"] },
    { name: "catering", path: "/catering", devices: ["desktop"] },
    { name: "catering", path: "/catering", devices: ["mobile"], scrollTo: "main form", offset: 96 },
    { name: "visit", path: "/contact", devices: ["mobile"] },
  ],
  bulmat: [
    { name: "home", path: "/", devices: ["desktop", "mobile"] },
    { name: "menu", path: "/", devices: ["desktop", "mobile"], scrollTo: "#menu", offset: 0 },
  ],
};

function parseArgs(argv) {
  const options = { out: path.join(__dirname, "..", "public", "work"), urls: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === "--out" && value) {
      options.out = path.resolve(value);
      i += 1;
    } else if (arg.startsWith("--") && Object.hasOwn(PLANS, arg.slice(2)) && value && !value.startsWith("--")) {
      options.urls[arg.slice(2)] = value.replace(/\/+$/, "");
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown or incomplete option: ${arg}`);
    }
  }
  return options;
}

async function capture(browser, base, step, device, file) {
  const context = await browser.newContext({ ...(device === "mobile" ? MOBILE : DESKTOP), reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    const response = await page.goto(`${base}${step.path}`, { waitUntil: "networkidle", timeout: 30_000 });
    if (!response || !response.ok()) throw new Error(`HTTP ${response ? response.status() : "no response"}`);
    await page.evaluate(() => document.fonts.ready);
    if (step.scrollTo) {
      const found = await page.evaluate(
        ({ selector, offset }) => {
          const element = document.querySelector(selector);
          if (!element) return false;
          window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - offset, behavior: "instant" });
          return true;
        },
        { selector: step.scrollTo, offset: step.offset ?? 0 },
      );
      if (!found) throw new Error(`nothing matches ${step.scrollTo}`);
    }
    // Let lazy images and any scroll-linked header settle.
    await page.waitForTimeout(600);
    await page.evaluate(() =>
      Promise.all([...document.images].filter((image) => !image.complete).map((image) => image.decode().catch(() => {}))),
    );
    // Write next to the target and rename, so a failed shot never leaves half a file behind.
    const temporary = `${file}.tmp.png`;
    await page.screenshot({ path: temporary });
    fs.renameSync(temporary, file);
  } finally {
    await context.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const demos = Object.keys(options.urls);
  if (options.help || demos.length === 0) {
    console.log("Usage: node scripts/capture-work.cjs --hibana <url> --bulmat <url> [--out <folder>]");
    process.exit(options.help ? 0 : 1);
  }
  fs.mkdirSync(options.out, { recursive: true });

  const browser = await chromium.launch();
  let failures = 0;
  try {
    for (const demo of Object.keys(PLANS)) {
      const base = options.urls[demo];
      if (!base) {
        console.log(`- ${demo}: no URL given, skipped`);
        continue;
      }
      for (const step of PLANS[demo]) {
        for (const device of step.devices) {
          const file = path.join(options.out, `${demo}-${step.name}-${device}.png`);
          try {
            await capture(browser, base, step, device, file);
            console.log(`ok  ${path.relative(process.cwd(), file)}`);
          } catch (error) {
            failures += 1;
            console.log(`ERR ${demo}-${step.name}-${device}: ${error.message.split("\n")[0]}`);
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
  if (failures) {
    console.log(`\n${failures} shot(s) failed. Existing images with those names were left as they were.`);
    process.exit(1);
  }
  console.log("\nDone. Rebuild the site (npm run build) to pick up the new images.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
