import {
  addressLines,
  cateringEnabled,
  formatPrice,
  formatTime,
  isPremium,
  isSample,
  menu,
  menuItemCount,
  menuPath,
  menuSections,
  site,
  telHref,
  todayLocal,
  visitPath,
} from "../lib/client";
import { expect, test } from "../lib/fixtures";

const [street, cityLine] = addressLines();
const phoneHref = telHref(site.contact.phone);

test.describe("the facts a guest needs", () => {
  test("name, phone and address are right on the home page", async ({ page }) => {
    await page.goto("/");
    const home = page.locator("header").first().getByRole("link", { name: /home page$/ });
    if (!site.logo?.image) await expect(home).toContainText(new RegExp(site.logo?.text ?? site.name, "i"));
    else await expect(home.locator("img")).toHaveAttribute("alt", /.+/);

    const footer = page.locator("footer").last();
    await expect(footer).toContainText(street);
    await expect(footer).toContainText(cityLine);
    await expect(footer.locator(`a[href="${phoneHref}"]`)).toHaveText(site.contact.phone);

    // Every phone link on the page dials the right number.
    const telLinks = await page.locator('a[href^="tel:"]').evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(telLinks.length).toBeGreaterThanOrEqual(2);
    expect(new Set(telLinks)).toEqual(new Set([phoneHref]));
  });

  test("directions open Google Maps for this address", async ({ page }) => {
    await page.goto(visitPath);
    const visit = page.locator("#visit");
    const directions = visit.getByRole("link", { name: /get directions/i });
    const href = await directions.getAttribute("href");
    expect(href).toContain("https://www.google.com/maps/dir/?api=1&destination=");
    expect(decodeURIComponent(href ?? "")).toContain(`${site.name}, ${street}, ${cityLine}`);
    await expect(directions).toHaveAttribute("target", "_blank");
    expect(await directions.getAttribute("rel")).toContain("noopener");
  });

  test("opening hours match the client's file", async ({ page }) => {
    await page.goto(visitPath);
    const visit = page.locator("#visit");
    for (const interval of site.hours.regular) {
      await expect(visit, `opens ${interval.open}`).toContainText(formatTime(interval.open));
      await expect(visit, `closes ${interval.close}`).toContainText(formatTime(interval.close));
    }
    for (const note of site.hours.notes ?? []) await expect(visit).toContainText(note);

    // Holiday hours inside the next six weeks are announced.
    const today = todayLocal();
    const horizon = new Date(`${today}T12:00:00Z`);
    horizon.setUTCDate(horizon.getUTCDate() + 45);
    const upcoming = (site.hours.exceptions ?? []).filter(
      (e: { date: string }) => e.date >= today && e.date <= horizon.toISOString().slice(0, 10),
    );
    if (upcoming.length > 0) {
      await expect(visit.getByText("Holiday hours")).toBeVisible();
      for (const e of upcoming) if (e.label) await expect(visit).toContainText(e.label);
    }
  });

  test('the "Open now" badge works out a status', async ({ page }) => {
    await page.goto("/");
    // Look inside the page body: the closed phone menu also lists hours, including the word "Closed".
    await expect(page.locator("main").getByText(/^(Open now|Closing soon|Closed)$/).first()).toBeVisible();
  });

  test("sample sites say so, real sites do not", async ({ page }) => {
    await page.goto("/");
    const label = page.getByText(/sample concept/i).first();
    if (isSample) await expect(label).toBeVisible();
    else await expect(label).toHaveCount(0);
  });

  test("the announcement shows until its end date", async ({ page }) => {
    await page.goto("/");
    const a = site.announcement;
    test.skip(!a, "no announcement configured");
    const expired = a.until && a.until < todayLocal();
    const bar = page.getByText(a.text, { exact: true });
    if (expired) await expect(bar).toHaveCount(0);
    else await expect(bar).toBeVisible();
  });
});

