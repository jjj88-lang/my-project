import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postFormToken } from "@/app/api/form-token/route";
import { POST as postLead } from "@/app/api/lead/route";
import { resetRateLimits } from "@/lib/inbox/ratelimit";
import { MAX_AGE_MS, MIN_AGE_MS, issueToken, resetUsedTokens, verifyToken } from "@/lib/inbox/token";
import { HONEYPOT_FIELD, LEAD_FIELDS } from "@/lib/lead/definition";
import { formSecret, handleFormToken, handleLead, leadInbox, todayIn, type LeadDeps } from "@/lib/lead/server";
import { siteUrl, studio } from "@/lib/studio";

const LEAD_URL = "http://localhost:3100/api/lead";
const TOKEN_URL = "http://localhost:3100/api/form-token";

const SECRET = "unit-test-secret-unit-test-secret-0123456789";
/** Thursday, November 12, 2026 at noon in Topeka (Central time). */
const T0 = Date.parse("2026-11-12T18:00:00.000Z");

const GOOGLE_URL = "https://script.google.com/macros/s/EXAMPLE_DEPLOYMENT_ID/exec";
const GOOGLE_SECRET = "placeholder-shared-secret-for-tests";

const values = {
  name: "Jordan Rivera",
  restaurant: "Sample Sushi House",
  email: "jordan@example.com",
  phone: "",
  cityState: "Topeka, KS",
  website: "",
  need: "New website",
  reach: "Email",
  message: "Our menu is a photo. Could it be real text?",
};

let dir: string;
let clock: number;
let deps: LeadDeps;
let info: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "agency-lead-"));
  clock = T0;
  deps = { env: { NODE_ENV: "development", FORM_SECRET: SECRET }, dataDir: dir, now: () => new Date(clock) };
  resetRateLimits();
  resetUsedTokens();
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  fs.rmSync(dir, { recursive: true, force: true });
});

function leadRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(LEAD_URL, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function tokenRequest(headers: Record<string, string> = {}): Request {
  return new Request(TOKEN_URL, { method: "POST", headers });
}

/** Ask the token endpoint for a token, the way the form does when it appears. */
async function freshToken(): Promise<string> {
  const response = handleFormToken(tokenRequest(), deps);
  const body = (await response.json()) as { token: string };
  return body.token;
}

/** A token, and then enough time for a person to have filled the form in. */
async function agedToken(ageMs: number = MIN_AGE_MS + 500): Promise<string> {
  const token = await freshToken();
  clock += ageMs;
  return token;
}

type Stored = {
  id: string;
  kind: string;
  kindLabel: string;
  submittedAt: string;
  submittedAtLocal: string;
  source: string;
  customer: { name: string; email: string };
  summary: string;
  fields: Array<{ label: string; value: string }>;
  row: Record<string, string>;
};

function storedLeads(): Stored[] {
  const file = path.join(dir, "inbox", "lead.jsonl");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Stored);
}

