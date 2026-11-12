/** Bold, characterful grotesque headlines with a friendly sans. Suits casual, lively concepts. */
import { Bricolage_Grotesque, Figtree } from "next/font/google";

export const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--ff-display",
  display: "swap",
});

export const bodyFont = Figtree({
  subsets: ["latin"],
  variable: "--ff-body",
  display: "swap",
});
