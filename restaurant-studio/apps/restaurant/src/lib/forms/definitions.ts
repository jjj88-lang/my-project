/**
 * Form definitions and validation, shared by the browser (instant feedback) and the
 * server (the authoritative check). No framework imports, so both sides can use it.
 */

export type FieldType = "text" | "email" | "tel" | "date" | "number" | "select" | "textarea";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  help?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  width?: "half" | "full";
};

export type FormKind = "catering" | "contact";

export type FormDef = {
  kind: FormKind;
  /** Human name of a submission, e.g. "Catering inquiry". */
  label: string;
  fields: FieldDef[];
  submitLabel: string;
  /** Earliest event date is today plus this many days. Catering only. */
  leadTimeDays?: number;
  successTitle: string;
  successBody: string;
  /** Shown above the submit button so nobody mistakes the form for a booking. */
  disclaimer: string;
};

export type FormValues = Record<string, string>;
export type FieldErrors = Record<string, string>;

export type ValidationContext = {
  /** Today's date in the restaurant's time zone, "YYYY-MM-DD". */
  today: string;
  phone: string;
};

export type ValidationResult = { ok: true; values: FormValues } | { ok: false; errors: FieldErrors };

export const BUDGET_OPTIONS = ["Not sure yet", "Under $500", "$500 to $1,000", "$1,000 to $2,500", "More than $2,500"];

