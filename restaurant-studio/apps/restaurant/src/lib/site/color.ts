/** Small color helpers used to derive a theme and to check WCAG contrast. */

export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a 6-digit hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix `amount` (0 to 1) of `a` into `b`, in sRGB. Matches CSS `color-mix(in srgb, a X%, b)`. */
export function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({
    r: x.r * amount + y.r * (1 - amount),
    g: x.g * amount + y.g * (1 - amount),
    b: x.b * amount + y.b * (1 - amount),
  });
}

/** WCAG 2 relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2 contrast ratio between two colors (1 to 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.18;
}

/** Black-ish or white-ish, whichever reads better on `bg`. */
export function readableOn(bg: string, dark = "#14110f", light = "#ffffff"): string {
  return contrast(dark, bg) >= contrast(light, bg) ? dark : light;
}
