/** Warm, soft serif headlines with a humanist sans. Suits family restaurants, cafes and diners. */
import { Fraunces, Source_Sans_3 } from "next/font/google";

export const displayFont = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--ff-display",
  display: "swap",
});

export const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--ff-body",
  display: "swap",
});
