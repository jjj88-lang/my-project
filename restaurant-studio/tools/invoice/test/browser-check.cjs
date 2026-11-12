#!/usr/bin/env node
/*
 * Opens invoice.html from the file system in headless Chromium, fills an example,
 * checks the totals in every mode, checks that no network request is made, and saves
 * a screenshot and a one-page PDF.
 *
 *   node test/browser-check.cjs [output-dir]     (default: a new folder in the system temp dir)
 *
 * Uses the globally installed Playwright (require('playwright')). Nothing is installed.
 */
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const file = path.join(__dirname, "..", "invoice.html");
const outDir = process.argv[2] ? path.resolve(process.argv[2]) : fs.mkdtempSync(path.join(os.tmpdir(), "invoice-check-"));
fs.mkdirSync(outDir, { recursive: true });

let failures = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const external = [];
  const errors = [];
  page.on("request", (r) => { if (!r.url().startsWith("file:")) external.push(r.url()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(pathToFileURL(file).href);
  const text = (sel) => page.locator(sel).innerText();

  // Example data (fictional).
  await page.fill("#docNumber", "2026-014");
  await page.fill("#docDate", "2026-11-12");
  await page.fill("#dueDate", "2026-11-19");
  await page.fill("#studioEmail", "owner@studio.test");
  await page.fill("#clientBusiness", "Sample Concept Kitchen");
  await page.fill("#clientContact", "Alex Example");
  await page.fill("#clientEmail", "alex@restaurant.test");
  await page.fill("#clientAddress", "100 Example Street, Topeka, KS");
  await page.fill("#payLink", "https://buy.stripe.com/test_example123");
  await page.fill("#notes", "Deposit for the Starter Website and the catering add-on.");

  await page.click('[data-preset="starter"]');
  await page.click('[data-preset="catering"]');
  await page.click('[data-preset="maintenance"]');

  // Deposit (default mode)
  check("project total", await text("#total"), "$1,048.00");
  check("deposit", await text("#deposit"), "$524.00");
  check("balance", await text("#balance"), "$524.00");
  check("amount due, deposit", await text("#amount-due"), "$524.00");
  check("monthly note shown", await page.locator("#monthly-note").isVisible(), true);
  check("monthly not in total", (await text("#monthly-note")).includes("$59.00 a month"), true);
  check("payment link shown as text", await text("#pPayLink"), "https://buy.stripe.com/test_example123");
  check("payment link href", await page.getAttribute("#pPayLink", "href"), "https://buy.stripe.com/test_example123");

  await page.check('input[name=mode][value=balance]');
  check("amount due, balance", await text("#amount-due"), "$524.00");
  await page.check('input[name=mode][value=full]');
  check("amount due, full", await text("#amount-due"), "$1,048.00");

  // A free line: 1.5 hours of extra work at $60, and an odd-cent line to test the split.
  await page.click("#addFree");
  const last = page.locator("#lines .line").last();
  await last.locator(".desc").fill("Extra work: holiday menu page (1.5 hours)");
  await last.locator(".qty").fill("1.5");
  await last.locator(".price").fill("60");
  check("full with free line", await text("#amount-due"), "$1,138.00");
  await page.check('input[name=mode][value=deposit]');
  check("deposit with free line", await text("#amount-due"), "$569.00");

  const split = await page.evaluate(() => {
    const t = window.__invoice.computeTotals([{ cents: 33333, recurring: false }, { cents: 101, recurring: false }]);
    return t.deposit + t.balance === t.total && t.deposit === 16667 + 51;
  });
  check("odd cents: deposit + balance = total", split, true);

  // Remove the free line again for the saved example, and switch to a receipt and back.
  await last.locator(".remove").click();
  await page.selectOption("#docType", "receipt");
  check("receipt title", await text("#pDocTitle"), "RECEIPT");
  check("receipt label", (await text("#dueLabel")).startsWith("Amount paid"), true);
  await page.selectOption("#docType", "invoice");

  await page.screenshot({ path: path.join(outDir, "invoice-screen.png"), fullPage: true });
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: path.join(outDir, "invoice-print.png"), fullPage: true });
  await page.pdf({ path: path.join(outDir, "invoice.pdf"), format: "Letter", preferCSSPageSize: true, printBackground: true });

  const pdf = fs.readFileSync(path.join(outDir, "invoice.pdf"), "latin1");
  const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  check("PDF is one page", pages, 1);
  check("no network requests", external.length, 0);
  check("no page errors", errors.length, 0);

  await browser.close();
  console.log(`\nSaved to ${outDir}`);
  if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
  console.log("All browser checks passed.");
})().catch((e) => { console.error(e); process.exit(1); });
