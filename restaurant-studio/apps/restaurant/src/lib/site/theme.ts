import { contrast, isDark, mix, readableOn } from "./color";
import type { SiteConfig } from "./schema";

export type ThemeTokens = {
  dark: boolean;
  bg: string;
  surface: string;
  raised: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  onAccent: string;
  radius: string;
  radiusLg: string;
};

const RADII: Record<SiteConfig["theme"]["corners"], [string, string]> = {
  sharp: ["0px", "0px"],
  soft: ["6px", "14px"],
  round: ["14px", "28px"],
};

/** Turn the handful of brand colors in site.json into the full set of tokens the CSS uses. */
export function buildTheme(theme: SiteConfig["theme"]): ThemeTokens {
  const { background: bg, text: ink, accent } = theme.colors;
  const dark = isDark(bg);
  const surface = theme.colors.surface ?? mix(ink, bg, dark ? 0.055 : 0.04);
  const raised = mix(ink, bg, dark ? 0.1 : 0.075);
  const muted = mix(ink, bg, dark ? 0.68 : 0.7);
  const line = mix(ink, bg, dark ? 0.16 : 0.15);
  const onAccent = theme.colors.accentText ?? readableOn(accent);
  const [radius, radiusLg] = RADII[theme.corners];
  return { dark, bg, surface, raised, ink, muted, line, accent, onAccent, radius, radiusLg };
}

export function themeCssVars(t: ThemeTokens): Record<string, string> {
  return {
    "--c-bg": t.bg,
    "--c-surface": t.surface,
    "--c-raised": t.raised,
    "--c-ink": t.ink,
    "--c-muted": t.muted,
    "--c-line": t.line,
    "--c-accent": t.accent,
    "--c-on-accent": t.onAccent,
    "--radius": t.radius,
    "--radius-lg": t.radiusLg,
  };
}

export type ContrastIssue = { level: "error" | "warning"; message: string };

/**
 * WCAG AA checks for the color pairs the template actually renders as text.
 * Errors block the build: a client site must not ship with unreadable text.
 */
export function checkThemeContrast(t: ThemeTokens): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  // [what it is, foreground, background, minimum (error below), recommended (warning below)]
  const pairs: Array<[string, string, string, number, number]> = [
    ["Body text", t.ink, t.bg, 4.5, 7],
    ["Body text on cards", t.ink, t.raised, 4.5, 4.5],
    ["Secondary text", t.muted, t.bg, 4.5, 4.5],
    ["Secondary text on cards", t.muted, t.raised, 4.5, 4.5],
    ["Accent color used as text", t.accent, t.bg, 4.5, 4.5],
    ["Accent color used as text on cards", t.accent, t.raised, 4.5, 4.5],
    ["Button text on the accent color", t.onAccent, t.accent, 4.5, 4.5],
  ];
  for (const [name, fg, bg, min, recommended] of pairs) {
    const ratio = contrast(fg, bg);
    const found = `${name}: ${fg} on ${bg} has a contrast ratio of ${ratio.toFixed(2)}:1`;
    if (ratio < min) {
      issues.push({ level: "error", message: `${found} (needs at least ${min}:1). Pick a color with more contrast.` });
    } else if (ratio < recommended) {
      issues.push({ level: "warning", message: `${found}. Readable, but ${recommended}:1 or more is recommended.` });
    }
  }
  return issues;
}
