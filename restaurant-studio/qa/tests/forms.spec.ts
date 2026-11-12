import fs from "node:fs";
import path from "node:path";

import type { APIRequestContext } from "playwright/test";

import {
  addDays,
  cateringFormEnabled,
  cateringPath,
  contactFormEnabled,
  isPremium,
  isSample,
  localInboxDir,
  site,
  todayLocal,
  visitPath,
} from "../lib/client";
import { expect, nextVisitor, test } from "../lib/fixtures";

const anyForm = cateringFormEnabled || contactFormEnabled;
const kind = cateringFormEnabled ? "catering" : "contact";
const REFERENCE = /^(CAT|MSG)-\d{8}-[2-9A-HJ-NP-Z]{4}$/;
/** The server refuses tokens younger than 2.5 seconds. */
const TOKEN_AGE_MS = 2_800;

const eventDate = addDays(todayLocal(), (site.catering?.leadTimeDays ?? 3) + 21);
const MARKER = "QA-MARKER-do-not-echo";

function validValues(which: string = kind): Record<string, string> {
  if (which === "catering") {
    return {
      name: "Jordan Rivera",
      email: "jordan@example.com",
      phone: "(555) 010-0199",
      eventDate,
      guests: String(Math.max(site.catering?.minGuests ?? 10, 12)),
      serviceType: (site.catering?.serviceTypes ?? ["Pickup"])[0],
      eventTime: "6:30 PM",
      budget: "",
      location: "",
      details: `=HYPERLINK("http://example.invalid","${MARKER}")`,
    };
  }
  return {
    name: "Sam Okafor",
    email: "sam@example.com",
    phone: "",
    topic: "General question",
    message: `${MARKER} Do you take walk-ins on Fridays?`,
  };
}

/** Each test presents itself as a different visitor so the rate limit of one cannot trip another. */
const visitor = nextVisitor;

