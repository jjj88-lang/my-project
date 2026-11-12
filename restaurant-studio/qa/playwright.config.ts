import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "playwright/test";

/**
 * QA for one client site.
 *
 *   CLIENT=hibana npm run qa
 *
 * By default this builds that client into its own folder, starts it on a spare port, runs every
 * check on a desktop and a phone-size browser, and writes a report to reports/<client>/.
 * To test a site that is already running (a preview deployment, for example):
 *
 *   CLIENT=hibana QA_BASE_URL=https://preview.example.com npm run qa
 */
const client = process.env.CLIENT ?? "hibana";
const port = Number(process.env.QA_PORT ?? 3210);
const external = process.env.QA_BASE_URL;
const baseURL = external ?? `http://localhost:${port}`;
const appDir = path.join(__dirname, "..", "apps", "restaurant");

const siteFile = path.join(appDir, "clients", client, "site.json");
const sample = fs.existsSync(siteFile) ? JSON.parse(fs.readFileSync(siteFile, "utf8")).sample === true : false;

export default defineConfig({
  testDir: "./tests",
  outputDir: `./reports/${client}/artifacts`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: `reports/${client}/html`, open: "never" }],
    ["json", { outputFile: `reports/${client}/results.json` }],
  ],
  use: {
    baseURL,
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "off",
  },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "phone",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      },
    },
  ],
  webServer: external
    ? undefined
    : {
        command: "npm run build && npx next start",
        cwd: appDir,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 300_000,
        stdout: "ignore",
        stderr: "pipe",
        env: {
          CLIENT: client,
          PORT: String(port),
          // Its own build folder, so a QA run never disturbs a preview that is already running.
          NEXT_DIST_DIR: `.next-qa-${client}`,
          // Sample sites show previews. Real clients are exercised end to end against local files,
          // so a QA run can never write to a restaurant's live spreadsheet or email its customers.
          INBOX_DRIVER: sample ? "demo" : "local",
        },
      },
});
