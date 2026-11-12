import { describe, expect, it } from "vitest";

import {
  addressLines,
  addressOneLine,
  directionsUrl,
  formatMoney,
  formatPrice,
  lowestPrice,
  mapsUrl,
  slugify,
  telHref,
} from "@/lib/site/format";

const address = { street: "1200 Sample Street", city: "Topeka", region: "KS", postalCode: "66603", country: "US" };

describe("format helpers", () => {
  it("builds tel: links from displayed numbers", () => {
    expect(telHref("(785) 555-0142")).toBe("tel:+17855550142");
    expect(telHref("785.555.0142")).toBe("tel:+17855550142");
    expect(telHref("1-785-555-0142")).toBe("tel:+17855550142");
    expect(telHref("+44 20 7946 0958")).toBe("tel:+442079460958");
  });

  it("formats addresses", () => {
    expect(addressLines(address)).toEqual(["1200 Sample Street", "Topeka, KS 66603"]);
    expect(addressLines({ ...address, street2: "Suite B" })[0]).toBe("1200 Sample Street, Suite B");
    expect(addressOneLine(address)).toBe("1200 Sample Street, Topeka, KS 66603");
  });

  it("builds Google Maps links with everything encoded", () => {
    const site = { name: "Kim & Lee's", contact: { phone: "", address } };
    const url = directionsUrl(site);
    expect(url.startsWith("https://www.google.com/maps/dir/?api=1&destination=")).toBe(true);
    expect(url).toContain("Kim%20%26%20Lee's");
    expect(url).not.toContain(" ");
    expect(mapsUrl(site)).toContain("/maps/search/?api=1&query=");
    expect(mapsUrl({ ...site, contact: { ...site.contact, mapsUrl: "https://maps.app.goo.gl/abc" } })).toBe(
      "https://maps.app.goo.gl/abc",
    );
  });

  it("formats prices the way menus print them", () => {
    expect(formatPrice(8)).toBe("8");
    expect(formatPrice(8.5)).toBe("8.50");
    expect(formatMoney(16)).toBe("$16");
    expect(formatMoney(10.5)).toBe("$10.50");
  });

  it("finds the lowest price of an item", () => {
    expect(lowestPrice({ price: 12 })).toBe(12);
    expect(lowestPrice({ variants: [{ label: "Nigiri", price: 8 }, { label: "Sashimi", price: 11 }] })).toBe(8);
    expect(lowestPrice({})).toBeUndefined();
  });

  it("makes URL-safe slugs", () => {
    expect(slugify("Señor Phở & Bánh Mì!")).toBe("senor-pho-banh-mi");
    expect(slugify("  Kim's   BBQ  ")).toBe("kim-s-bbq");
  });
});