test.describe("the menu", () => {
  test("every section, item and price from menu.json is on the page", async ({ page }) => {
    await page.goto(menuPath);
    for (const section of menuSections) {
      const block = page.locator(`#${section.id}`);
      await expect(block.getByRole("heading", { name: section.name, exact: true })).toBeVisible();
      await expect(block.locator("ul > li").filter({ has: page.locator("h3") })).toHaveCount(section.items.length);

      for (const item of section.items) {
        const row = block.locator("li").filter({ has: page.getByRole("heading", { name: item.name, exact: true }) }).first();
        await expect(row, `${section.name}: ${item.name}`).toBeVisible();
        if (item.price !== undefined) await expect(row).toContainText(formatPrice(item.price));
        for (const variant of item.variants ?? []) {
          await expect(row).toContainText(variant.label);
          await expect(row).toContainText(formatPrice(variant.price));
        }
        if (item.priceText) await expect(row).toContainText(item.priceText);
        if (item.description) await expect(row).toContainText(item.description);
      }
    }
    expect(await page.locator(".menu-section li h3").count()).toBe(menuItemCount);
  });

  test("the small print is shown", async ({ page }) => {
    await page.goto(menuPath);
    for (const note of (menu.notes ?? []) as string[]) await expect(page.getByText(note, { exact: true })).toBeVisible();
  });

  test("the menu is text, not a PDF or a picture", async ({ page }) => {
    await page.goto(menuPath);
    await expect(page.locator('a[href$=".pdf"]')).toHaveCount(0);
    const words = await page.locator(".menu-section").first().innerText();
    expect(words.length).toBeGreaterThan(40);
  });

  test("dishes marked as featured appear on the home page", async ({ page }) => {
    test.skip(!isPremium, "one-page sites show the whole menu on the home page");
    await page.goto("/");
    const featured = menuSections.flatMap((s) => s.items).filter((i) => i.featured).slice(0, 4);
    const section = page.locator("section", { has: page.locator("#featured-heading") });
    for (const item of featured) await expect(section.getByRole("heading", { name: item.name, exact: true })).toBeVisible();
  });
});

test.describe("ordering and reservation buttons", () => {
  for (const kind of ["order", "reserve"] as const) {
    test(`${kind}: a real link, a sample explanation, or no button at all`, async ({ page }) => {
      await page.goto("/");
      const link = site.links?.[kind];
      const label = link?.label ?? (kind === "order" ? "Order online" : "Reserve a table");
      const buttons = page.locator("main").getByRole("link", { name: new RegExp(`^${label}`, "i") });

      if (link?.url) {
        await expect(buttons.first()).toHaveAttribute("href", link.url);
        await expect(buttons.first()).toHaveAttribute("target", "_blank");
      } else if (isSample && link) {
        await expect(buttons.first()).toHaveAttribute("href", `/${kind}`);
        const response = await page.request.get(`/${kind}`);
        expect(response.status()).toBe(200);
      } else {
        await expect(buttons).toHaveCount(0);
        const response = await page.request.get(`/${kind}`);
        expect(response.status(), `/${kind} must not exist without a link`).toBe(404);
      }
    });
  }
});

test.describe("phone-size action bar", () => {
  test("offers call, directions and one more action on phones only", async ({ page }, testInfo) => {
    await page.goto("/");
    const bar = page.getByRole("navigation", { name: "Quick actions" });
    if (testInfo.project.name === "phone") {
      await expect(bar).toBeVisible();
      await expect(bar.getByRole("link")).toHaveCount(3);
      await expect(bar.getByRole("link", { name: "Call" })).toHaveAttribute("href", phoneHref);
      expect(await bar.getByRole("link", { name: /directions/i }).getAttribute("href")).toContain("google.com/maps/dir");
      // The bar must not hide the end of the page.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const lastLine = page.locator("footer").last().getByText(/©/);
      await expect(lastLine).toBeInViewport();
      const barBox = await bar.boundingBox();
      const lineBox = await lastLine.boundingBox();
      expect(lineBox!.y + lineBox!.height, "footer text sits above the bar").toBeLessThanOrEqual(barBox!.y + 1);
    } else {
      await expect(bar).toBeHidden();
    }
  });
});

test.describe("catering", () => {
  test("is offered only when the client offers it", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { name: site.catering?.heading ?? "Catering & private events" });
    if (cateringEnabled) await expect(heading.first()).toBeVisible();
    else await expect(heading).toHaveCount(0);
  });
});
