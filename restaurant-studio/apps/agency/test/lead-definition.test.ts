import { describe, expect, it } from "vitest";

import {
  HONEYPOT_FIELD,
  LEAD_FIELDS,
  NEED_OPTIONS,
  REACH_OPTIONS,
  cleanText,
  emptyLeadValues,
  validateLead,
  type LeadValues,
} from "@/lib/lead/definition";

/** A complete, sensible request. Individual tests change one thing at a time. */
function goodLead(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Jordan Rivera",
    restaurant: "Sample Sushi House",
    email: "jordan@example.com",
    phone: "(785) 555-0199",
    cityState: "Topeka, KS",
    website: "samplesushi.example",
    need: "New website",
    reach: "Email",
    message: "The menu on our site is a photo. We would like it fixed before spring.",
    ...overrides,
  };
}

function errorsOf(raw: Record<string, unknown>): Record<string, string> {
  const result = validateLead(raw);
  return result.ok ? {} : result.errors;
}

function valuesOf(raw: Record<string, unknown>): LeadValues {
  const result = validateLead(raw);
  if (!result.ok) throw new Error(`expected a valid lead, got ${JSON.stringify(result.errors)}`);
  return result.values;
}

describe("the consultation form's fields", () => {
  it("asks for exactly what the contact page promises, in order", () => {
    expect(LEAD_FIELDS.map((field) => field.label)).toEqual([
      "Your name",
      "Restaurant name",
      "Email",
      "Phone",
      "City and state",
      "Current website",
      "What do you need?",
      "Best way to reach you",
      "Anything else?",
    ]);
  });

  it("requires the essentials and leaves phone, website and the note optional", () => {
    const required = LEAD_FIELDS.filter((field) => field.required).map((field) => field.name);
    expect(required).toEqual(["name", "restaurant", "email", "cityState", "need", "reach"]);
  });

  it("offers the listed choices", () => {
    expect([...NEED_OPTIONS]).toEqual([
      "New website",
      "Redesign of an existing site",
      "Catering inquiry form",
      "Ongoing maintenance",
      "Not sure yet",
    ]);
    expect([...REACH_OPTIONS]).toEqual(["Email", "Phone call", "Text"]);
  });

  it("gives every field a unique name, and the honeypot a name of its own", () => {
    const names = LEAD_FIELDS.map((field) => field.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain(HONEYPOT_FIELD);
    // Names that browsers like to autofill would trap real people.
    expect(HONEYPOT_FIELD).not.toMatch(/^(name|email|phone|tel|company|website|url|address|organization)$/i);
  });

  it("starts with an empty value for every field", () => {
    const empty = emptyLeadValues();
    expect(Object.keys(empty)).toEqual(LEAD_FIELDS.map((field) => field.name));
    expect(Object.values(empty).every((value) => value === "")).toBe(true);
  });
});

describe("cleanText", () => {
  it("trims, collapses whitespace and drops control characters", () => {
    expect(cleanText("  Jordan \t  Rivera\u0000\u0007 ", 80, false)).toBe("Jordan Rivera");
    expect(cleanText("one\nline", 80, false)).toBe("one line");
  });

  it("keeps paragraph breaks in long text but not runs of blank lines", () => {
    expect(cleanText("First.\r\n\r\n\r\n\r\nSecond.\rThird.", 200, true)).toBe("First.\n\nSecond.\nThird.");
  });

  it("caps the length and ignores input that is not text", () => {
    expect(cleanText("x".repeat(500), 80, false)).toHaveLength(80);
    expect(cleanText(42, 80, false)).toBe("42");
    expect(cleanText({ toString: () => "sneaky" }, 80, false)).toBe("");
    expect(cleanText(["a", "b"], 80, false)).toBe("");
    expect(cleanText(null, 80, false)).toBe("");
    expect(cleanText(undefined, 80, false)).toBe("");
  });
});

describe("validateLead", () => {
  it("accepts a complete request and returns clean strings", () => {
    const values = valuesOf(goodLead({ name: "  Jordan   Rivera ", email: " jordan@example.com " }));
    expect(values).toEqual({
      name: "Jordan Rivera",
      restaurant: "Sample Sushi House",
      email: "jordan@example.com",
      phone: "(785) 555-0199",
      cityState: "Topeka, KS",
      website: "samplesushi.example",
      need: "New website",
      reach: "Email",
      message: "The menu on our site is a photo. We would like it fixed before spring.",
    });
  });

  it("accepts the shortest valid request: no phone, no website, no note", () => {
    const values = valuesOf(goodLead({ phone: "", website: undefined, message: null }));
    expect(values.phone).toBe("");
    expect(values.website).toBe("");
    expect(values.message).toBe("");
  });

  it("drops fields the form does not define", () => {
    const values = valuesOf(goodLead({ admin: "true", __proto__: { polluted: "yes" }, constructor: "x" }));
    expect(Object.keys(values).sort()).toEqual(LEAD_FIELDS.map((field) => field.name).sort());
  });

  it("requires each required field and says which one is missing", () => {
    const errors = errorsOf({});
    expect(Object.keys(errors).sort()).toEqual(["cityState", "email", "name", "need", "reach", "restaurant"]);
    expect(errors.name).toBe("Please fill in “Your name”.");
    expect(errors.restaurant).toBe("Please fill in “Restaurant name”.");
    expect(errors.need).toBe("Please choose an option for “What do you need”.");
    expect(errors.reach).toBe("Please choose an option for “Best way to reach you”.");
  });

  it("treats whitespace as empty", () => {
    expect(errorsOf(goodLead({ name: "   ", restaurant: "\t\n" }))).toEqual({
      name: "Please fill in “Your name”.",
      restaurant: "Please fill in “Restaurant name”.",
    });
  });

  it.each(["jordan", "jordan@", "@example.com", "jordan@example", "jordan @example.com", "jordan@exa mple.com"])(
    "rejects %j as an email address",
    (email) => {
      expect(errorsOf(goodLead({ email }))).toEqual({ email: "Enter an email address like name@example.com." });
    },
  );

  it.each(["jordan@example.com", "j.rivera+site@mail.example.co", "JORDAN@EXAMPLE.ORG"])(
    "accepts %j as an email address",
    (email) => {
      expect(validateLead(goodLead({ email })).ok).toBe(true);
    },
  );

  it("checks that a phone number has an area code, whatever its punctuation", () => {
    expect(errorsOf(goodLead({ phone: "555-0199" }))).toEqual({ phone: "Enter a phone number with its area code." });
    expect(errorsOf(goodLead({ phone: "call me" }))).toEqual({ phone: "Enter a phone number with its area code." });
    expect(errorsOf(goodLead({ phone: "1234567890123456" }))).toHaveProperty("phone");
    for (const phone of ["7855550199", "785.555.0199", "+1 (785) 555-0199", "785 555 0199 ext 2"]) {
      expect(validateLead(goodLead({ phone })).ok, phone).toBe(true);
    }
  });

  it("only accepts a listed choice for the two choice fields", () => {
    expect(errorsOf(goodLead({ need: "Free website" }))).toEqual({ need: "Please choose one of the listed options." });
    expect(errorsOf(goodLead({ reach: "Carrier pigeon" }))).toEqual({
      reach: "Please choose one of the listed options.",
    });
    for (const need of NEED_OPTIONS) expect(validateLead(goodLead({ need })).ok, need).toBe(true);
    for (const reach of REACH_OPTIONS) expect(validateLead(goodLead({ reach })).ok, reach).toBe(true);
  });

  it("asks for a phone number when the owner wants a call or a text", () => {
    expect(errorsOf(goodLead({ phone: "", reach: "Phone call" }))).toEqual({
      phone: "Add a phone number so I can call you, or choose Email.",
    });
    expect(errorsOf(goodLead({ phone: "", reach: "Text" }))).toEqual({
      phone: "Add a phone number so I can text you, or choose Email.",
    });
    expect(validateLead(goodLead({ phone: "", reach: "Email" })).ok).toBe(true);
  });

  it("keeps the more specific message when the phone number is present but wrong", () => {
    expect(errorsOf(goodLead({ phone: "555", reach: "Text" }))).toEqual({
      phone: "Enter a phone number with its area code.",
    });
  });

  it("shortens an overlong note instead of failing, and keeps its paragraphs", () => {
    const values = valuesOf(goodLead({ message: `First paragraph.\n\n${"x".repeat(5000)}` }));
    expect(values.message).toHaveLength(2000);
    expect(values.message.startsWith("First paragraph.\n\nxxx")).toBe(true);
  });

  it("flattens line breaks in single-line fields", () => {
    expect(valuesOf(goodLead({ restaurant: "Sample\nSushi\r\nHouse" })).restaurant).toBe("Sample Sushi House");
  });

  it("reports every problem at once, so the form can mark them all", () => {
    const errors = errorsOf(goodLead({ name: "", email: "nope", need: "", phone: "12" }));
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "need", "phone"]);
  });
});
