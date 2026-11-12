/**
 * Sample submissions shaped exactly like the Submission type in
 * apps/restaurant/src/lib/inbox/types.ts. All people and addresses are invented.
 */
import { SECRET } from "./load-code.mjs";

export const SAMPLES = {
  catering: {
    id: "CAT-20261212-7F3K",
    kind: "catering",
    kindLabel: "Catering inquiry",
    submittedAt: "2026-11-11T20:05:00.000Z",
    submittedAtLocal: "Wed, Nov 11, 2026 at 2:05 PM",
    source: "hibana.example",
    customer: { name: "Mary-Jane O'Neil", email: "mj.oneil@example.com" },
    summary: "Sat, Dec 12, 2026 · 40 guests",
    ackSummary: " for Saturday, December 12, 2026 (40 guests)",
    fields: [
      { label: "Your name", value: "Mary-Jane O'Neil" },
      { label: "Email", value: "mj.oneil@example.com" },
      { label: "Phone", value: "+1 785 555 0100" },
      { label: "Event date", value: "2026-12-12" },
      { label: "Number of guests", value: "40" },
      { label: "Type of service", value: "Drop-off" },
      { label: "Approximate start time", value: "" },
      { label: "Budget", value: "" },
      { label: "Event address", value: "" },
      { label: "Anything else we should know?", value: '=HYPERLINK("http://bad.example","click")\nSecond line' },
    ],
  },
  contact: {
    id: "MSG-20261111-Q2ZX",
    kind: "contact",
    kindLabel: "Website message",
    submittedAt: "2026-11-11T20:06:30.000Z",
    submittedAtLocal: "Wed, Nov 11, 2026 at 2:06 PM",
    source: "bulmat.example",
    customer: { name: "José Álvarez 3rd", email: "jose@example.org" },
    summary: "General question",
    ackSummary: "",
    fields: [
      { label: "Your name", value: "José Álvarez 3rd" },
      { label: "Email", value: "jose@example.org" },
      { label: "Phone", value: "" },
      { label: "What is this about?", value: "General question" },
      { label: "Message", value: "@SUM(A1:A2) do you have parking:" },
    ],
  },
  lead: {
    id: "LEAD-20261111-H8M4",
    kind: "lead",
    kindLabel: "Website lead",
    submittedAt: "2026-11-11T20:07:00.000Z",
    submittedAtLocal: "Wed, Nov 11, 2026 at 2:07 PM",
    source: "studio.example",
    customer: { name: "Sam Lee", email: "sam@sample-sushi.example" },
    summary: "Premium website",
    ackSummary: "",
    fields: [
      { label: "Your name", value: "Sam Lee" },
      { label: "Restaurant name", value: "Sample Sushi" },
      { label: "Email", value: "sam@sample-sushi.example" },
      { label: "Phone", value: "-5 is not a phone" },
      { label: "City and state", value: "Ithaca, NY" },
      { label: "Current website", value: "" },
      { label: "What do you need?", value: "Premium website" },
      { label: "Best way to reach you", value: "Email" },
      { label: "Anything else?", value: "\tTabbed start" },
    ],
  },
};

/** The same leading-character rule as safeCell in messages.ts (the parity test checks the real one). */
function safeCell(value) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** The request body deliverGoogle sends for a submission (see drivers/google.ts). */
export function requestFor(submission, overrides = {}) {
  return {
    version: 1,
    secret: SECRET,
    ...structuredClone(submission),
    fields: submission.fields.map((f) => ({ label: f.label, value: safeCell(f.value) })),
    ...overrides,
  };
}
