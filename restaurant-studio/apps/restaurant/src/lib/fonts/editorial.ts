/** Elegant, high-contrast serif headlines with a clean geometric sans. Suits upscale and traditional concepts. */
import { Cormorant, Manrope } from "next/font/google";

export const displayFont = Cormorant({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--ff-display",
  display: "swap",
});

export const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--ff-body",
  display: "swap",
});
