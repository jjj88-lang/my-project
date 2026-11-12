import { describe, expect, it } from "vitest";

import { HOME_FAQ_IDS, FAQ, faqById } from "@/content/faq";
import { PROCESS_STEPS } from "@/content/process";
import {
  balanceOf,
  catering,
  depositOf,
  draftDaysRange,
  exampleCheck,
  firstSentence,
  guestCheck,
  inWords,
  lowestPrice,
  maintenance,
  money,
  premium,
  pricing,
  starter,
} from "@/lib/pricing";
import { isPlaceholder, listWithAnd, telHref } from "@/lib/studio";
import { smart } from "@/lib/text";

describe("money and the deposit split", () => {
  it("writes whole dollars without cents and uneven amounts with them", () => {
    expect(money(699)).toBe("$699");
    expect(money(1348)).toBe("$1,348");
    expect(money(349.5)).toBe("$349.50");
  });

  it("splits a price so that the two payments always add up to it", () => {
    for (const price of [699, 999, 349, 1348, 1, 333.33]) {
      expect(depositOf(price) + balanceOf(price)).toBeCloseTo(price, 10);
    }
    expect(depositOf(1348)).toBe(1348 * (pricing.depositPercent / 100));
  });

  it("adds up a guest check", () => {
    const check = guestCheck([
      { name: "Premium Website", price: 999 },
      { name: "Catering Inquiry Automation", price: 349 },
    ]);
    expect(check.total).toBe(1348);
    expect(check.dueToStart + check.dueAtApproval).toBe(1348);
    expect(check.depositPercent + check.balancePercent).toBe(100);
  });

  it("builds the site's example from the price list: the larger package plus the catering add-on", () => {
    expect(exampleCheck.lines).toEqual([
      { name: premium.name, price: premium.price },
      { name: catering.name, price: catering.price },
    ]);
    expect(exampleCheck.total).toBe(premium.price + catering.price);
    expect(exampleCheck.monthly).toEqual({ name: maintenance.name, price: maintenance.pricePerMonth });
  });

  it("derives the figures the home page quotes", () => {
    expect(lowestPrice).toBe(Math.min(starter.price, premium.price));
    const days = [starter.firstDraftBusinessDays, premium.firstDraftBusinessDays].sort((a, b) => a - b);
    expect(draftDaysRange()).toBe(days[0] === days[1] ? String(days[0]) : `${days[0]} to ${days[1]}`);
    expect(inWords(2)).toBe("two");
    expect(inWords(14)).toBe("14");
    expect(firstSentence("One thing. Another thing.")).toBe("One thing.");
    expect(firstSentence("No full stop")).toBe("No full stop");
  });
});

describe("content", () => {
  it("has the four home page questions, and every answer has an id of its own", () => {
    expect(HOME_FAQ_IDS).toHaveLength(4);
    for (const id of HOME_FAQ_IDS) expect(faqById(id).a.length).toBeGreaterThan(0);
    expect(new Set(FAQ.map((item) => item.id)).size).toBe(FAQ.length);
    expect(() => faqById("no-such-question")).toThrow();
  });

  it("never promises more customers, sales or revenue", () => {
    const answer = faqById("customers").a.join(" ");
    expect(answer).toContain("I cannot promise that");
    const everything = [...FAQ.flatMap((item) => [item.q, ...item.a]), ...PROCESS_STEPS.flatMap((step) => [step.title, step.text])].join(" ");
    expect(everything).not.toMatch(/guarantee[ds]? (more|you)|increase your (sales|revenue)|more (sales|revenue)/i);
  });

  it("tells the process in five tickets", () => {
    expect(PROCESS_STEPS).toHaveLength(5);
    expect(PROCESS_STEPS.map((step) => step.station)).toEqual(["Call", "Start", "Draft", "Revise", "Launch"]);
  });
});

describe("smart quotes", () => {
  it("curls apostrophes and quotation marks in plain text from the price list", () => {
    expect(smart("An 'Open now' indicator")).toBe("An ‘Open now’ indicator");
    expect(smart("30 days' notice, and we don't lock you in")).toBe("30 days’ notice, and we don’t lock you in");
    expect(smart('The "Order Online" button')).toBe("The “Order Online” button");
    expect(smart("Nothing to change")).toBe("Nothing to change");
  });
});

describe("studio details", () => {
  it("treats empty values and example.com stand-ins as not set", () => {
    for (const value of ["", "   ", undefined, null, "hello@example.com", "https://example.com", "https://www.example.org/", "TODO"]) {
      expect(isPlaceholder(value), String(value)).toBe(true);
    }
    for (const value of ["hello@sample-studio.test", "(785) 555-0142", "https://sample-studio.test", "A counterexample.com.au address"]) {
      expect(isPlaceholder(value), value).toBe(false);
    }
  });

  it("formats phone links and lists", () => {
    expect(telHref("(785) 555-0142")).toBe("tel:+17855550142");
    expect(telHref("+1 785 555 0142")).toBe("tel:+17855550142");
    expect(listWithAnd(["Topeka, Kansas", "Ithaca, New York"])).toBe("Topeka, Kansas and Ithaca, New York");
    expect(listWithAnd(["a", "b", "c"])).toBe("a, b, and c");
    expect(listWithAnd(["only"])).toBe("only");
  });
});
