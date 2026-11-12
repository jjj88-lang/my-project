import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { listClients, loadClient, referencedImages } from "../scripts/prepare-client";
import { menuSchema, siteSchema } from "@/lib/site/schema";

const read = (file: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "clients", file), "utf8"));

describe("every client in clients/", () => {
  const clients = listClients();

  it("finds at least the Hibana demo", () => {
    expect(clients).toContain("hibana");
  });

  it.each(clients)("%s passes validation with no errors", (slug) => {
    const loaded = loadClient(slug);
    expect(loaded.findings.filter((f) => f.level === "error")).toEqual([]);
    expect(loaded.site?.name).toBeTruthy();
    expect(loaded.menu?.sections.length).toBeGreaterThan(0);
  });

  it.each(clients)("%s has unique item names within each menu section", (slug) => {
    const { menu } = loadClient(slug);
    for (const section of menu!.sections) {
      const names = section.items.map((i) => i.name);
      expect(new Set(names).size, `duplicate item in "${section.name}"`).toBe(names.length);
    }
  });
});

describe("site.json rules", () => {
  const base = read("hibana/site.json");

  it("accepts the demo and applies defaults", () => {
    const site = siteSchema.parse(base);
    expect(site.footer.studioCredit).toBe(true);
    expect(site.catering.leadTimeDays).toBe(3);
    expect(site.hero.media.focus).toBe("center");
  });

  it("requires alt text whenever an image is set", () => {
    const result = siteSchema.safeParse({ ...base, hero: { ...base.hero, media: { image: "hero.jpg" } } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path.join(".")).toBe("hero.media.alt");
  });

  it("rejects malformed times, colors and web addresses with a readable message", () => {
    const bad = siteSchema.safeParse({
      ...base,
      url: "hibana.com",
      theme: { ...base.theme, colors: { ...base.theme.colors, accent: "orange" } },
      hours: { ...base.hours, regular: [{ days: ["mon"], open: "9am", close: "17:00" }] },
    });
    expect(bad.success).toBe(false);
    const byPath = Object.fromEntries(bad.error!.issues.map((i) => [i.path.join("."), i.message]));
    expect(byPath["url"]).toMatch(/https:\/\//);
    expect(byPath["theme.colors.accent"]).toMatch(/hex color/);
    expect(byPath["hours.regular.0.open"]).toMatch(/HH:MM/);
  });

  it("requires either times or closed on a holiday exception", () => {
    const bad = siteSchema.safeParse({ ...base, hours: { ...base.hours, exceptions: [{ date: "2026-12-25" }] } });
    expect(bad.success).toBe(false);
  });

  it("caps the description so search engines show all of it", () => {
    expect(siteSchema.safeParse({ ...base, description: "x".repeat(201) }).success).toBe(false);
    expect(siteSchema.safeParse({ ...base, description: "Too short." }).success).toBe(false);
  });
});

describe("menu.json rules", () => {
  const base = read("hibana/menu.json");

  it("accepts the demo menu", () => {
    const menu = menuSchema.parse(base);
    expect(menu.sections.flatMap((s) => s.items).filter((i) => i.featured)).toHaveLength(4);
  });

  it("rejects unknown dietary tags and names the valid ones", () => {
    const menu = structuredClone(base);
    menu.sections[0].items[0].tags = ["keto"];
    const result = menuSchema.safeParse(menu);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/Unknown tag "keto"/);
  });

  it("accepts a custom tag once it is declared", () => {
    const menu = structuredClone(base);
    menu.tags = { keto: { label: "Keto friendly", short: "Keto" } };
    menu.sections[0].items[0].tags = ["keto"];
    expect(menuSchema.safeParse(menu).success).toBe(true);
  });

  it("rejects duplicate section ids and ids with spaces", () => {
    const dup = structuredClone(base);
    dup.sections[1].id = dup.sections[0].id;
    expect(menuSchema.safeParse(dup).success).toBe(false);
    const spaced = structuredClone(base);
    spaced.sections[0].id = "Small Plates";
    expect(menuSchema.safeParse(spaced).success).toBe(false);
  });

  it("rejects an item with both a price and variants, and negative prices", () => {
    const both = structuredClone(base);
    both.sections[0].items[0] = { name: "X", price: 5, variants: [{ label: "Large", price: 7 }] };
    expect(menuSchema.safeParse(both).success).toBe(false);
    const negative = structuredClone(base);
    negative.sections[0].items[0] = { name: "X", price: -1 };
    expect(menuSchema.safeParse(negative).success).toBe(false);
  });
});

describe("prepare-client checks beyond the schema", () => {
  /** Copy the Hibana client into a temporary clients folder is not possible (the script reads a fixed folder),
   *  so these exercise the pure helper and the real demo instead. */
  it("collects every image reference with the place it is used", () => {
    const site = siteSchema.parse({
      ...read("hibana/site.json"),
      hero: { headline: "Hi", media: { image: "hero.jpg", alt: "Flames on the grill" } },
      gallery: { images: [{ image: "a.jpg", alt: "The sushi bar" }, { image: "hero.jpg", alt: "Flames again" }] },
    });
    const menu = menuSchema.parse(read("hibana/menu.json"));
    const refs = referencedImages(site, menu);
    expect(refs.get("hero.jpg")).toEqual(["hero.media.image", "gallery.images[1].image"]);
    expect(refs.get("a.jpg")).toEqual(["gallery.images[0].image"]);
  });

  it("reports a missing client folder instead of crashing", () => {
    const loaded = loadClient("no-such-client");
    expect(loaded.findings[0]).toMatchObject({ level: "error" });
    expect(loaded.findings[0].message).toMatch(/No client folder named "no-such-client"/);
  });

  it("keeps temporary files out of the way", () => {
    // Guard against a test accidentally writing into the repository.
    expect(os.tmpdir()).not.toContain("restaurant-studio");
  });
});