/** True while the data folder is untouched: no lead, no email, nothing. */
function nothingRecorded(): boolean {
  return fs.readdirSync(dir).length === 0;
}

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("POST /api/lead with the local inbox", () => {
  it("records a valid request, writes both emails and answers with a reference", async () => {
    const token = await agedToken();
    const response = await handleLead(leadRequest({ token, [HONEYPOT_FIELD]: "", values }), deps);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await bodyOf(response);
    expect(body).toEqual({ ok: true, id: expect.stringMatching(/^LEAD-20261112-[2-9A-HJ-NP-Z]{4}$/) });
    const id = body.id as string;

    const leads = storedLeads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      id,
      kind: "lead",
      kindLabel: "Website lead",
      submittedAt: new Date(clock).toISOString(),
      submittedAtLocal: "Thu, Nov 12, 2026 at 12:00 PM",
      source: new URL(siteUrl).host,
      customer: { name: "Jordan Rivera", email: "jordan@example.com" },
      summary: "New website",
    });
    expect(leads[0].fields.map((field) => field.label)).toEqual(LEAD_FIELDS.map((field) => field.label));
    expect(leads[0].row).toMatchObject({
      Reference: id,
      Status: "New",
      "Your name": "Jordan Rivera",
      "Restaurant name": "Sample Sushi House",
      "What do you need?": "New website",
      "Best way to reach you": "Email",
    });

    const owner = fs.readFileSync(path.join(dir, "outbox", `${id}-owner.txt`), "utf8");
    expect(owner).toContain("Reply-To: jordan@example.com");
    expect(owner).toContain("Subject: New website lead: Jordan Rivera (New website)");
    expect(owner).toContain("Restaurant name: Sample Sushi House");
    expect(owner).toContain(`Reference: ${id}`);

    const customer = fs.readFileSync(path.join(dir, "outbox", `${id}-customer.txt`), "utf8");
    expect(customer).toContain("To: jordan@example.com");
    expect(customer).toContain(`Subject: Thanks for reaching out | ${studio.name}`);
    expect(customer).toContain("Hi Jordan,");
    expect(customer).toContain("Nothing is booked or owed at this point.");
    expect(customer).toContain(`Reference: ${id}`);
  });

  it("stores only what passed validation: cleaned text, and no fields it does not know", async () => {
    const token = await agedToken();
    const messy = { ...values, name: "  Jordan    Rivera ", restaurant: "Sample\nSushi House", role: "admin" };
    const response = await handleLead(leadRequest({ token, values: messy, extra: "ignored" }), deps);

    expect(response.status).toBe(200);
    const [lead] = storedLeads();
    expect(lead.customer.name).toBe("Jordan Rivera");
    expect(lead.row["Restaurant name"]).toBe("Sample Sushi House");
    expect(JSON.stringify(lead)).not.toContain("admin");
    expect(JSON.stringify(lead)).not.toContain("ignored");
  });

  it("keeps a visitor's text from running as a spreadsheet formula", async () => {
    const token = await agedToken();
    const formula = '=HYPERLINK("http://evil.example","Free sushi")';
    await handleLead(leadRequest({ token, values: { ...values, message: formula } }), deps);

    expect(storedLeads()[0].row["Anything else?"]).toBe(`'${formula}`);
  });

  it("dates the reference in the studio's time zone, not the server's", async () => {
    // 05:30 UTC on the 13th is still the evening of the 12th in Kansas, and already the 13th in New York.
    clock = Date.parse("2026-11-13T05:30:00.000Z");
    const first = await handleLead(leadRequest({ token: await agedToken(), values }), deps);
    expect((await bodyOf(first)).id).toMatch(/^LEAD-20261112-/);

    const eastern = { ...deps, env: { ...deps.env, STUDIO_TIMEZONE: "America/New_York" } };
    const second = await handleLead(leadRequest({ token: await agedToken(), values }), eastern);
    expect((await bodyOf(second)).id).toMatch(/^LEAD-20261113-/);

    const nonsense = { ...deps, env: { ...deps.env, STUDIO_TIMEZONE: "Mars/Olympus_Mons" } };
    const third = await handleLead(leadRequest({ token: await agedToken(), values }), nonsense);
    expect((await bodyOf(third)).id).toMatch(/^LEAD-20261112-/);
  });

  it("logs the reference and never the person's details", async () => {
    const token = await agedToken();
    const response = await handleLead(leadRequest({ token, values }), deps);
    const { id } = await bodyOf(response);

    const logged = [...info.mock.calls, ...error.mock.calls].flat().join(" ");
    expect(logged).toContain(String(id));
    expect(logged).not.toContain("Jordan");
    expect(logged).not.toContain("jordan@example.com");
    expect(logged).not.toContain("Sample Sushi House");
  });
});

