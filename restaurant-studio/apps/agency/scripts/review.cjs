#!/usr/bin/env node
/**
 * A look at the running site while building it: screenshots plus the checks a person forgets.
 *
 *   node scripts/review.cjs [--base http://localhost:3100] [--out .review] [--widths 360,768,1024]
 *                           [--axe] [--motion] / /services ...
 *
 * For each path, at desktop (1440 x 900) and phone (390 x 844, touch) size, or at the widths
 * given with --widths (anything under 768 is treated as a phone), it
 *   - saves a full-page screenshot to <out>/<name>-<desktop|mobile>.png
 *   - reports horizontal overflow, console errors, failed requests, broken images
 *     and tap targets smaller than 44 px (phone only)
 *   - with --axe, runs axe-core and lists every violation with its impact
 *
 * Screenshots are taken with reduced motion, because the scroll reveals would otherwise leave
 * everything below the first screen invisible in a full-page capture. Pass --motion to see the
 * page the way a visitor without that preference does (first screen only).
 *
 * Uses the globally installed Playwright. Exits 1 if anything was reported.
 */
const fs = require("node:fs");
const path = require("node:path");

const { chromium } = require("playwright");

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const [, value] = args.splice(index, 2);
  return value;
}
function flag(name) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

const base = option("base", "http://localhost:3100").replace(/\/+$/, "");
const outDir = path.resolve(option("out", ".review"));
const withAxe = flag("axe");
const withMotion = flag("motion");
const widths = option("widths", "");
const paths = args.length > 0 ? args : ["/"];

const DEFAULT_SIZES = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

const SIZES = widths
  ? widths.split(",").map((value) => {
      const width = Number(value);
      const phone = width < 768;
      return {
        name: `w${width}`,
        viewport: { width, height: phone ? 844 : 900 },
        deviceScaleFactor: phone ? 2 : 1,
        isMobile: phone,
        hasTouch: phone,
      };
    })
  : DEFAULT_SIZES;

function fileName(route) {
  const clean = route.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-");
  return clean || "home";
}

/** Runs in the page. Returns what looks wrong, as short strings. */
function inspectPage(checkTapTargets) {
  const problems = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) {
    problems.push(`horizontal overflow: page is ${doc.scrollWidth}px wide in a ${doc.clientWidth}px window`);
    // Name the widest offenders so the cause is easy to find.
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.right > doc.clientWidth + 1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`);
    if (wide.length > 0) problems.push(`  elements past the right edge: ${wide.join(", ")}`);
  }
  for (const img of document.images) {
    if (img.complete && img.naturalWidth === 0) problems.push(`broken image: ${img.currentSrc || img.src}`);
  }
  if (checkTapTargets) {
    const small = [];
    for (const el of document.querySelectorAll("a[href], button, select, input:not([type=hidden]), textarea, summary")) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden") continue;
      if (el.closest("[aria-hidden=true], dialog:not([open]), .hp-field")) continue;
      // A radio or checkbox inside a label is tapped through the label.
      const target = el.matches("input[type=radio], input[type=checkbox]") ? (el.closest("label") ?? el) : el;
      const box = target.getBoundingClientRect();
      // Links inside a paragraph are exempt in WCAG 2.5.8; everything else should reach 44 px.
      const inline = style.display === "inline" && el.tagName === "A";
      if (!inline && (box.height < 43.5 || box.width < 43.5)) {
        small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
    }
    if (small.length > 0) problems.push(`tap targets under 44px: ${small.slice(0, 8).join("; ")}${small.length > 8 ? ` (+${small.length - 8} more)` : ""}`);
  }
  return problems;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  let reported = 0;

  for (const size of SIZES) {
    const context = await browser.newContext({
      viewport: size.viewport,
      deviceScaleFactor: size.deviceScaleFactor,
      isMobile: size.isMobile,
      hasTouch: size.hasTouch,
      reducedMotion: withMotion ? "no-preference" : "reduce",
    });
    for (const route of paths) {
      const page = await context.newPage();
      const problems = [];
      page.on("console", (message) => {
        // A failed request is already reported with its address by the handlers below.
        if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
          problems.push(`console error: ${message.text().slice(0, 200)}`);
        }
      });
      page.on("pageerror", (error) => problems.push(`page error: ${String(error).slice(0, 200)}`));
      // Link prefetches carry a ?_rsc= marker and are cancelled freely by the browser: a cancelled
      // one is not a problem, and one that fails is reported once under the page's own address.
      const address = (url) => url.replace(/[?&]_rsc=[^&]*/, "");
      page.on("requestfailed", (request) => {
        if (request.failure()?.errorText === "net::ERR_ABORTED") return;
        problems.push(`request failed: ${address(request.url())}`);
      });
      page.on("response", (response) => {
        if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${address(response.url())}`);
      });

      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // Lazy images load as they come into view: walk down the page once, then return to the top.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(250);

      problems.push(...(await page.evaluate(inspectPage, size.isMobile)));

      if (withAxe) {
        await page.addScriptTag({ path: require.resolve("axe-core") });
        const results = await page.evaluate(() => window.axe.run());
        for (const violation of results.violations) {
          const where = violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ");
          problems.push(`axe ${violation.impact}: ${violation.id} (${violation.nodes.length}) ${where}`);
        }
      }

      const file = path.join(outDir, `${fileName(route)}-${size.name}.png`);
      await page.screenshot({ path: file, fullPage: !withMotion });

      const label = `${route} @ ${size.name}`;
      if (problems.length === 0) {
        console.log(`ok    ${label}`);
      } else {
        reported += problems.length;
        console.log(`CHECK ${label}`);
        for (const problem of [...new Set(problems)]) console.log(`      ${problem}`);
      }
      await page.close();
    }
    await context.close();
  }

  await browser.close();
  console.log(`\nScreenshots: ${path.relative(process.cwd(), outDir) || "."}/`);
  if (reported > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
