import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { contrast, hexToRgb, luminance, mix, rgbToHex } from "@/lib/design/contrast";
import { AA_LARGE_OR_UI, AA_TEXT, PAIRS, cssVariable, palette, type ColorName } from "@/lib/design/palette";

const css = fs.readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8");

/** Every `--color-name: #rrggbb;` declared in the stylesheet's theme. */
const cssColors = new Map(
  [...css.matchAll(/(--color-[a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [match[1], match[2].toLowerCase()]),
);

describe("contrast math", () => {
  it("matches the reference values from the WCAG definition", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrast("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#777777", "#ffffff")).toBeLessThan(4.5);
    expect(contrast("#123456", "#abcdef")).toBeCloseTo(contrast("#abcdef", "#123456"), 10);
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1, 10);
  });

  it("reads and writes hex colors, and mixes them the way CSS color-mix does", () => {
    expect(hexToRgb("#B5350F")).toEqual({ r: 181, g: 53, b: 15 });
    expect(rgbToHex({ r: 181, g: 53, b: 15 })).toBe("#b5350f");
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#000000", "#ffffff", 0)).toBe("#ffffff");
    expect(() => hexToRgb("#fff")).toThrow();
    expect(() => hexToRgb("tomato")).toThrow();
  });
});

describe("the palette", () => {
  it("is the same in palette.ts and in globals.css", () => {
    for (const name of Object.keys(palette) as ColorName[]) {
      expect(cssColors.get(cssVariable(name)), `${cssVariable(name)} in globals.css`).toBe(palette[name]);
    }
    // And the stylesheet defines no solid color that palette.ts does not know about.
    const known = new Set((Object.keys(palette) as ColorName[]).map(cssVariable));
    expect([...cssColors.keys()].filter((variable) => !known.has(variable))).toEqual([]);
  });

  it.each(PAIRS.map((pair) => [`${pair.fg} on ${pair.bg}`, pair.use, pair] as const))(
    "%s passes WCAG AA (%s)",
    (_name, _use, pair) => {
      expect(pair.min === AA_TEXT || pair.min === AA_LARGE_OR_UI).toBe(true);
      expect(contrast(palette[pair.fg], palette[pair.bg])).toBeGreaterThanOrEqual(pair.min);
    },
  );

  it("lists each pair once", () => {
    const keys = PAIRS.map((pair) => `${pair.fg}/${pair.bg}/${pair.min}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