describe("POST /api/lead refuses what it should", () => {
  it("returns field errors for an invalid request and records nothing", async () => {
    const token = await agedToken();
    const response = await handleLead(leadRequest({ token, values: { ...values, email: "nope", need: "" } }), deps);

    expect(response.status).toBe(422);
    expect(await bodyOf(response)).toEqual({
      ok: false,
      error: "validation",
      fieldErrors: {
        email: "Enter an email address like name@example.com.",
        need: "Please choose an option for “What do you need”.",
      },
    });
    expect(nothingRecorded()).toBe(true);
  });

  it("does not spend the token on a typo: the corrected form goes through with the same one", async () => {
    const token = await agedToken();
    const first = await handleLead(leadRequest({ token, values: { ...values, email: "nope" } }), deps);
    expect(first.status).toBe(422);

    const second = await handleLead(leadRequest({ token, values }), deps);
    expect(second.status).toBe(200);
    expect(storedLeads()).toHaveLength(1);
  });

  it("treats a missing values object as an empty form", async () => {
    const token = await agedToken();
    const response = await handleLead(leadRequest({ token, values: ["not", "an", "object"] }), deps);

    expect(response.status).toBe(422);
    expect(Object.keys((await bodyOf(response)).fieldErrors as object)).toContain("name");
    expect(nothingRecorded()).toBe(true);
  });

  it.each([["filled in", "https://spam.example"], ["a number", 1], ["an object", {}]])(
    "turns away a submission whose honeypot is %s",
    async (_label, trap) => {
      const token = await agedToken();
      const response = await handleLead(leadRequest({ token, [HONEYPOT_FIELD]: trap, values }), deps);

      expect(response.status).toBe(400);
      expect(await bodyOf(response)).toEqual({ ok: false, error: "rejected" });
      expect(nothingRecorded()).toBe(true);
    },
  );

  it("does not report a trapped submission as received", async () => {
    const token = await agedToken();
    const response = await handleLead(leadRequest({ token, [HONEYPOT_FIELD]: "x", values }), deps);
    const body = await bodyOf(response);

    expect(body.ok).toBe(false);
    expect(body).not.toHaveProperty("id");
  });

  it("requires a token", async () => {
    const response = await handleLead(leadRequest({ values }), deps);

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ ok: false, error: "token", reason: "malformed" });
    expect(nothingRecorded()).toBe(true);
  });

  it("checks the token before it looks at the form, so a script without one learns nothing", async () => {
    const response = await handleLead(leadRequest({ values: { name: "" } }), deps);

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ ok: false, error: "token", reason: "malformed" });
  });

  it("refuses a token that is too fresh, then accepts it once a person could have typed the form", async () => {
    const token = await agedToken(MIN_AGE_MS - 1);
    const tooFast = await handleLead(leadRequest({ token, values }), deps);
    expect(tooFast.status).toBe(400);
    expect(await bodyOf(tooFast)).toEqual({ ok: false, error: "token", reason: "too-fast" });
    expect(nothingRecorded()).toBe(true);

    clock += 1;
    const later = await handleLead(leadRequest({ token, values }), deps);
    expect(later.status).toBe(200);
  });

  it("refuses a token signed with another secret, and one that has expired", async () => {
    clock += MIN_AGE_MS + 500;
    const forged = issueToken("some-other-secret-some-other-secret-00", T0);
    const forgedResponse = await handleLead(leadRequest({ token: forged, values }), deps);
    expect(await bodyOf(forgedResponse)).toEqual({ ok: false, error: "token", reason: "signature" });

    const old = issueToken(SECRET, clock - MAX_AGE_MS - 1);
    const oldResponse = await handleLead(leadRequest({ token: old, values }), deps);
    expect(await bodyOf(oldResponse)).toEqual({ ok: false, error: "token", reason: "expired" });

    expect(nothingRecorded()).toBe(true);
  });

  it("accepts each token once", async () => {
    const token = await agedToken();
    const first = await handleLead(leadRequest({ token, values }), deps);
    const second = await handleLead(leadRequest({ token, values }), deps);

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    expect(await bodyOf(second)).toEqual({ ok: false, error: "token", reason: "replayed" });
    expect(storedLeads()).toHaveLength(1);
  });

  it("limits how many requests one address can make, and says when to come back", async () => {
    const from = (ip: string) => ({ "x-forwarded-for": `${ip}, 10.0.0.1` });
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const token = await agedToken();
      statuses.push((await handleLead(leadRequest({ token, values }, from("203.0.113.7")), deps)).status);
    }
    expect(statuses).toEqual(Array(8).fill(200));

    const ninth = await handleLead(leadRequest({ token: await agedToken(), values }, from("203.0.113.7")), deps);
    expect(ninth.status).toBe(429);
    expect(await bodyOf(ninth)).toEqual({ ok: false, error: "rate_limited" });
    expect(Number(ninth.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(Number(ninth.headers.get("retry-after"))).toBeLessThanOrEqual(600);
    expect(storedLeads()).toHaveLength(8);

    // Someone else is not affected, and the first address is welcome again after the window.
    const neighbor = await handleLead(leadRequest({ token: await agedToken(), values }, from("203.0.113.8")), deps);
    expect(neighbor.status).toBe(200);
    clock += 10 * 60 * 1000;
    const later = await handleLead(leadRequest({ token: await agedToken(), values }, from("203.0.113.7")), deps);
    expect(later.status).toBe(200);
  });

  it("turns away forms posted from other websites", async () => {
    const token = await agedToken();
    const crossSite = await handleLead(leadRequest({ token, values }, { "sec-fetch-site": "cross-site" }), deps);
    const sibling = await handleLead(leadRequest({ token, values }, { "sec-fetch-site": "same-site" }), deps);
    const oldBrowser = await handleLead(
      leadRequest({ token, values }, { origin: "https://evil.example", host: "localhost:3100" }),
      deps,
    );

    for (const response of [crossSite, sibling, oldBrowser]) {
      expect(response.status).toBe(403);
      expect(await bodyOf(response)).toEqual({ ok: false, error: "forbidden" });
    }
    expect(nothingRecorded()).toBe(true);
  });

  it("accepts the site's own form, with or without the newer browser headers", async () => {
    const sameOrigin = await handleLead(
      leadRequest({ token: await agedToken(), values }, { "sec-fetch-site": "same-origin" }),
      deps,
    );
    const oldBrowser = await handleLead(
      leadRequest({ token: await agedToken(), values }, { origin: "http://localhost:3100", host: "localhost:3100" }),
      deps,
    );

    expect(sameOrigin.status).toBe(200);
    expect(oldBrowser.status).toBe(200);
  });

  it("only reads JSON", async () => {
    const token = await agedToken();
    const formPost = new Request(LEAD_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `token=${token}&name=Jordan`,
    });
    expect((await handleLead(formPost, deps)).status).toBe(415);

    for (const broken of ["{not json", "[1, 2, 3]", '"text"', "null"]) {
      const response = await handleLead(leadRequest(broken), deps);
      expect(response.status, broken).toBe(400);
      expect(await bodyOf(response)).toEqual({ ok: false, error: "bad_request" });
    }
    expect(nothingRecorded()).toBe(true);
  });

  it("stops reading a body that is too large", async () => {
    const token = await agedToken();
    const huge = { token, values: { ...values, message: "x".repeat(30_000) } };

    const streamed = await handleLead(leadRequest(huge), deps);
    expect(streamed.status).toBe(413);
    expect(await bodyOf(streamed)).toEqual({ ok: false, error: "too_large" });

    const declared = await handleLead(leadRequest({ token, values }, { "content-length": "5000000" }), deps);
    expect(declared.status).toBe(413);

    expect(nothingRecorded()).toBe(true);
  });
});

