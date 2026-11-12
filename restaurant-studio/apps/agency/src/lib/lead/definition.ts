/**
 * The consultation request form: its fields and its validation.
 *
 * Shared by the browser (instant feedback) and the server (the check that counts).
 * No framework imports, so both sides and the tests can use it.
 */

export type FieldType = "text" | "email" | "tel" | "select" | "radio" | "textarea";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  help?: string;
  maxLength?: number;
  options?: readonly string[];
  width?: "half" | "full";
};

export const NEED_OPTIONS = [
  "New website",
  "Redesign of an existing site",
  "Catering inquiry form",
  "Ongoing maintenance",
  "Not sure yet",
] as const;

export const REACH_OPTIONS = ["Email", "Phone call", "Text"] as const;

/**
 * The name of the hidden honeypot field. Chosen so that no browser autofill mistakes it for a
 * real field (a name like "company" or "website" can get filled in for a real person).
 */
export const HONEYPOT_FIELD = "seating_preference";

export const LEAD_KIND = "lead";
export const LEAD_KIND_LABEL = "Website lead";
export const LEAD_REFERENCE_PREFIX = "LEAD";

export const LEAD_FIELDS: FieldDef[] = [
  { name: "name", label: "Your name", type: "text", required: true, autoComplete: "name", maxLength: 80, width: "half" },
  {
    name: "restaurant",
    label: "Restaurant name",
    type: "text",
    required: true,
    autoComplete: "organization",
    maxLength: 120,
    width: "half",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    autoComplete: "email",
    inputMode: "email",
    maxLength: 254,
    width: "half",
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    autoComplete: "tel",
    inputMode: "tel",
    maxLength: 40,
    help: "Optional, unless you would like a call or a text.",
    width: "half",
  },
  {
    name: "cityState",
    label: "City and state",
    type: "text",
    required: true,
    placeholder: "Topeka, KS",
    maxLength: 80,
    width: "half",
  },
  {
    name: "website",
    label: "Current website",
    type: "text",
    autoComplete: "url",
    inputMode: "url",
    maxLength: 200,
    help: "Optional. A Facebook or Instagram page counts.",
    width: "half",
  },
  {
    name: "need",
    label: "What do you need?",
    type: "select",
    required: true,
    options: NEED_OPTIONS,
    placeholder: "Choose one",
    width: "half",
  },
  {
    name: "reach",
    label: "Best way to reach you",
    type: "radio",
    required: true,
    options: REACH_OPTIONS,
    width: "half",
  },
  {
    name: "message",
    label: "Anything else?",
    type: "textarea",
    maxLength: 2000,
    help: "Optional. What is not working today, a deadline, a good time to call.",
    width: "full",
  },
];

export type LeadValues = Record<string, string>;
export type FieldErrors = Record<string, string>;
export type ValidationResult = { ok: true; values: LeadValues } | { ok: false; errors: FieldErrors };

export function emptyLeadValues(): LeadValues {
  return Object.fromEntries(LEAD_FIELDS.map((field) => [field.name, ""]));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Control characters other than tab, newline and carriage return.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trim, drop control characters, normalize line endings and cap the length. */
export function cleanText(value: unknown, maxLength: number, multiline: boolean): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  let text = String(value).replace(CONTROL_CHARS, "").replace(/\r\n?/g, "\n");
  text = multiline ? text.replace(/\n{3,}/g, "\n\n") : text.replace(/\s+/g, " ");
  return text.trim().slice(0, maxLength);
}

function maxLengthOf(field: FieldDef): number {
  if (field.maxLength) return field.maxLength;
  return field.type === "textarea" ? 2000 : 200;
}

/**
 * Validate and normalize a submission. Unknown fields are dropped and every value comes back
 * as a trimmed string, so nothing reaches the inbox that was not checked here.
 */
export function validateLead(raw: Record<string, unknown>): ValidationResult {
  const values: LeadValues = {};
  const errors: FieldErrors = {};

  for (const field of LEAD_FIELDS) {
    const value = cleanText(raw[field.name], maxLengthOf(field), field.type === "textarea");
    values[field.name] = value;

    if (!value) {
      if (field.required) {
        errors[field.name] =
          field.type === "select" || field.type === "radio"
            ? `Please choose an option for "${field.label}".`
            : `Please fill in "${field.label}".`;
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
      case "select":
      case "radio":
        if (!field.options?.includes(value)) errors[field.name] = "Please choose one of the listed options.";
        break;
      default:
        break;
    }
  }

  // Asking for a call or a text without leaving a number is the one cross-field rule.
  if (!errors.phone && !values.phone && (values.reach === "Phone call" || values.reach === "Text")) {
    errors.phone =
      values.reach === "Text"
        ? "Add a phone number so I can text you, or choose Email."
        : "Add a phone number so I can call you, or choose Email.";
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, values };
}
