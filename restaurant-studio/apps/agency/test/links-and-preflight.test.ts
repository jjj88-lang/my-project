import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { cleanDemoUrl, resolveDemoUrl } from "@/lib/demos";
import { countBlockers, environmentChecks, screenshotChecks, studioChecks } from "@/lib/preflight";
import { checkStripeLink, resolveStripeLinks, STRIPE_LINK_VARS } from "@/lib/stripe-links";
import { studio } from "@/lib/studio";
import { availableShots, demoHasShots, shot } from "@/lib/work/shots";

describe("Stripe Payment Link validation", () => {
  it("accepts live and test links on buy.stripe.com", () => {
    expect(checkStripeLink("https://buy.stripe.com/abc123")).toEqual({
      ok: true,
      link: { url: "https://buy.stripe.com/abc123", testMode: false },
    });
    const test = checkStripeLink(" https://buy.stripe.com/test_abc ");
    expect(test.ok && test.link.testMode).toBe(true);
  });

  it.each([
    "http://buy.stripe.com/abc",
    "https://buy.stripe.com/",
    "https://buy.stripe.com.evil.com/abc",
    "https://evil.com/buy.stripe.com/abc",
    "https://checkout.stripe.com/abc",
    "https://user:pw@buy.stripe.com/abc",
    "https://buy.stripe.com:8443/abc",
    "https://buy.stripe.com/a b",
    "javascript:alert(1)",
    "buy.stripe.com/abc",
  ])("rejects %s", (value) => {
    expect(checkStripeLink(value)).toEqual({ ok: false, reason: "not-a-stripe-link" });
  });

  it("treats empty values as not set", () => {
    expect(checkStripeLink("")).toEqual({ ok: false, reason: "empty" });
    expect(checkStripeLink(undefined)).toEqual({ ok: false, reason: "empty" });
  });

  it("keeps only valid links, and hides test links on the live site", () => {
    const raw = {
      starterDeposit: "https://buy.stripe.com/live1",
      premiumDeposit: "https://buy.stripe.com/test_2",
      maintenance: "https://example.com/pay",
    };
    expect(Object.keys(resolveStripeLinks(raw, true))).toEqual(["starterDeposit", "premiumDeposit"]);
    expect(Object.keys(resolveStripeLinks(raw, false))).toEqual(["starterDeposit"]);
    expect(resolveStripeLinks({}, true)).toEqual({});
  });
});

describe("live sample links", () => {
  it("cleans and rejects addresses", () => {
    expect(cleanDemoUrl("https://hibana.vercel.app/")).toBe("https://hibana.vercel.app");
    expect(cleanDemoUrl("http://localhost:3001")).toBe("http://localhost:3001");
    expect(cleanDemoUrl("http://hibana.com")).toBeUndefined();
    expect(cleanDemoUrl("https://example.com")).toBeUndefined();
    expect(cleanDemoUrl("not a url")).toBeUndefined();
    expect(cleanDemoUrl("")).toBeUndefined();
  });

  it("prefers the variable, then studio.json, then the local address in development only", () => {
    expect(resolveDemoUrl("hibana", { env: "https://a.app", studio: "https://b.app", development: true })).toBe(
      "https://a.app",
    );
    expect(resolveDemoUrl("hibana", { studio: "https://b.app", development: false })).toBe("https://b.app");
    expect(resolveDemoUrl("bulmat", { development: true })).toBe("http://localhost:3002");
    expect(resolveDemoUrl("bulmat", { development: false })).toBeUndefined();
  });
});

describe("screenshots", () => {
  it("match the files in public/work", () => {
    const dir = path.join(__dirname, "..", "public", "work");
    const files = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".png"))
      .map((name) => name.replace(/\.png$/, ""))
      .sort();
    expect(availableShots).toEqual(files);
    for (const name of files) {
      const [demo, page, device] = name.split("-") as ["hibana", "home", "desktop"];
      // Under Vite a PNG import is a URL string; in the Next.js build it is StaticImageData.
      expect(shot(demo, page, device)).toBeTruthy();
    }
  });

  it("returns undefined for a missing shot", () => {
    expect(shot("hibana", "visit", "desktop")).toBeUndefined();
    expect(typeof demoHasShots("bulmat")).toBe("boolean");
  });
});

describe("launch preflight", () => {
  const ready = {
    ...studio,
    name: "Real Name Studio",
    nameIsTemporary: false,
    url: "https://realstudio.com",
    email: "hello@realstudio.com",
    phone: "(785) 555-0100",
    mailingAddress: "PO Box 1, Topeka, KS 66601",
    founder: { name: "A. Person", role: "Founder", story: ["I have worked in restaurants."] },
    legalReviewed: true,
    demos: {
      hibana: { ...studio.demos.hibana, url: "https://hibana.realstudio.com" },
      bulmat: { ...studio.demos.bulmat, url: "https://bulmat.realstudio.com" },
    },
  };
  const env: Record<string, string> = {
    INBOX_GOOGLE_URL: "https://script.google.com/macros/s/abc/exec",
    INBOX_GOOGLE_SECRET: "x".repeat(40),
    ...Object.fromEntries(Object.values(STRIPE_LINK_VARS).map((name, i) => [name, `https://buy.stripe.com/live${i}`])),
  };

  it("blocks every placeholder in the current studio.json", () => {
    const group = studioChecks(studio);
    // The committed file is all placeholders until the owner fills it in.
    expect(group.items.filter((item) => item.level === "block").length).toBeGreaterThanOrEqual(7);
  });

  it("passes when everything is filled in", () => {
    const groups = [studioChecks(ready), ...environmentChecks(env, ready)];
    expect(countBlockers(groups)).toBe(0);
  });

  it("blocks missing inbox, missing or test Stripe links, local driver and local demo URLs", () => {
    const groups = environmentChecks(
      {
        ...env,
        INBOX_GOOGLE_SECRET: "",
        INBOX_DRIVER: "local",
        NEXT_PUBLIC_STRIPE_LINK_MAINTENANCE: "https://buy.stripe.com/test_x",
        NEXT_PUBLIC_STRIPE_LINK_STARTER_DEPOSIT: "https://example.com",
        NEXT_PUBLIC_DEMO_HIBANA_URL: "http://localhost:3001",
      },
      { ...ready, demos: { ...ready.demos, hibana: { ...ready.demos.hibana, url: "" } } },
    );
    expect(countBlockers(groups)).toBe(5);
  });

  it("notes a sample without screenshots instead of blocking", () => {
    const group = screenshotChecks(["hibana-home-desktop"]);
    expect(group.items.map((item) => item.level)).toEqual(["ok", "note"]);
  });
});
