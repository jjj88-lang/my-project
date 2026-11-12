import { galleryEnabled, isPremium, menuSections, routes, site } from "../lib/client";
import { expect, test } from "../lib/fixtures";

test.describe("getting around", () => {
  test("the main menu leads to every page of the plan", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the phone menu is checked with accessibility");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    const links = await nav.getByRole("link").evaluateAll((list) => list.map((a) => a.getAttribute("href")));

    if (isPremium) {
      expect(links).toEqual(routes.filter((r) => r !== "/"));
      for (const href of links) {
        await nav.locator(`a[href="${href}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        await expect(nav.locator(`a[href="${href}"]`)).toHaveAttribute("aria-current", "page");
        // The page just left stays in the document, hidden, so look at visible headings only.
        await expect(page.locator("h1:visible")).toHaveCount(1);
      }
      await page.locator("header").first().getByRole("link", { name: /home page$/ }).click();
      await expect(page).toHaveURL(/\/$/);
    } else {
      // One-page sites: every link jumps to a section that exists.
      for (const href of links) {
        const id = href!.split("#")[1];
        expect(id, `${href} points at a section`).toBeTruthy();
        await nav.locator(`a[href="${href}"]`).click();
        await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
      }
    }
  });

  test("the menu's section links jump to the right section", async ({ page }) => {
    test.skip(!isPremium, "one-page sites have no separate menu page");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/menu", { waitUntil: "networkidle" });
    const nav = page.getByRole("navigation", { name: "Menu sections" });
    await expect(nav.getByRole("link")).toHaveCount(menuSections.length);

    const target = menuSections[Math.min(3, menuSections.length - 1)];
    await nav.getByRole("link", { name: target.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${target.id}$`));
    const heading = page.locator(`#${target.id}`).getByRole("heading", { name: target.name, exact: true });
    await expect(heading).toBeInViewport();
    // The heading must land below the sticky header and section bar, not underneath them.
    const top = (await heading.boundingBox())!.y;
    const bars = await page.evaluate(() => {
      const header = document.querySelector("header")!.getBoundingClientRect();
      const sections = document.querySelector('nav[aria-label="Menu sections"]')!.getBoundingClientRect();
      return Math.max(header.bottom, sections.bottom);
    });
    expect(top, "heading is not hidden behind the sticky bars").toBeGreaterThanOrEqual(bars - 1);
    await expect(nav.getByRole("link", { name: target.name, exact: true })).toHaveAttribute("aria-current", "true");
  });

  test("the printed menu leaves out the site chrome", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "print layout is the same everywhere");
    await page.goto(isPremium ? "/menu" : "/");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("header").first()).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Quick actions" })).toBeHidden();
    await expect(page.locator(".menu-section").first()).toBeVisible();
    const background = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--c-bg").trim());
    expect(background).toBe("#fff");
  });

  test("the photo viewer opens, moves and closes", async ({ page }) => {
    test.skip(!galleryEnabled, "this client has no gallery page");
    await page.goto("/gallery", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "View larger" }).first().click();
    const viewer = page.getByRole("dialog", { name: "Photo viewer" });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText(/Photo 1 of \d+/)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText(/Photo 2 of \d+/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });
});

test.describe("links", () => {
  test("no link on any page is broken, empty or unsafe", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "links are the same for every screen size");
    const origin = new URL(testInfo.project.use.baseURL!).origin;
    type Found = { href: string; target: string | null; rel: string | null; from: string; text: string };
    const found: Found[] = [];

    for (const route of routes) {
      await page.goto(route);
      const links = await page.locator("a").evaluateAll((list) =>
        list.map((a) => ({
          href: a.getAttribute("href") ?? "",
          target: a.getAttribute("target"),
          rel: a.getAttribute("rel"),
          text: (a.textContent ?? "").trim().slice(0, 40),
        })),
      );
      found.push(...links.map((l) => ({ ...l, from: route })));
    }

    const problems: string[] = [];
    const internal = new Map<string, Found>();
    for (const link of found) {
      const where = `"${link.text}" on ${link.from}`;
      if (!link.href || link.href === "#") {
        problems.push(`empty link: ${where}`);
      } else if (link.href.startsWith("tel:")) {
        if (!/^tel:\+?\d{7,15}$/.test(link.href)) problems.push(`malformed phone link ${link.href}: ${where}`);
      } else if (link.href.startsWith("mailto:")) {
        if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@?]+(\?.*)?$/.test(link.href)) problems.push(`malformed email link ${link.href}: ${where}`);
      } else if (/^https?:\/\//.test(link.href) && !link.href.startsWith(origin)) {
        if (link.href.startsWith("http://")) problems.push(`insecure link ${link.href}: ${where}`);
        if (link.target === "_blank" && !(link.rel ?? "").includes("noopener")) problems.push(`new-tab link without rel="noopener": ${where}`);
        try {
          new URL(link.href);
        } catch {
          problems.push(`malformed address ${link.href}: ${where}`);
        }
      } else if (link.href.startsWith("/") || link.href.startsWith("#")) {
        internal.set(`${link.href.startsWith("#") ? link.from : ""}${link.href}`, link);
      } else {
        problems.push(`unrecognized link ${link.href}: ${where}`);
      }
    }

    for (const [target, link] of internal) {
      const [pathPart, hash] = target.split("#");
      const response = await request.get(pathPart || "/");
      if (response.status() >= 400) {
        problems.push(`${response.status()} for ${target} (linked from ${link.from})`);
        continue;
      }
      if (hash) {
        const html = await response.text();
        if (!new RegExp(`id="${hash}"`).test(html)) problems.push(`no element with id "${hash}" at ${pathPart || "/"} (linked from ${link.from})`);
      }
    }

    expect(problems).toEqual([]);
    expect(internal.size, "pages link to each other").toBeGreaterThan(routes.length - 1);
  });

  test("external profiles from the client's file are linked", async ({ page }, testInfo) => {
    const social = Object.values(site.links?.social ?? {}).filter(Boolean) as string[];
    test.skip(testInfo.project.name !== "desktop" || social.length === 0, "no social links configured");
    await page.goto("/");
    for (const url of social) await expect(page.locator(`footer a[href="${url}"]`)).toHaveCount(1);
  });
});
