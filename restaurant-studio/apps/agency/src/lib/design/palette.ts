/**
 * The site's colors, and every text-on-background pair the pages use.
 *
 * The values are repeated in src/app/globals.css (Tailwind reads its tokens from CSS). A test
 * compares the two files and checks each pair below against WCAG AA, so a color cannot be
 * changed in one place only, and a change that makes text hard to read fails the build checks.
 */

export const palette = {
  /** Warm paper: the page background. */
  paper: "#f6f0e4",
  /** A deeper sheet of the same paper, for alternating sections and insets. */
  paperDeep: "#ece3d0",
  /** Lighter stock: order tickets, the guest check, the menu card, form fields. */
  card: "#fcf8ef",
  /** Body text. */
  ink: "#1b1814",
  /** Secondary text. */
  inkSoft: "#58544e",
  /** Placeholder text inside form fields. */
  inkFaint: "#67625b",
  /** Deep tomato: links, prices, small labels, primary buttons. */
  accent: "#b5350f",
  /** Pressed and hover state of the accent. */
  accentDeep: "#96290a",
  /** Deep green-black: contrast bands and the footer. */
  band: "#17231c",
  /** A panel sitting on the band. */
  bandRaised: "#27312a",
  /** Text on the band. */
  onBand: "#f6f0e4",
  /** Secondary text on the band. */
  onBandSoft: "#b8b7ac",
  /** The accent, lightened so it reads on the band. */
  accentOnBand: "#f2946b",
  /** Borders of inputs and other controls (needs 3:1 against its background). */
  field: "#757068",
  danger: "#9b1c1c",
  success: "#1f5c43",
} as const;

export type ColorName = keyof typeof palette;

/** CSS custom property for a palette entry: paperDeep -> --color-paper-deep. */
export function cssVariable(name: ColorName): string {
  return `--color-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** WCAG AA: 4.5 for text, 3 for large text and for the edges of controls. */
export const AA_TEXT = 4.5;
export const AA_LARGE_OR_UI = 3;

export type Pair = { fg: ColorName; bg: ColorName; min: number; use: string };

const text = (fg: ColorName, bg: ColorName, use: string): Pair => ({ fg, bg, min: AA_TEXT, use });
const edge = (fg: ColorName, bg: ColorName, use: string): Pair => ({ fg, bg, min: AA_LARGE_OR_UI, use });

/** Every foreground and background combination used in the stylesheet and components. */
export const PAIRS: Pair[] = [
  text("ink", "paper", "body text"),
  text("ink", "paperDeep", "body text in alternating sections"),
  text("ink", "card", "text on tickets, checks and form fields"),
  text("inkSoft", "paper", "secondary text"),
  text("inkSoft", "paperDeep", "secondary text in alternating sections"),
  text("inkSoft", "card", "secondary text on cards"),
  text("inkFaint", "card", "placeholder text in form fields"),
  text("accent", "paper", "links, prices and small labels"),
  text("accent", "paperDeep", "links and labels in alternating sections"),
  text("accent", "card", "links, prices and labels on cards"),
  text("card", "accent", "primary button label"),
  text("card", "accentDeep", "primary button label, hover"),
  text("paper", "ink", "dark button label, ticket headers"),
  text("card", "ink", "button label on the accent band, hover"),
  text("accentDeep", "card", "ghost button label on the accent band, hover"),
  text("onBand", "band", "text on the dark band"),
  text("onBandSoft", "band", "secondary text on the dark band"),
  text("accentOnBand", "band", "links and labels on the dark band"),
  text("onBand", "bandRaised", "text on a panel inside the band"),
  text("onBandSoft", "bandRaised", "secondary text on a panel inside the band"),
  text("accentOnBand", "bandRaised", "labels on a panel inside the band"),
  text("band", "accentOnBand", "button label on the dark band"),
  text("danger", "paper", "error messages"),
  text("danger", "card", "error messages on cards"),
  text("success", "paper", "confirmation messages"),
  text("success", "card", "confirmation messages on cards"),
  edge("field", "card", "input borders"),
  edge("field", "paper", "control borders on the page"),
  edge("field", "paperDeep", "control borders in alternating sections"),
  edge("accent", "paper", "focus ring"),
  edge("accent", "card", "focus ring on cards"),
  edge("accentOnBand", "band", "focus ring on the dark band"),
  edge("card", "accent", "focus ring on the accent band"),
];
