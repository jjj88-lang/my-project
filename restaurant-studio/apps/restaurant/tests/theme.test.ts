import { describe, expect, it } from "vitest";

import { contrast, hexToRgb, isDark, luminance, mix, readableOn, rgbToHex } from "@/lib/site/color";
import { buildTheme, checkThemeContrast, themeCssVars } from "@/lib/site/theme";

describe("color helpers", () => {
  it("parses and prints hex colors", () => {
    expect(hexToRgb("#dd9a54")).toEqual({ r: 221, g: 154, b: 84 });
    expect(rgbToHex({ r: 221, g: 154, b: 84 })).toBe("#dd9a54");
    expect(() => hexToRgb("#fff")).toThrow();
  });

  it("computes WCAG contrast", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2); // the well-known "just fails AA" grey
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("mixes in sRGB like CSS color-mix", () => {
    expect(mix("#ffffff", "#000000", 0.5)).toBe("#808080");
    expect(mix("#ff0000", "#0000ff", 0.25)).toBe("#4000bf");
  });

  it("picks readable text for a background", () => {
    expect(readableOn("#dd9a54")).toBe("#14110f");
    expect(readableOn("#7a1010")).toBe("#ffffff");
    expect(isDark("#0e0c0a")).toBe(true);
    expect(isDark("#faf6ef")).toBe(false);
  });
});

describe("theme", () => {
  const hibana = buildTheme({
    colors: { background: "#0e0c0a", text: "#f4ede1", accent: "#dd9a54", accentText: "#171008" },
    fonts: "editorial",
    corners: "sharp",
    hero: "cinematic",
  });

  it("derives the full token set from three brand colors", () => {
    expect(hibana.dark).toBe(true);
    expect(hibana.radius).toBe("0px");
    expect(Object.keys(themeCssVars(hibana))).toEqual([
      "--c-bg",
      "--c-surface",
      "--c-raised",
      "--c-ink",
      "--c-muted",
      "--c-line",
      "--c-accent",
      "--c-on-accent",
      "--radius",
      "--radius-lg",
    ]);
  });

  it("passes the Hibana palette with no errors", () => {
    expect(checkThemeContrast(hibana).filter((i) => i.level === "error")).toEqual([]);
  });

  it("derives secondary text that still meets AA on the page and on cards", () => {
    expect(contrast(hibana.muted, hibana.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hibana.muted, hibana.raised)).toBeGreaterThanOrEqual(4.5);
  });

  it("rejects an accent that is unreadable on the background", () => {
    const issues = checkThemeContrast(
      buildTheme({
        colors: { background: "#ffffff", text: "#1a1a1a", accent: "#ffd84d" },
        fonts: "modern",
        corners: "soft",
        hero: "split",
      }),
    );
    expect(issues.some((i) => i.level === "error" && i.message.startsWith("Accent color used as text"))).toBe(true);
  });

  it("rejects low-contrast body text and reports the measured ratio", () => {
    const issues = checkThemeContrast(
      buildTheme({
        colors: { background: "#ffffff", text: "#9a9a9a", accent: "#7a1010" },
        fonts: "classic",
        corners: "round",
        hero: "split",
      }),
    );
    const body = issues.find((i) => i.message.startsWith("Body text:"));
    expect(body?.level).toBe("error");
    expect(body?.message).toMatch(/2\.\d\d:1/);
  });

  it("only warns when body text is readable but below the recommended 7:1", () => {
    const issues = checkThemeContrast(
      buildTheme({
        colors: { background: "#ffffff", text: "#666666", accent: "#7a1010" },
        fonts: "classic",
        corners: "round",
        hero: "split",
      }),
    );
    expect(issues.find((i) => i.message.startsWith("Body text:"))?.level).toBe("warning");
  });

  it("picks button text automatically when accentText is omitted", () => {
    const t = buildTheme({
      colors: { background: "#faf6ef", text: "#1c1917", accent: "#a3261c" },
      fonts: "modern",
      corners: "soft",
      hero: "split",
    });
    expect(t.onAccent).toBe("#ffffff");
    expect(contrast(t.onAccent, t.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