export function cateringForm(opts: {
  serviceTypes: string[];
  minGuests: number;
  maxGuests: number;
  leadTimeDays: number;
}): FormDef {
  return {
    kind: "catering",
    label: "Catering inquiry",
    leadTimeDays: opts.leadTimeDays,
    submitLabel: "Send my request",
    successTitle: "Your request is in.",
    successBody:
      "We sent a note to your email so you know it arrived. Someone from our team will contact you to talk through availability, the menu and a quote.",
    disclaimer:
      "Sending this form does not book your event. We will contact you to confirm availability, the menu and pricing.",
    fields: [
      { name: "name", label: "Your name", type: "text", required: true, autoComplete: "name", maxLength: 80, width: "half" },
      { name: "email", label: "Email", type: "email", required: true, autoComplete: "email", width: "half" },
      { name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel", width: "half" },
      {
        name: "eventDate",
        label: "Event date",
        type: "date",
        required: true,
        width: "half",
        help:
          opts.leadTimeDays > 0
            ? `We need at least ${opts.leadTimeDays} ${opts.leadTimeDays === 1 ? "day" : "days"} of notice. For sooner dates, please call.`
            : undefined,
      },
      {
        name: "guests",
        label: "Number of guests",
        type: "number",
        required: true,
        min: opts.minGuests,
        max: opts.maxGuests,
        width: "half",
        help: `${opts.minGuests} to ${opts.maxGuests} guests.`,
      },
      {
        name: "serviceType",
        label: "Type of service",
        type: "select",
        required: true,
        options: opts.serviceTypes,
        placeholder: "Choose one",
        width: "half",
      },
      {
        name: "eventTime",
        label: "Approximate start time",
        type: "text",
        placeholder: "6:30 PM",
        maxLength: 40,
        width: "half",
      },
      { name: "budget", label: "Budget", type: "select", options: BUDGET_OPTIONS, placeholder: "Optional", width: "half" },
      {
        name: "location",
        label: "Event address",
        type: "text",
        autoComplete: "street-address",
        maxLength: 160,
        help: "For delivery or on-site service. Leave blank for pickup or our private room.",
        width: "full",
      },
      {
        name: "details",
        label: "Anything else we should know?",
        type: "textarea",
        maxLength: 1500,
        placeholder: "The occasion, allergies or dietary needs, dishes you have in mind…",
        width: "full",
      },
    ],
  };
}

export const CONTACT_TOPICS = ["General question", "Large party or group dinner", "Feedback about a visit", "Lost and found", "Something else"];

export function contactForm(): FormDef {
  return {
    kind: "contact",
    label: "Website message",
    submitLabel: "Send message",
    successTitle: "Message sent.",
    successBody: "Thank you for writing. We read every message and will reply as soon as we can.",
    disclaimer: "For same-day reservations or anything urgent, calling is fastest.",
    fields: [
      { name: "name", label: "Your name", type: "text", required: true, autoComplete: "name", maxLength: 80, width: "half" },
      { name: "email", label: "Email", type: "email", required: true, autoComplete: "email", width: "half" },
      { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", help: "Optional.", width: "half" },
      { name: "topic", label: "What is this about?", type: "select", required: true, options: CONTACT_TOPICS, placeholder: "Choose one", width: "half" },
      { name: "message", label: "Message", type: "textarea", required: true, maxLength: 2000, width: "full" },
    ],
  };
}

/* ------------------------------- Validation -------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Control characters other than tab, newline and carriage return.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trim, drop control characters, normalize line endings and cap the length. */
export function cleanText(value: unknown, maxLength: number, multiline: boolean): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  let text = String(value).replace(CONTROL_CHARS, "").replace(/\r\n?/g, "\n");
  text = multiline ? text.replace(/\n{3,}/g, "\n\n") : text.replace(/\s+/g, " ");
  return text.trim().slice(0, maxLength);
}

export function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isRealDate(date: string): boolean {
  if (!ISO_DATE.test(date)) return false;
  const d = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** Today's date ("YYYY-MM-DD") in a given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "2026-12-12" -> "Saturday, December 12, 2026" */
export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function defaultMax(field: FieldDef): number {
  if (field.maxLength) return field.maxLength;
  if (field.type === "textarea") return 2000;
  if (field.type === "email") return 254;
  return 200;
}

/**
 * Validate and normalize a submission against a form definition.
 * Unknown fields are dropped; every value comes back as a trimmed string.
 */
export function validate(def: FormDef, raw: Record<string, unknown>, ctx: ValidationContext): ValidationResult {
  const values: FormValues = {};
  const errors: FieldErrors = {};

  for (const field of def.fields) {
    const value = cleanText(raw[field.name], defaultMax(field), field.type === "textarea");
    values[field.name] = value;

    if (!value) {
      if (field.required) {
        errors[field.name] =
          field.type === "select" ? `Please choose an option for "${field.label}".` : `Please fill in "${field.label}".`;
      }
      continue;
    }

    switch (field.type) {
      case "email":
        if (!EMAIL.test(value)) errors[field.name] = "Enter an email address like name@example.com.";
        break;
      case "tel": {
        const digits = value.replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) errors[field.name] = "Enter a phone number with its area code.";
        break;
      }
      case "number": {
        if (!/^\d{1,6}$/.test(value)) {
          errors[field.name] = "Enter a whole number.";
          break;
        }
        const n = Number(value);
        values[field.name] = String(n);
        if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
          errors[field.name] =
            field.min !== undefined && field.max !== undefined
              ? `We can help with ${field.min} to ${field.max} guests online. For other sizes, please call ${ctx.phone}.`
              : "That number is out of range.";
        }
        break;
      }
      case "select":
        if (!field.options?.includes(value)) errors[field.name] = "Please choose one of the listed options.";
        break;
      case "date": {
        if (!isRealDate(value)) {
          errors[field.name] = "Enter a valid date.";
          break;
        }
        const lead = def.leadTimeDays ?? 0;
        const earliest = addDaysIso(ctx.today, lead);
        if (value < ctx.today) {
          errors[field.name] = "That date has already passed.";
        } else if (value < earliest) {
          errors[field.name] = `That is less than ${lead} ${lead === 1 ? "day" : "days"} away. Please call ${ctx.phone} so we can help right away.`;
        } else if (value > addDaysIso(ctx.today, 730)) {
          errors[field.name] = "Please choose a date within the next two years.";
        }
        break;
      }
      default:
        break;
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, values };
}
