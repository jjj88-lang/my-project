import { addressLines, isSample, menuItemCount, menuPath, menuSections, routes, site, telHref } from "../lib/client";
import { expect, test } from "../lib/fixtures";

type Json = Record<string, unknown>;

async function jsonLd(page: import("playwright/test").Page): Promise<Json[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((text) => JSON.parse(text) as Json);
}

test.describe("search engines", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the same for every screen size");
  });

  test("robots.txt keeps sample sites out and lets real sites in", async ({ request }) => {
    const text = await (await request.get("/robots.txt")).text();
    if (isSample) {
      expect(text).toMatch(/Disallow: \/\s*$/m);
      expect(text).not.toMatch(/Sitemap:/);
    } else {
      expect(text).toMatch(/Allow: \//);
      expect(text).toMatch(/Disallow: \/api\//);
      expect(text).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
    }
  });

  test("pages carry the right robots instruction", async ({ page }) => {
    for (const route of routes) {
      await page.goto(route);
      const robots = (await page.locator('meta[name="robots"]').getAttribute("content").catch(() => null)) ?? "";
      if (isSample) expect(robots, route).toContain("noindex");
      else expect(robots, route).not.toContain("noindex");
    }
  });

  test("the sitemap lists exactly this client's pages", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, "") || "/");
    expect(listed.sort()).toEqual([...routes].sort());
  });

  test("inner pages name their own address as canonical", async ({ page }) => {
    for (const route of routes.filter((r) => r !== "/")) {
      await page.goto(route);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical ?? "").pathname, route).toBe(route);
    }
  });

  test("restaurant details are published in the format Google reads", async ({ page }) => {
    await page.goto("/");
    const restaurant = (await jsonLd(page)).find((b) => b["@type"] === "Restaurant");
    expect(restaurant, "schema.org Restaurant block").toBeTruthy();
    const [street] = addressLines();
    const address = restaurant!.address as Json;
    expect(restaurant!.name).toBe(site.name);
    expect(restaurant!.telephone).toBe(telHref(site.contact.phone).replace("tel:", ""));
    expect(address.streetAddress).toBe(street);
    expect(address.addressLocality).toBe(site.contact.address.city);
    expect(address.addressRegion).toBe(site.contact.address.region);
    expect(address.postalCode).toBe(site.contact.address.postalCode);
    expect(restaurant!.servesCuisine).toEqual(site.cuisines);
    expect((restaurant!.openingHoursSpecification as unknown[]).length).toBe(site.hours.regular.length);
    expect(String(restaurant!.menu)).toMatch(/\/(menu|#menu)$/);
  });

  test("the menu is published as structured data with prices", async ({ page }) => {
    await page.goto(menuPath);
    const menu = (await jsonLd(page)).find((b) => b["@type"] === "Menu");
    expect(menu, "schema.org Menu block").toBeTruthy();
    const sections = menu!.hasMenuSection as Array<{ name: string; hasMenuItem: Array<{ name: string; offers?: { price: string } }> }>;
    expect(sections.map((s) => s.name)).toEqual(menuSections.map((s) => s.name));
    expect(sections.reduce((n, s) => n + s.hasMenuItem.length, 0)).toBe(menuItemCount);
    const firstPriced = menuSections[0].items.find((i) => i.price !== undefined);
    if (firstPriced) {
      const published = sections[0].hasMenuItem.find((i) => i.name === firstPriced.name);
      expect(published?.offers?.price).toBe(firstPriced.price!.toFixed(2));
    }
  });

  test("structured data cannot break out of its script tag", async ({ page }) => {
    await page.goto("/");
    const raw = await page.locator('script[type="application/ld+json"]').first().innerHTML();
    expect(raw).not.toContain("</");
  });

  test("link previews have a title, a description and an image that loads", async ({ page, request }) => {
    await page.goto("/");
    const meta = (property: string) => page.locator(`meta[property="${property}"]`).first().getAttribute("content");
    expect(await meta("og:title")).toContain(site.name);
    expect((await meta("og:description"))?.length ?? 0).toBeGreaterThan(40);
    const image = await meta("og:image");
    expect(image, "og:image").toBeTruthy();
    const response = await request.get(new URL(image!).pathname + new URL(image!).search);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/");
  });

  test("icons and the web manifest are served", async ({ request }) => {
    for (const path of ["/icon", "/apple-icon"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
    }
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.short_name).toBe(site.name);
  });
});

test.describe("security headers", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the same for every screen size");
  });

  test("pages are sent with protective headers and without advertising the framework", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(headers["permissions-policy"]).toContain("geolocation=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("no page loads scripts, styles, fonts or trackers from another site", async ({ page }) => {
    const foreign: string[] = [];
    const origin = new URL(test.info().project.use.baseURL!).origin;
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:")) foreign.push(url);
    });
    for (const route of routes) await page.goto(route, { waitUntil: "networkidle" });
    expect(foreign, "requests to other sites").toEqual([]);
  });
});