describe("POST /api/lead when the inbox is not set up", () => {
  const production = { NODE_ENV: "production", FORM_SECRET: SECRET };

  it("fails honestly in production with no backend, and records nothing", async () => {
    deps = { ...deps, env: production };
    const token = await agedToken();
    const response = await handleLead(leadRequest({ token, values }), deps);

    expect(response.status).toBe(503);
    expect(await bodyOf(response)).toEqual({ ok: false, error: "unconfigured" });
    expect(nothingRecorded()).toBe(true);
    // The server log says why, without the visitor's details.
    const logged = error.mock.calls.flat().join(" ");
    expect(logged).toContain("not configured");
    expect(logged).not.toContain("jordan@example.com");
  });

  it("tells the form in advance, so the page can point to email or phone before anyone types", async () => {
    const closed = handleFormToken(tokenRequest(), { ...deps, env: production });
    expect(await bodyOf(closed)).toMatchObject({ ok: true, accepting: false });

    const open = handleFormToken(tokenRequest(), deps);
    expect(await bodyOf(open)).toMatchObject({ ok: true, accepting: true });
  });

  it.each([
    ["only the address is set", { INBOX_GOOGLE_URL: GOOGLE_URL }],
    ["only the secret is set", { INBOX_GOOGLE_SECRET: GOOGLE_SECRET }],
    ["the address is not an Apps Script web app", { INBOX_GOOGLE_URL: "https://example.com/hook", INBOX_GOOGLE_SECRET: GOOGLE_SECRET }],
    ["the secret is too short", { INBOX_GOOGLE_URL: GOOGLE_URL, INBOX_GOOGLE_SECRET: "short" }],
    ["the driver name is unknown", { INBOX_DRIVER: "carrier-pigeon" }],
    ["the demo driver is selected, which keeps nothing", { INBOX_DRIVER: "demo" }],
  ])("refuses when %s", async (_label, extra) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    deps = { ...deps, env: { ...production, ...extra } };
    const response = await handleLead(leadRequest({ token: await agedToken(), values }), deps);

    expect(response.status).toBe(503);
    expect(await bodyOf(response)).toEqual({ ok: false, error: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(nothingRecorded()).toBe(true);
  });

  it("refuses the demo driver in development too", () => {
    expect(leadInbox({ NODE_ENV: "development", INBOX_DRIVER: "demo" }, dir).driver).toBe("unconfigured");
  });
});

describe("POST /api/lead with the Google Sheets backend", () => {
  const google = { NODE_ENV: "production", FORM_SECRET: SECRET, INBOX_GOOGLE_URL: GOOGLE_URL, INBOX_GOOGLE_SECRET: GOOGLE_SECRET };

  it("sends the request to the script and reports success only when the script says so", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    deps = { ...deps, env: google };

    const response = await handleLead(leadRequest({ token: await agedToken(), values }), deps);
    const body = await bodyOf(response);
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GOOGLE_URL);
    expect(init.method).toBe("POST");
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({ secret: GOOGLE_SECRET, id: body.id, kind: "lead", kindLabel: "Website lead" });
    // Nothing is written to this machine's disk when the real backend is in use.
    expect(nothingRecorded()).toBe(true);
    // And the shared secret never travels back to the browser.
    expect(JSON.stringify(body)).not.toContain(GOOGLE_SECRET);
  });

  it("reports a failure when the script refuses the request", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    deps = { ...deps, env: google };

    const response = await handleLead(leadRequest({ token: await agedToken(), values }), deps);
    expect(response.status).toBe(502);
    expect(await bodyOf(response)).toEqual({ ok: false, error: "delivery" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("tries once more when the script cannot be reached, then reports the failure", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);
    deps = { ...deps, env: google };

    const response = await handleLead(leadRequest({ token: await agedToken(), values }), deps);
    expect(response.status).toBe(502);
    expect(await bodyOf(response)).toEqual({ ok: false, error: "delivery" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The cause is logged for the owner, with the reference and without the visitor's details.
    const logged = error.mock.calls.flat().join(" ");
    expect(logged).toMatch(/LEAD-\d{8}-[2-9A-HJ-NP-Z]{4} was not delivered via google: network down/);
    expect(logged).not.toContain("jordan@example.com");
  });

  it("reports a failure when the script answers with a web page instead of JSON", async () => {
    const fetchMock = vi.fn(async () => new Response("<html>Sign in</html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    deps = { ...deps, env: google };

    const response = await handleLead(leadRequest({ token: await agedToken(), values }), deps);
    expect(response.status).toBe(502);
  });
});

describe("POST /api/form-token", () => {
  it("hands out a signed token that only becomes valid after a few seconds", async () => {
    const response = handleFormToken(tokenRequest(), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const { token } = (await response.json()) as { token: string };

    expect(verifyToken(SECRET, token, { now: clock })).toEqual({ ok: false, reason: "too-fast" });
    expect(verifyToken(SECRET, token, { now: clock + MIN_AGE_MS })).toEqual({ ok: true });
    expect(verifyToken("another-secret-another-secret-another", token, { now: clock + MIN_AGE_MS })).toEqual({
      ok: false,
      reason: "signature",
    });
  });

  it("is generous but not unlimited", () => {
    const from = { "x-forwarded-for": "203.0.113.9" };
    const statuses = Array.from({ length: 41 }, () => handleFormToken(tokenRequest(from), deps).status);

    expect(statuses.slice(0, 40)).toEqual(Array(40).fill(200));
    expect(statuses[40]).toBe(429);
  });

  it("turns away other websites", () => {
    expect(handleFormToken(tokenRequest({ "sec-fetch-site": "cross-site" }), deps).status).toBe(403);
  });
});

describe("the form secret", () => {
  it("uses FORM_SECRET when it is long enough, and the per-build secret otherwise", () => {
    const buildSecret = formSecret({});
    expect(buildSecret.length).toBeGreaterThanOrEqual(32);
    expect(formSecret({ FORM_SECRET: SECRET })).toBe(SECRET);
    expect(formSecret({ FORM_SECRET: "too-short" })).toBe(buildSecret);
    expect(formSecret({ FORM_SECRET: "   " })).toBe(buildSecret);
  });
});

describe("where leads go", () => {
  it("writes to the data folder in development and needs Google Sheets in production", () => {
    expect(leadInbox({ NODE_ENV: "development" }, dir)).toEqual({ driver: "local", dir });
    expect(leadInbox({ NODE_ENV: "production" }, dir).driver).toBe("unconfigured");
    expect(leadInbox({ NODE_ENV: "production", INBOX_GOOGLE_URL: GOOGLE_URL, INBOX_GOOGLE_SECRET: GOOGLE_SECRET }, dir)).toEqual({
      driver: "google",
      url: GOOGLE_URL,
      secret: GOOGLE_SECRET,
    });
    // Running the built site on your own machine: the local driver has to be asked for by name.
    expect(leadInbox({ NODE_ENV: "production", INBOX_DRIVER: "local" }, dir)).toEqual({ driver: "local", dir });
  });

  it("works out today's date in a time zone", () => {
    const late = new Date("2026-01-01T04:30:00.000Z");
    expect(todayIn("America/Chicago", late)).toBe("2025-12-31");
    expect(todayIn("UTC", late)).toBe("2026-01-01");
  });
});

describe("the route files", () => {
  it("issue a token and accept the form, writing the lead under data/ in the working directory", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FORM_SECRET", SECRET);
    for (const name of ["INBOX_DRIVER", "INBOX_GOOGLE_URL", "INBOX_GOOGLE_SECRET", "STUDIO_TIMEZONE"]) vi.stubEnv(name, "");

    const tokenResponse = await postFormToken(tokenRequest());
    const { token, accepting } = (await tokenResponse.json()) as { token: string; accepting: boolean };
    expect(accepting).toBe(true);

    vi.setSystemTime(T0 + 3_000);
    const response = await postLead(leadRequest({ token, [HONEYPOT_FIELD]: "", values }));
    const body = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(body.id).toMatch(/^LEAD-20261112-/);
    const saved = fs.readFileSync(path.join(dir, "data", "inbox", "lead.jsonl"), "utf8");
    expect(saved).toContain(String(body.id));
    expect(fs.readdirSync(path.join(dir, "data", "outbox")).sort()).toEqual([
      `${body.id}-customer.txt`,
      `${body.id}-owner.txt`,
    ]);
  });
});
