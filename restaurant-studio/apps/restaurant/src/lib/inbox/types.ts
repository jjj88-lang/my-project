/**
 * The inquiry inbox: what happens after a visitor submits a form.
 *
 *   validate  ->  record  ->  notify the owner  ->  acknowledge the customer
 *
 * This folder is shared, byte for byte, by the restaurant template and the agency site
 * (see scripts/check-shared.mjs at the repository root). It has no framework imports.
 */

export type SubmissionField = { label: string; value: string };

export type Submission = {
  /** Short reference shown to the customer and the owner, e.g. "CAT-20261212-7F3K". */
  id: string;
  /** Machine name. Decides which sheet tab and which acknowledgment template is used. */
  kind: string;
  /** Human name, e.g. "Catering inquiry". */
  kindLabel: string;
  /** ISO timestamp. */
  submittedAt: string;
  /** Already formatted in the business's time zone, e.g. "Wed, Nov 11, 2026 at 2:05 PM". */
  submittedAtLocal: string;
  /** Where it came from, e.g. the site's host name. */
  source: string;
  customer: { name: string; email: string };
  /** One line for the owner's subject line, e.g. "Sat, Dec 12, 2026 · 40 guests". May be empty. */
  summary: string;
  /**
   * Text spliced into the customer acknowledgment, e.g. " for Saturday, December 12, 2026 (40 guests)".
   * Built only from validated dates and numbers, never from free text the visitor typed.
   */
  ackSummary: string;
  /** Everything the visitor entered, in form order. */
  fields: SubmissionField[];
};

export type Business = {
  name: string;
  phone: string;
  /** One-line postal address. */
  address: string;
  /** Where owner notifications go (local driver only; the Google driver uses the script's own setting). */
  ownerEmail?: string;
};

export type EmailMessage = {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
};

export type DeliveryPreview = {
  sheet: string;
  row: Record<string, string>;
  ownerEmail: EmailMessage;
  customerEmail: EmailMessage;
};

export type Delivery =
  | { ok: true; driver: DriverName; preview?: DeliveryPreview }
  | { ok: false; driver: DriverName | "unconfigured"; error: string };

export type DriverName = "demo" | "local" | "google";

export type InboxSettings =
  | { driver: "demo" }
  | { driver: "local"; dir: string }
  | { driver: "google"; url: string; secret: string }
  | { driver: "unconfigured"; reason: string };
