import { cateringFormEnabled, cateringPath, routes, site } from "../lib/client";
import { blocking, expect, runAxe, settle, test } from "../lib/fixtures";

test.describe("accessibility", () => {
  for (const route of routes) {
    test(`${route} has no serious accessibility problems`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route, { waitUntil: "networkidle" });
      await settle(page);
      const violations = await runAxe(page);
      // Lesser findings are recorded in the report for a person to judge.
      const minor = violations.filter((v) => v.impact !== "serious" && v.impact !== "critical");
      if (minor.length) testInfo.annotations.push({ type: "minor accessibility findings", description: JSON.stringify(minor, null, 1) });
      expect(blocking(violations), "serious or critical findings").toEqual([]);
    });
  }

  test("headings are in order on every page", async ({ page }) => {
    for (const route of routes) {
      await page.goto(route);
      const levels = await page
        .locator("main h1, main h2, main h3, main h4")
        .evaluateAll((list) => list.filter((h) => (h as HTMLElement).offsetParent !== null).map((h) => Number(h.tagName[1])));
      expect(levels[0], `${route} starts with the page heading`).toBe(1);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] - levels[i - 1], `${route}: heading ${i + 1} skips a level`).toBeLessThanOrEqual(1);
      }
    }
  });

  test("the skip link is the first stop and jumps to the content", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard check");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("every link and button has a name", async ({ page }) => {
    for (const route of routes) {
      await page.goto(route);
      const unnamed = await page.locator("a, button").evaluateAll((list) =>
        list
          .filter((el) => {
            const text = (el.textContent ?? "").trim();
            const label = el.getAttribute("aria-label") ?? "";
            const labelledBy = el.getAttribute("aria-labelledby");
            const imgAlt = el.querySelector("img[alt]:not([alt=''])");
            return !text && !label && !labelledBy && !imgAlt;
          })
          .map((el) => el.outerHTML.slice(0, 120)),
      );
      expect(unnamed, route).toEqual([]);
    }
  });

  test("tap targets are big enough on a phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "phone-size check");
    for (const route of routes) {
      await page.goto(route);
      const small = await page.locator("header a, header button, nav[aria-label='Quick actions'] a, .btn").evaluateAll((list) =>
        list
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && box.height > 0 && (box.height < 40 || box.width < 40))
          .map(({ el, box }) => `${Math.round(box.width)}x${Math.round(box.height)} ${(el.textContent ?? "").trim().slice(0, 30)}`),
      );
      expect(small, `${route}: controls smaller than 40 px`).toEqual([]);
    }
  });

  test("the phone menu can be opened, used and closed", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "phone-size check");
    await page.goto("/");
    const open = page.getByRole("button", { name: "Open menu" });
    await open.click();
    const dialog = page.getByRole("dialog", { name: "Site menu" });
    await expect(dialog).toBeVisible();
    expect(blocking(await runAxe(page)), "with the menu open").toEqual([]);

    // The page behind must not scroll while the menu is open.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await open.click();
    await dialog.getByRole("button", { name: "Close menu" }).click();
    await expect(dialog).toBeHidden();

    await open.click();
    const firstLink = dialog.getByRole("navigation", { name: "Mobile" }).getByRole("link").first();
    const href = await firstLink.getAttribute("href");
    await firstLink.click();
    await expect(dialog).toBeHidden();
    if (href && !href.includes("#")) await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test("questions open and close from the keyboard", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop" || (site.faq ?? []).length === 0, "keyboard check");
    await page.goto("/");
    const first = page.locator("details").first();
    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", "");
    await expect(first.locator("p")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(first).not.toHaveAttribute("open", "");
  });

  test("form errors are announced and tied to their fields", async ({ page, problems }, testInfo) => {
    test.skip(!cateringFormEnabled, "this client has no catering form");
    problems.allow.push(/422/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(cateringPath, { waitUntil: "networkidle" });
    const form = page.locator('form[data-form="catering"]');
    await form.getByRole("button", { name: /send my request/i }).click();
    await expect(form.getByRole("alert").first()).toBeVisible();

    const name = form.getByLabel("Your name");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    const describedBy = await name.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    for (const id of describedBy!.split(" ")) await expect(page.locator(`[id="${id}"]`)).toBeVisible();

    expect(blocking(await runAxe(page)), `with errors showing (${testInfo.project.name})`).toEqual([]);
  });
});