async function freshToken(request: APIRequestContext, ip: string): Promise<string> {
  const response = await request.post("/api/form-token", { headers: { "X-Forwarded-For": ip } });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { token: string }).token;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function submit(request: APIRequestContext, ip: string, body: unknown, headers: Record<string, string> = {}) {
  return request.post("/api/inquiry", {
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip, ...headers },
    data: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test.describe("inquiry endpoint", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!anyForm, "this client has no forms");
    test.skip(testInfo.project.name !== "desktop", "server behavior is the same for every screen size");
  });

  test("accepts a complete, well-formed inquiry", async ({ request }, testInfo) => {
    const ip = visitor(testInfo);
    const token = await freshToken(request, ip);
    await wait(TOKEN_AGE_MS);
    const response = await submit(request, ip, { kind, token, company_website: "", values: validValues() });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.id).toMatch(REFERENCE);

    if (isSample) {
      // Sample sites store and send nothing: they return what a live site would have done.
      expect(body.preview.row.Status).toBe("New");
      expect(body.preview.ownerEmail.replyTo).toBe(validValues().email);
      expect(body.preview.customerEmail.to).toBe(validValues().email);
      // Free text typed by the visitor must never be copied into the customer's email.
      expect(body.preview.customerEmail.text).not.toContain(MARKER);
      expect(body.preview.customerEmail.subject).not.toContain(MARKER);
      if (kind === "catering") {
        expect(body.preview.customerEmail.text).toMatch(/not a confirmation of your event, availability or pricing/);
        // A value that looks like a spreadsheet formula is stored as plain text.
        expect(body.preview.row["Anything else we should know?"].startsWith("'=")).toBe(true);
      }
    } else {
      expect(body.preview).toBeUndefined();
      const recorded = fs.readFileSync(path.join(localInboxDir, "inbox", `${kind}.jsonl`), "utf8");
      expect(recorded).toContain(body.id);
      expect(fs.existsSync(path.join(localInboxDir, "outbox", `${body.id}-owner.txt`))).toBe(true);
      const customer = fs.readFileSync(path.join(localInboxDir, "outbox", `${body.id}-customer.txt`), "utf8");
      expect(customer).not.toContain(MARKER);
    }
  });

  test("quietly drops a submission that fills the hidden trap field", async ({ request }, testInfo) => {
    const ip = visitor(testInfo);
    const response = await submit(request, ip, { kind, token: "none", company_website: "https://spam.example", values: validValues() });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true, id: "received" });
  });

  test("refuses a submission with no token, a forged token, or one used too quickly", async ({ request }, testInfo) => {
    const ip = visitor(testInfo);
    const missing = await submit(request, ip, { kind, values: validValues() });
    expect(missing.status()).toBe(400);
    expect(await missing.json()).toMatchObject({ ok: false, error: "token", reason: "malformed" });

    const token = await freshToken(request, ip);
    const tooFast = await submit(request, ip, { kind, token, values: validValues() });
    expect(await tooFast.json()).toMatchObject({ error: "token", reason: "too-fast" });

    const [issued, nonce, signature] = token.split(".");
    const forged = `${issued}.${nonce}.${signature.split("").reverse().join("")}`;
    await wait(TOKEN_AGE_MS);
    const bad = await submit(request, ip, { kind, token: forged, values: validValues() });
    expect(await bad.json()).toMatchObject({ error: "token", reason: "signature" });
  });

  test("a token works once: a typo does not spend it, a second send is refused", async ({ request }, testInfo) => {
    const ip = visitor(testInfo);
    const token = await freshToken(request, ip);
    await wait(TOKEN_AGE_MS);

    const typo = await submit(request, ip, { kind, token, values: { ...validValues(), email: "not-an-email" } });
    expect(typo.status()).toBe(422);
    expect((await typo.json()).fieldErrors.email).toBeTruthy();

    const first = await submit(request, ip, { kind, token, values: validValues() });
    expect(first.status()).toBe(200);

    const replay = await submit(request, ip, { kind, token, values: validValues() });
    expect(replay.status()).toBe(400);
    expect(await replay.json()).toMatchObject({ error: "token", reason: "replayed" });
  });

  test("checks every field on the server, whatever the browser sent", async ({ request }, testInfo) => {
    const ip = visitor(testInfo);
    const token = await freshToken(request, ip);
    await wait(TOKEN_AGE_MS);
    const response = await submit(request, ip, { kind, token, values: { name: "", email: "x", extra: "ignored" } });
    expect(response.status()).toBe(422);
    const { fieldErrors } = await response.json();
    expect(Object.keys(fieldErrors)).toEqual(expect.arrayContaining(["name", "email"]));
    expect(fieldErrors.extra).toBeUndefined();
  });

  test("enforces the catering notice period and party size", async ({ request }, testInfo) => {
    test.skip(!cateringFormEnabled, "this client has no catering form");
    const ip = visitor(testInfo);
    const token = await freshToken(request, ip);
    await wait(TOKEN_AGE_MS);
    const values = { ...validValues("catering"), eventDate: todayLocal(), guests: String((site.catering?.maxGuests ?? 500) + 1) };
    const response = await submit(request, ip, { kind: "catering", token, values });
    expect(response.status()).toBe(422);
    const { fieldErrors } = await response.json();
    expect(fieldErrors.guests).toContain(site.contact.phone);
    if ((site.catering?.leadTimeDays ?? 3) > 0) expect(fieldErrors.eventDate).toContain(site.contact.phone);
  });

  test("only serves the forms this client's plan includes", async ({ request }, testInfo) => {
    const ip = visitor(testInfo);
    expect((await submit(request, ip, { kind: "newsletter", values: {} })).status()).toBe(404);
    if (!cateringFormEnabled) expect((await submit(request, ip, { kind: "catering", values: {} })).status()).toBe(404);
    if (!contactFormEnabled) expect((await submit(request, ip, { kind: "contact", values: {} })).status()).toBe(404);
  });

  test("rejects malformed, oversized and cross-site requests", async ({ request }, testInfo) => {
    const ip = visitor(testInfo);
    const plain = await request.post("/api/inquiry", { headers: { "Content-Type": "text/plain", "X-Forwarded-For": ip }, data: "kind=catering" });
    expect(plain.status()).toBe(415);
    expect((await submit(request, ip, "{not json")).status()).toBe(400);
    expect((await submit(request, ip, "[1,2,3]")).status()).toBe(400);
    expect((await submit(request, ip, { kind, values: { message: "x".repeat(25_000) } })).status()).toBe(413);
    expect((await submit(request, ip, { kind, values: {} }, { "Sec-Fetch-Site": "cross-site" })).status()).toBe(403);
    expect((await request.get("/api/inquiry")).status()).toBe(405);
    expect((await request.get("/api/form-token")).status()).toBe(405);
  });

  test("slows down a visitor who sends too many", async ({ request }, testInfo) => {
    const ip = visitor(testInfo);
    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) statuses.push((await submit(request, ip, { kind, values: validValues() })).status());
    expect(statuses.slice(0, 8).every((s) => s === 400), "the first eight are judged normally").toBe(true);
    expect(statuses.slice(8)).toEqual([429, 429]);
    const limited = await submit(request, ip, { kind, values: validValues() });
    expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
    // Another visitor is unaffected.
    expect((await submit(request, visitor(testInfo), { kind, values: validValues() })).status()).toBe(400);
  });
});

