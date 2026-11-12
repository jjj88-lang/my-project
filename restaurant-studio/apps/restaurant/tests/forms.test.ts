import { describe, expect, it } from "vitest";

import {
  addDaysIso,
  cateringForm,
  cleanText,
  contactForm,
  formatLongDate,
  todayIn,
  validate,
  type FormValues,
} from "@/lib/forms/definitions";

const TODAY = "2026-11-11";
const ctx = { today: TODAY, phone: "(785) 555-0142" };
const catering = cateringForm({ serviceTypes: ["Pickup", "On-site chef"], minGuests: 10, maxGuests: 300, leadTimeDays: 3 });

const good: FormValues = {
  name: "Jordan Rivera",
  email: "jordan@example.com",
  phone: "(785) 555-0199",
  eventDate: "2026-12-12",
  guests: "40",
  serviceType: "On-site chef",
  eventTime: "",
  budget: "",
  location: "",
  details: "",
};

const errorsFor = (values: Record<string, unknown>) => {
  const result = validate(catering, values, ctx);
  return result.ok ? {} : result.errors;
};

describe("date helpers", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDaysIso("2026-11-29", 3)).toBe("2026-12-02");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29"); // leap year
  });

  it("finds today's date in the restaurant's time zone", () => {
    const instant = new Date("2026-11-12T03:30:00Z"); // 9:30 PM on the 11th in Chicago
    expect(todayIn("America/Chicago", instant)).toBe("2026-11-11");
    expect(todayIn("Asia/Seoul", instant)).toBe("2026-11-12");
  });

  it("writes dates out for people", () => {
    expect(formatLongDate("2026-12-12")).toBe("Saturday, December 12, 2026");
  });
});

describe("cleanText", () => {
  it("trims, collapses whitespace and drops control characters", () => {
    expect(cleanText("  Jordan \t  Rivera\u0000\u0007 ", 80, false)).toBe("Jordan Rivera");
  });

  it("keeps paragraph breaks in long text but not runs of blank lines", () => {
    expect(cleanText("one\r\n\r\n\r\n\r\ntwo", 200, true)).toBe("one\n\ntwo");
  });

  it("caps the length and ignores non-text input", () => {
    expect(cleanText("x".repeat(500), 80, false)).toHaveLength(80);
    expect(cleanText({ toString: () => "evil" }, 80, false)).toBe("");
    expect(cleanText(undefined, 80, false)).toBe("");
    expect(cleanText(42, 80, false)).toBe("42");
  });
});

describe("catering form", () => {
  it("accepts a complete, sensible request and returns clean strings", () => {
    const result = validate(catering, { ...good, name: "  Jordan   Rivera ", guests: "040" }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.name).toBe("Jordan Rivera");
      expect(result.values.guests).toBe("40");
    }
  });

  it("drops fields the form does not define", () => {
    const result = validate(catering, { ...good, admin: "true", __proto__: { polluted: true } }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.values)).toEqual(catering.fields.map((f) => f.name));
  });

  it("requires the required fields and says which", () => {
    const errors = errorsFor({});
    expect(Object.keys(errors).sort()).toEqual(["email", "eventDate", "guests", "name", "phone", "serviceType"]);
    expect(errors.name).toBe('Please fill in "Your name".');
    expect(errors.serviceType).toBe('Please choose an option for "Type of service".');
  });

  it("checks email and phone formats", () => {
    expect(errorsFor({ ...good, email: "jordan@example" }).email).toMatch(/email address/);
    expect(errorsFor({ ...good, email: "jordan example.com" }).email).toBeDefined();
    expect(errorsFor({ ...good, phone: "555-0199" }).phone).toMatch(/area code/);
    expect(errorsFor({ ...good, phone: "+1 (785) 555-0199" }).phone).toBeUndefined();
  });

  it("keeps the guest count inside what the restaurant caters for", () => {
    expect(errorsFor({ ...good, guests: "9" }).guests).toMatch(/10 to 300 guests/);
    expect(errorsFor({ ...good, guests: "301" }).guests).toMatch(/please call \(785\) 555-0142/);
    expect(errorsFor({ ...good, guests: "forty" }).guests).toBe("Enter a whole number.");
    expect(errorsFor({ ...good, guests: "12.5" }).guests).toBe("Enter a whole number.");
    expect(errorsFor({ ...good, guests: "-20" }).guests).toBe("Enter a whole number.");
    expect(errorsFor({ ...good, guests: "10" }).guests).toBeUndefined();
    expect(errorsFor({ ...good, guests: "300" }).guests).toBeUndefined();
  });

  it("only accepts a listed service type or budget", () => {
    expect(errorsFor({ ...good, serviceType: "Free food" }).serviceType).toBeDefined();
    expect(errorsFor({ ...good, budget: "$1" }).budget).toBeDefined();
    expect(errorsFor({ ...good, budget: "Not sure yet" }).budget).toBeUndefined();
  });

  it("enforces the notice period on the event date", () => {
    expect(errorsFor({ ...good, eventDate: "2026-11-10" }).eventDate).toBe("That date has already passed.");
    expect(errorsFor({ ...good, eventDate: "2026-11-11" }).eventDate).toMatch(/less than 3 days away/);
    expect(errorsFor({ ...good, eventDate: "2026-11-13" }).eventDate).toMatch(/Please call \(785\) 555-0142/);
    expect(errorsFor({ ...good, eventDate: "2026-11-14" }).eventDate).toBeUndefined(); // exactly three days out
    expect(errorsFor({ ...good, eventDate: "2029-01-01" }).eventDate).toMatch(/within the next two years/);
  });

  it("rejects dates that are not real", () => {
    expect(errorsFor({ ...good, eventDate: "2026-02-30" }).eventDate).toBe("Enter a valid date.");
    expect(errorsFor({ ...good, eventDate: "12/12/2026" }).eventDate).toBe("Enter a valid date.");
  });

  it("describes its own limits in the help text", () => {
    const guests = catering.fields.find((f) => f.name === "guests")!;
    const date = catering.fields.find((f) => f.name === "eventDate")!;
    expect(guests).toMatchObject({ min: 10, max: 300, help: "10 to 300 guests." });
    expect(date.help).toMatch(/at least 3 days of notice/);
    expect(catering.disclaimer).toMatch(/does not book your event/);
  });

  it("says 'day' for a one-day notice period and omits help when there is none", () => {
    const oneDay = cateringForm({ serviceTypes: ["Pickup"], minGuests: 5, maxGuests: 50, leadTimeDays: 1 });
    expect(oneDay.fields.find((f) => f.name === "eventDate")!.help).toMatch(/at least 1 day of notice/);
    const sameDay = cateringForm({ serviceTypes: ["Pickup"], minGuests: 5, maxGuests: 50, leadTimeDays: 0 });
    expect(sameDay.fields.find((f) => f.name === "eventDate")!.help).toBeUndefined();
    expect(validate(sameDay, { ...good, guests: "20", serviceType: "Pickup", eventDate: TODAY }, ctx).ok).toBe(true);
  });
});

describe("contact form", () => {
  const contact = contactForm();
  const message = { name: "Sam", email: "sam@example.com", phone: "", topic: "General question", message: "Do you take walk-ins?" };

  it("accepts a normal message with no phone number", () => {
    expect(validate(contact, message, ctx).ok).toBe(true);
  });

  it("requires a message and a topic", () => {
    const result = validate(contact, { ...message, message: "   ", topic: "" }, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["message", "topic"]);
  });

  it("truncates an overlong message instead of failing", () => {
    const result = validate(contact, { ...message, message: "a".repeat(5000) }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.values.message).toHaveLength(2000);
  });
});
