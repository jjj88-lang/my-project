import type { Route } from "next";

export type NavItem = { label: string; href: Route };

/** Primary navigation, in the order an owner tends to ask: what, proof, how, who, questions. */
export const NAV: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "Work", href: "/work" },
  { label: "Process", href: "/process" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

export const CONTACT: NavItem = { label: "Book a call", href: "/contact" };

/** Pages listed in the sitemap. /pay and /thanks are deliberately left out (they are noindex). */
export const INDEXED_ROUTES: Route[] = [
  "/",
  "/services",
  "/work",
  "/process",
  "/about",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
];
