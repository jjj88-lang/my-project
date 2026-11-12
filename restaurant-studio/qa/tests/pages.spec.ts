import path from "node:path";

import { absentRoutes, clientSlug, routes, site, slugForFile } from "../lib/client";
import { ensureDir, expect, horizontalOverflow, reportsDir, settle, test } from "../lib/fixtures";

test.describe("every page", () => {
  for (const route of routes) {
    test(`${route} loads cleanly`, async ({ page }, testInfo) => {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), "HTTP status").toBe(200);

      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("h1"), "exactly one main heading").toHaveCount(1);
      await expect(page.locator("main#main")).toHaveCount(1);
      await expect(page.locator("header").first()).toBeVisible();
      await expect(page.locator("footer").last()).toBeVisible();

      const title = await page.title();
      expect(title).toContain(site.name);
      expect(title.length, "title length").toBeLessThanOrEqual(70);

      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description?.length ?? 0, "meta description length").toBeGreaterThanOrEqual(50);
      expect(description?.length ?? 0, "meta description length").toBeLessThanOrEqual(200);

      await settle(page);
      expect(await horizontalOverflow(page), "sideways scrolling in pixels").toBe(0);

      // Every image has alt text (empty is allowed for decoration) and actually loaded.
      const images = await page.locator("img").evaluateAll((list) =>
        (list as HTMLImageElement[]).map((img) => ({
          src: img.currentSrc || img.src,
          hasAlt: img.hasAttribute("alt"),
          loaded: img.complete && img.naturalWidth > 0,
        })),
      );
      expect(images.filter((i) => !i.hasAlt), "images without an alt attribute").toEqual([]);
      expect(images.filter((i) => !i.loaded), "images that failed to load").toEqual([]);

      // Keep a picture of every page as it was approved.
      const dir = ensureDir(path.join(reportsDir(clientSlug), "screens", testInfo.project.name));
      await page.screenshot({ path: path.join(dir, `${slugForFile(route)}.png`), fullPage: true });
    });
  }

  test("titles are different on every page", async ({ page }) => {
    const titles: string[] = [];
    for (const route of routes) {
      await page.goto(route);
      titles.push(await page.title());
    }
    expect(new Set(titles).size).toBe(titles.length);
  });

  test("nothing spills off a small phone (360 px wide)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "phone-size check");
    await page.setViewportSize({ width: 360, height: 740 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: "networkidle" });
      await settle(page);
      expect(await horizontalOverflow(page), `${route} at 360 px`).toBe(0);
    }
  });

  test("nothing spills off a tablet (768 px wide)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "run once");
    await page.setViewportSize({ width: 768, height: 1024 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: "networkidle" });
      await settle(page);
      expect(await horizontalOverflow(page), `${route} at 768 px`).toBe(0);
    }
  });
});

test.describe("pages that should not exist", () => {
  test("an unknown address gives a helpful 404 page", async ({ page, problems }) => {
    problems.allow.push(/404/);
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("link", { name: /menu/i }).first()).toBeVisible();
    await expect(page.locator('a[href^="tel:"]').first()).toBeAttached();
  });

  for (const route of absentRoutes) {
    test(`${route} is not part of this client's plan`, async ({ request }) => {
      const response = await request.get(route);
      expect(response.status()).toBe(404);
    });
  }
});