test.describe("catering form in the browser", () => {
  test.beforeEach(() => {
    test.skip(!cateringFormEnabled, "this client has no catering form");
  });

  test("explains what is wrong before anything is sent", async ({ page }) => {
    await page.goto(cateringPath, { waitUntil: "networkidle" });
    const form = page.locator('form[data-form="catering"]');
    let posted = false;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/inquiry")) posted = true;
    });

    await form.getByRole("button", { name: /send my request/i }).click();
    await expect(form.getByRole("alert").first()).toContainText(/fields need attention/);
    await expect(form.locator(".field-error")).toHaveCount(6);

    await form.getByLabel("Your name").fill("Jordan Rivera");
    await form.getByLabel("Email").fill("jordan@example.com");
    await form.getByLabel("Phone").fill("(555) 010-0199");
    await form.getByLabel("Event date").fill(addDays(todayLocal(), 1));
    await form.getByLabel("Number of guests").fill("3");
    await form.getByLabel("Type of service").selectOption({ index: 1 });
    await form.getByRole("button", { name: /send my request/i }).click();

    await expect(form.locator(".field-error")).toHaveCount((site.catering?.leadTimeDays ?? 3) > 1 ? 2 : 1);
    await expect(form.getByText(site.contact.phone).first()).toBeVisible();
    expect(posted, "nothing is sent while the form has errors").toBe(false);
  });

  test("sends a request and says plainly that nothing is booked", async ({ page }) => {
    await page.goto(cateringPath, { waitUntil: "networkidle" });
    const form = page.locator('form[data-form="catering"]');
    await expect(form.getByText(/does not book your event/i)).toBeVisible();

    const values = validValues("catering");
    await form.getByLabel("Your name").fill(values.name);
    await form.getByLabel("Email").fill(values.email);
    await form.getByLabel("Phone").fill(values.phone);
    await form.getByLabel("Event date").fill(values.eventDate);
    await form.getByLabel("Number of guests").fill(values.guests);
    await form.getByLabel("Type of service").selectOption(values.serviceType);
    await form.getByLabel("Anything else we should know?").fill(values.details);
    await form.getByRole("button", { name: /send my request/i }).click();

    const done = page.getByRole("status");
    await expect(done).toBeVisible({ timeout: 20_000 });
    await expect(done).toBeFocused();
    await expect(done).toContainText(/CAT-\d{8}-[2-9A-Z]{4}/);
    await expect(done).toContainText(/contact you/i);

    if (isSample) {
      const walkthrough = page.getByRole("region", { name: "What a live site does next" });
      await expect(walkthrough).toContainText("nothing was stored and no email was sent");
      await expect(walkthrough.getByRole("heading", { name: "Recorded" })).toBeVisible();
      await expect(walkthrough.getByRole("heading", { name: "Owner notified" })).toBeVisible();
      await expect(walkthrough.getByRole("heading", { name: "Customer acknowledged" })).toBeVisible();
    } else {
      await expect(page.locator("#demo-preview-heading")).toHaveCount(0);
    }

    await page.getByRole("button", { name: /send another request/i }).click();
    await expect(page.locator('form[data-form="catering"]').getByLabel("Your name")).toHaveValue("");
  });
});

test.describe("contact form in the browser", () => {
  test("sends a message", async ({ page }) => {
    test.skip(!contactFormEnabled || !isPremium, "this client has no contact form");
    await page.goto(visitPath, { waitUntil: "networkidle" });
    const form = page.locator('form[data-form="contact"]');
    const values = validValues("contact");
    await form.getByLabel("Your name").fill(values.name);
    await form.getByLabel("Email").fill(values.email);
    await form.getByLabel("What is this about?").selectOption(values.topic);
    await form.getByLabel("Message").fill(values.message);
    await form.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByRole("status")).toContainText(/MSG-\d{8}-[2-9A-Z]{4}/, { timeout: 20_000 });
  });
});
