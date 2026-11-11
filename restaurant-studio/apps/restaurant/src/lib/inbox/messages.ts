import type { Business, DeliveryPreview, EmailMessage, Submission } from "./types";

/**
 * The emails the inbox sends, as plain text.
 *
 * The Google Apps Script backend (automation/google-sheets-inbox/Code.gs) builds the same two
 * emails from the same data. A test renders both and compares them, so what the demo shows is
 * what a live site sends. If you change wording here, change it there too.
 */

export type AckTemplate = { subject: string; body: string[] };

export const ACK_TEMPLATES: Record<string, AckTemplate> = {
  catering: {
    subject: "We received your catering request | {business}",
    body: [
      "Hi {firstName},",
      "",
      "Thank you for thinking of {business}. We received your catering request{ackSummary}.",
      "",
      "This note only lets you know that your request arrived. It is not a confirmation of your event, availability or pricing. Someone from our team will review the details and contact you to talk through options and a quote.",
      "",
      "If your event is coming up soon, or anything changes, please call us at {phone}.",
      "",
      "Reference: {id}",
      "",
      "{business}",
      "{address}",
      "{phone}",
    ],
  },
  contact: {
    subject: "We received your message | {business}",
    body: [
      "Hi {firstName},",
      "",
      "Thank you for writing to {business}. Your message arrived, and we will reply as soon as we can.",
      "",
      "For same-day reservations or anything urgent, please call us at {phone}.",
      "",
      "Reference: {id}",
      "",
      "{business}",
      "{address}",
      "{phone}",
    ],
  },
  lead: {
    subject: "Thanks for reaching out | {business}",
    body: [
      "Hi {firstName},",
      "",
      "Thank you for contacting {business}. Your request arrived, and I will reply personally, usually within one business day.",
      "",
      "Nothing is booked or owed at this point. If it is easier to talk, call or text {phone}.",
      "",
      "Reference: {id}",
      "",
      "{business}",
      "{phone}",
    ],
  },
};

export const SHEET_NAMES: Record<string, string> = {
  catering: "Catering inquiries",
  contact: "Messages",
  lead: "Leads",
};

export function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first.replace(/[^\p{L}\p{M}'’-]/gu, "").slice(0, 40) || "there";
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

export function renderOwnerEmail(s: Submission, business: Business): EmailMessage {
  const lines = [
    `${s.kindLabel} received ${s.submittedAtLocal} through ${s.source}.`,
    "",
    ...s.fields.filter((f) => f.value !== "").map((f) => `${f.label}: ${f.value}`),
    "",
    `Reply to this email to answer ${firstName(s.customer.name)} directly.`,
    "",
    "Nothing has been confirmed with the customer. They were sent an automatic note saying their request arrived and that you will follow up.",
    "",
    `Reference: ${s.id}`,
  ];
  return {
    to: business.ownerEmail ?? "",
    replyTo: s.customer.email,
    subject: `New ${s.kindLabel.toLowerCase()}: ${s.customer.name}${s.summary ? ` (${s.summary})` : ""}`,
    text: lines.join("\n"),
  };
}

export function renderCustomerEmail(s: Submission, business: Business): EmailMessage {
  const template = ACK_TEMPLATES[s.kind] ?? ACK_TEMPLATES.contact;
  const vars = {
    firstName: firstName(s.customer.name),
    business: business.name,
    phone: business.phone,
    address: business.address,
    ackSummary: s.ackSummary,
    id: s.id,
  };
  return {
    to: s.customer.email,
    subject: fill(template.subject, vars),
    text: template.body.map((line) => fill(line, vars)).join("\n"),
  };
}

/**
 * Spreadsheet cells that begin with = + - @ are treated as formulas. Prefix those with an
 * apostrophe so text a visitor typed can never run as a formula in the owner's sheet.
 */
export function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function sheetRow(s: Submission): Record<string, string> {
  const row: Record<string, string> = {
    Received: s.submittedAtLocal,
    Reference: s.id,
    Status: "New",
  };
  for (const field of s.fields) row[field.label] = safeCell(field.value);
  return row;
}

export function buildPreview(s: Submission, business: Business): DeliveryPreview {
  return {
    sheet: SHEET_NAMES[s.kind] ?? "Inbox",
    row: sheetRow(s),
    ownerEmail: renderOwnerEmail(s, business),
    customerEmail: renderCustomerEmail(s, business),
  };
}
