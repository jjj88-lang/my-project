/**
 * Stripe-hosted Payment Links for the /pay page.
 *
 * The links are created in the owner's Stripe account and pasted into environment variables.
 * This site never handles a card number: each link opens a payment page on stripe.com.
 * A value is used only if it really is a Stripe Payment Link, so a typo or a pasted link to
 * somewhere else can never be shown as a payment button.
 */

export const STRIPE_LINK_KEYS = [
  "starterDeposit",
  "starterBalance",
  "premiumDeposit",
  "premiumBalance",
  "cateringDeposit",
  "cateringBalance",
  "maintenance",
] as const;

export type StripeLinkKey = (typeof STRIPE_LINK_KEYS)[number];

export const STRIPE_LINK_VARS: Record<StripeLinkKey, string> = {
  starterDeposit: "NEXT_PUBLIC_STRIPE_LINK_STARTER_DEPOSIT",
  starterBalance: "NEXT_PUBLIC_STRIPE_LINK_STARTER_BALANCE",
  premiumDeposit: "NEXT_PUBLIC_STRIPE_LINK_PREMIUM_DEPOSIT",
  premiumBalance: "NEXT_PUBLIC_STRIPE_LINK_PREMIUM_BALANCE",
  cateringDeposit: "NEXT_PUBLIC_STRIPE_LINK_CATERING_DEPOSIT",
  cateringBalance: "NEXT_PUBLIC_STRIPE_LINK_CATERING_BALANCE",
  maintenance: "NEXT_PUBLIC_STRIPE_LINK_MAINTENANCE",
};

export type StripeLink = {
  url: string;
  /** Stripe's test-mode links start with /test_. They take no real money. */
  testMode: boolean;
};

export type StripeLinkCheck = { ok: true; link: StripeLink } | { ok: false; reason: "empty" | "not-a-stripe-link" };

/** Accepts only https://buy.stripe.com/<something>. Anything else is rejected. */
export function checkStripeLink(value: unknown): StripeLinkCheck {
  if (typeof value !== "string" || value.trim() === "") return { ok: false, reason: "empty" };
  const text = value.trim();
  // Whitespace or control characters inside the value mean it is not a clean link.
  if (/\s/.test(text)) return { ok: false, reason: "not-a-stripe-link" };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: "not-a-stripe-link" };
  }
  const isStripe =
    url.protocol === "https:" &&
    url.hostname === "buy.stripe.com" &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    url.pathname.length > 1;
  if (!isStripe) return { ok: false, reason: "not-a-stripe-link" };

  return { ok: true, link: { url: url.toString(), testMode: url.pathname.startsWith("/test_") } };
}

/**
 * The raw values, read one by one. Next.js replaces each `process.env.NEXT_PUBLIC_...` with its
 * value at build time, which only works when the name is written out in full like this.
 */
function rawLinksFromEnvironment(): Record<StripeLinkKey, string | undefined> {
  return {
    starterDeposit: process.env.NEXT_PUBLIC_STRIPE_LINK_STARTER_DEPOSIT,
    starterBalance: process.env.NEXT_PUBLIC_STRIPE_LINK_STARTER_BALANCE,
    premiumDeposit: process.env.NEXT_PUBLIC_STRIPE_LINK_PREMIUM_DEPOSIT,
    premiumBalance: process.env.NEXT_PUBLIC_STRIPE_LINK_PREMIUM_BALANCE,
    cateringDeposit: process.env.NEXT_PUBLIC_STRIPE_LINK_CATERING_DEPOSIT,
    cateringBalance: process.env.NEXT_PUBLIC_STRIPE_LINK_CATERING_BALANCE,
    maintenance: process.env.NEXT_PUBLIC_STRIPE_LINK_MAINTENANCE,
  };
}

/**
 * Test-mode links are for trying the flow out. They are shown in development and on preview
 * deployments, and never on the live site, where a client could mistake one for the real thing.
 */
function testLinksAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
}

/** The links that may be shown, keyed by purpose. A missing or invalid value is simply absent. */
export function resolveStripeLinks(
  raw: Partial<Record<StripeLinkKey, string | undefined>> = rawLinksFromEnvironment(),
  allowTestLinks: boolean = testLinksAllowed(),
): Partial<Record<StripeLinkKey, StripeLink>> {
  const links: Partial<Record<StripeLinkKey, StripeLink>> = {};
  for (const key of STRIPE_LINK_KEYS) {
    const check = checkStripeLink(raw[key]);
    if (!check.ok) continue;
    if (check.link.testMode && !allowTestLinks) continue;
    links[key] = check.link;
  }
  return links;
}
