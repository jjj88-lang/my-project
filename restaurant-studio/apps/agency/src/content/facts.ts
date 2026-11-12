/**
 * The few facts on the site that do not come from pricing.json or studio.json.
 * Each one is a statement the owner should confirm before launch and revisit now and then.
 */

/**
 * What a client pays a hosting company when they host the site themselves.
 * Checked in November 2026 against the hosts' published plans: some free plans allow business
 * sites, and a paid plan at the provider the studio uses is about $20 a month.
 */
export const SELF_HOSTING_COST = "from nothing on a free plan that allows business sites to about $20 a month";

/** How quickly a new inquiry gets a personal reply. The automatic acknowledgment email says the same. */
export const INQUIRY_REPLY_TIME = "within one business day";

/** Length of the free first call. */
export const FIRST_CALL_MINUTES = 15;
