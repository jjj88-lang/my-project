import fs from "node:fs";
import path from "node:path";

import { expect, test as base, type Page } from "playwright/test";

type Problems = {
  consoleErrors: string[];
  pageErrors: string[];
  badResponses: string[];
  /** Patterns for problems a test causes on purpose (for example a 404 it asks for). */
  allow: RegExp[];
};

/**
 * Every test watches the page for trouble a visitor would never report but would suffer from:
 * script errors, console errors and same-site requests that fail. Any of them fails the test.
 */
let visitors = 0;

/** A different made-up visitor address for every test, so one test's requests never count against another's rate limit. */
export function nextVisitor(testInfo: { workerIndex: number; project: { name: string } }): string {
  visitors += 1;
  return `10.${testInfo.project.name === "phone" ? 2 : 1}.${testInfo.workerIndex % 250}.${(visitors % 250) + 1}`;
}

export const test = base.extend<{ problems: Problems }>({
  problems: [
    async ({ page, baseURL }, use, testInfo) => {
      const problems: Problems = { consoleErrors: [], pageErrors: [], badResponses: [], allow: [] };
      await page.context().setExtraHTTPHeaders({ "X-Forwarded-For": nextVisitor(testInfo) });
      const origin = new URL(baseURL ?? "http://localhost").origin;
      page.on("console", (message) => {
        if (message.type() === "error") problems.consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => problems.pageErrors.push(String(error)));
      page.on("response", (response) => {
        if (response.status() >= 400 && response.url().startsWith(origin)) {
          problems.badResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
        }
      });

      await use(problems);

      const unexpected = (list: string[]) => list.filter((entry) => !problems.allow.some((re) => re.test(entry)));
      expect.soft(unexpected(problems.pageErrors), "uncaught script errors").toEqual([]);
      expect.soft(unexpected(problems.consoleErrors), "console errors").toEqual([]);
      expect.soft(unexpected(problems.badResponses), "failed requests to this site").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** How far the page can be scrolled sideways. Anything above zero means content spills off the screen. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Scroll through the page so lazy images load and scroll-triggered sections settle. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
}

let axeSource: string | undefined;

export type AxeViolation = { id: string; impact: string | null; help: string; nodes: string[] };

/** Run axe-core (WCAG 2.1 A and AA rules plus best practices) against the current page. */
export async function runAxe(page: Page): Promise<AxeViolation[]> {
  axeSource ??= fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    // @ts-expect-error axe is injected above
    const results = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    });
    return results.violations.map((v: { id: string; impact: string | null; help: string; nodes: Array<{ target: string[]; failureSummary?: string }> }) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => `${n.target.join(" ")} :: ${(n.failureSummary ?? "").replace(/\s+/g, " ").slice(0, 200)}`),
    }));
  });
}

export function blocking(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const reportsDir = (client: string) => path.join(__dirname, "..", "reports", client);
