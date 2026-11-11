import "server-only";

import path from "node:path";

import { BUILD_SECRET } from "@/generated/secret";
import { formatLocalTimestamp, makeReference, resolveInboxSettings, type Business, type Submission } from "@/lib/inbox";
import { isPremium, site } from "@/lib/site";
import { addressOneLine } from "@/lib/site/format";
import { siteUrl } from "@/lib/site/seo";

import { cateringForm, contactForm, formatLongDate, todayIn, type FormDef, type FormValues } from "./definitions";

/** Signs form tokens. FORM_SECRET (32+ characters) overrides the per-build secret when set. */
export const formSecret =
  process.env.FORM_SECRET && process.env.FORM_SECRET.length >= 32 ? process.env.FORM_SECRET : BUILD_SECRET;

export const cateringFormEnabled = site.catering.enabled && site.catering.form;
export const contactFormEnabled = isPremium;

/** The form definition for a kind, or undefined when this client's plan does not include it. */
export function getFormDef(kind: unknown): FormDef | undefined {
  if (kind === "catering" && cateringFormEnabled) {
    return cateringForm({
      serviceTypes: site.catering.serviceTypes,
      minGuests: site.catering.minGuests,
      maxGuests: site.catering.maxGuests,
      leadTimeDays: site.catering.leadTimeDays,
    });
  }
  if (kind === "contact" && contactFormEnabled) return contactForm();
  return undefined;
}

export const business: Business = {
  name: site.name,
  phone: site.contact.phone,
  address: addressOneLine(site.contact.address),
  ownerEmail: site.contact.email,
};

export const inboxSettings = resolveInboxSettings({
  sample: site.sample,
  dataDir: path.join(process.cwd(), "data"),
});

const PREFIX: Record<string, string> = { catering: "CAT", contact: "MSG" };

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function buildSubmission(def: FormDef, values: FormValues, now: Date): Submission {
  let summary = "";
  let ackSummary = "";
  if (def.kind === "catering") {
    // Built only from the validated date and guest count, never from free text.
    const guests = `${values.guests} ${values.guests === "1" ? "guest" : "guests"}`;
    summary = `${shortDate(values.eventDate)} · ${guests}`;
    ackSummary = ` for ${formatLongDate(values.eventDate)} (${guests})`;
  } else if (def.kind === "contact") {
    summary = values.topic ?? "";
  }

  return {
    id: makeReference(PREFIX[def.kind] ?? "REQ", todayIn(site.timezone, now)),
    kind: def.kind,
    kindLabel: def.label,
    submittedAt: now.toISOString(),
    submittedAtLocal: formatLocalTimestamp(now, site.timezone),
    source: new URL(siteUrl).host,
    customer: { name: values.name, email: values.email },
    summary,
    ackSummary,
    fields: def.fields.map((f) => ({ label: f.label, value: values[f.name] ?? "" })),
  };
}
