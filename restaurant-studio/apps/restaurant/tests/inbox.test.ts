import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { deliver, formatLocalTimestamp, makeReference, resolveInboxSettings, type Business, type Submission } from "@/lib/inbox";
import { deliverGoogle } from "@/lib/inbox/drivers/google";
import {
  ACK_TEMPLATES,
  buildPreview,
  firstName,
  renderCustomerEmail,
  renderOwnerEmail,
  safeCell,
  sheetRow,
  SHEET_NAMES,
} from "@/lib/inbox/messages";
import { rateLimit, resetRateLimits } from "@/lib/inbox/ratelimit";
import { issueToken, MAX_AGE_MS, MIN_AGE_MS, resetUsedTokens, verifyToken } from "@/lib/inbox/token";

const business: Business = {
  name: "Hibana",
  phone: "(785) 555-0142",
  address: "1200 Sample Street, Topeka, KS 66603",
  ownerEmail: "owner@hibana.example",
};

const submission: Submission = {
  id: "CAT-20261111-7F3K",
  kind: "catering",
  kindLabel: "Catering inquiry",
  submittedAt: "2026-11-11T20:05:00.000Z",
  submittedAtLocal: "Wed, Nov 11, 2026 at 2:05 PM",
  source: "hibana.example",
  customer: { name: "jordan rivera", email: "jordan@example.com" },
  summary: "Sat, Dec 12, 2026 · 40 guests",
  ackSummary: " for Saturday, December 12, 2026 (40 guests)",
  fields: [
    { label: "Your name", value: "jordan rivera" },
    { label: "Email", value: "jordan@example.com" },
    { label: "Event date", value: "2026-12-12" },
    { label: "Number of guests", value: "40" },
    { label: "Budget", value: "" },
    { label: "Anything else we should know?", value: '=HYPERLINK("http://evil.example","Free sushi")' },
  ],
};

describe("form tokens", () => {
  const secret = "test-secret-test-secret-test-secret";
  const t0 = 1_800_000_000_000;

  beforeEach(() => resetUsedTokens());

  it("accepts a genuine token that is old enough", () => {
    const token = issueToken(secret, t0);
    expect(verifyToken(secret, token, { now: t0 + MIN_AGE_MS })).toEqual({ ok: true });
  });

  it("rejects a token used faster than a person could fill in a form", () => {
    const token = issueToken(secret, t0);
    expect(verifyToken(secret, token, { now: t0 + MIN_AGE_MS - 1 })).toEqual({ ok: false, reason: "too-fast" });
  });

  it("rejects an expired token", () => {
    const token = issueToken(secret, t0);
    expect(verifyToken(secret, token, { now: t0 + MAX_AGE_MS + 1 })).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a token signed with another secret or altered in any part", () => {
    const token = issueToken(secret, t0);
    const now = t0 + 10_000;
    expect(verifyToken("another-secret", token, { now })).toEqual({ ok: false, reason: "signature" });
    const [issued, nonce, sig] = token.split(".");
    const backdated = `${(t0 - 60_000).toString(36)}.${nonce}.${sig}`;
    expect(verifyToken(secret, backdated, { now })).toEqual({ ok: false, reason: "signature" });
    expect(verifyToken(secret, `${issued}.${nonce}x.${sig}`, { now })).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects anything that is not a token", () => {
    for (const junk of [undefined, null, 42, "", "a.b", "a.b.c.d", "x".repeat(500), { token: "a.b.c" }]) {
      expect(verifyToken(secret, junk, { now: t0 })).toEqual({ ok: false, reason: "malformed" });
    }
  });

  it("can be checked many times but spent only once", () => {
    const token = issueToken(secret, t0);
    const now = t0 + 5_000;
    expect(verifyToken(secret, token, { now }).ok).toBe(true);
    expect(verifyToken(secret, token, { now }).ok).toBe(true);
    expect(verifyToken(secret, token, { now, consume: true }).ok).toBe(true);
    expect(verifyToken(secret, token, { now, consume: true })).toEqual({ ok: false, reason: "replayed" });
    expect(verifyToken(secret, token, { now })).toEqual({ ok: false, reason: "replayed" });
  });

  it("issues a different token every time", () => {
    expect(issueToken(secret, t0)).not.toBe(issueToken(secret, t0));
  });
});

describe("rate limit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit, then blocks until the window resets", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("catering:1.2.3.4", 3, 60_000, t0 + i).ok).toBe(true);
    const blocked = rateLimit("catering:1.2.3.4", 3, 60_000, t0 + 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    expect(rateLimit("catering:1.2.3.4", 3, 60_000, t0 + 60_001).ok).toBe(true);
  });

  it("counts each visitor and each form separately", () => {
    expect(rateLimit("catering:1.1.1.1", 1, 60_000, 0).ok).toBe(true);
    expect(rateLimit("catering:2.2.2.2", 1, 60_000, 0).ok).toBe(true);
    expect(rateLimit("contact:1.1.1.1", 1, 60_000, 0).ok).toBe(true);
    expect(rateLimit("catering:1.1.1.1", 1, 60_000, 1).ok).toBe(false);
  });
});

describe("emails and the sheet row", () => {
  it("tells the owner everything, with the customer as the reply address", () => {
    const email = renderOwnerEmail(submission, business);
    expect(email.to).toBe("owner@hibana.example");
    expect(email.replyTo).toBe("jordan@example.com");
    expect(email.subject).toBe("New catering inquiry: jordan rivera (Sat, Dec 12, 2026 · 40 guests)");
    expect(email.text).toContain("Catering inquiry received Wed, Nov 11, 2026 at 2:05 PM through hibana.example.");
    expect(email.text).toContain("Number of guests: 40");
    expect(email.text).not.toContain("Budget:"); // empty answers are left out
    expect(email.text).toContain("Nothing has been confirmed with the customer.");
    expect(email.text).toContain("Reference: CAT-20261111-7F3K");
  });

  it("acknowledges the customer without confirming anything", () => {
    const email = renderCustomerEmail(submission, business);
    expect(email.to).toBe("jordan@example.com");
    expect(email.subject).toBe("We received your catering request | Hibana");
    expect(email.text).toContain("Hi jordan,");
    expect(email.text).toContain("your catering request for Saturday, December 12, 2026 (40 guests).");
    expect(email.text).toContain("It is not a confirmation of your event, availability or pricing.");
    expect(email.text).toContain("(785) 555-0142");
  });

  it("never copies free text from the visitor into the customer's email", () => {
    const email = renderCustomerEmail(submission, business);
    expect(email.text).not.toContain("HYPERLINK");
    expect(email.text).not.toContain("Free sushi");
    expect(email.subject).not.toContain("HYPERLINK");
  });

  it("uses the contact template for unknown kinds and leaves no unfilled placeholders", () => {
    for (const kind of [...Object.keys(ACK_TEMPLATES), "something-new"]) {
      const email = renderCustomerEmail({ ...submission, kind }, business);
      expect(email.subject).not.toMatch(/\{\w+\}/);
      expect(email.text).not.toMatch(/\{\w+\}/);
    }
  });

  it("greets by a cleaned-up first name", () => {
    expect(firstName("Jordan Rivera")).toBe("Jordan");
    expect(firstName("  María-José   Núñez ")).toBe("María-José");
    expect(firstName("O'Brien")).toBe("O'Brien");
    expect(firstName("<script>alert(1)</script> Bob")).toBe("scriptalertscript");
    expect(firstName("=cmd|' /C calc'!A0")).toBe("cmd'");
    expect(firstName("12345")).toBe("there");
    expect(firstName("")).toBe("there");
  });

  it("stops spreadsheet formulas from running", () => {
    expect(safeCell("=1+1")).toBe("'=1+1");
    expect(safeCell("+1 785 555 0142")).toBe("'+1 785 555 0142");
    expect(safeCell("-5")).toBe("'-5");
    expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(safeCell("\tx")).toBe("'\tx");
    expect(safeCell("Birthday dinner = fun")).toBe("Birthday dinner = fun");
    expect(safeCell("")).toBe("");
  });

  it("builds the sheet row with status New and safe cells", () => {
    const row = sheetRow(submission);
    expect(Object.keys(row).slice(0, 3)).toEqual(["Received", "Reference", "Status"]);
    expect(row.Status).toBe("New");
    expect(row["Anything else we should know?"].startsWith("'=")).toBe(true);
    expect(buildPreview(submission, business).sheet).toBe(SHEET_NAMES.catering);
  });
});

describe("references and timestamps", () => {
  it("makes short references that can be read over the phone", () => {
    expect(makeReference("CAT", "2026-12-12", () => 0)).toBe("CAT-20261212-2222");
    for (let i = 0; i < 50; i++) expect(makeReference("MSG", "2026-01-05")).toMatch(/^MSG-20260105-[2-9A-HJ-NP-Z]{4}$/);
  });

  it("formats the time of a submission in the business's own time zone", () => {
    const instant = new Date("2026-11-11T20:05:00Z");
    expect(formatLocalTimestamp(instant, "America/Chicago")).toBe("Wed, Nov 11, 2026 at 2:05 PM");
    expect(formatLocalTimestamp(instant, "America/New_York")).toBe("Wed, Nov 11, 2026 at 3:05 PM");
    expect(formatLocalTimestamp(new Date("2026-11-12T06:00:00Z"), "America/Chicago")).toBe("Thu, Nov 12, 2026 at 12:00 AM");
  });
});

describe("choosing where inquiries go", () => {
  const url = "https://script.google.com/macros/s/AKfycbx_abc-123/exec";
  const secret = "s".repeat(40);
  const dataDir = "/tmp/data";

  it("uses the demo driver on sample sites, whatever else is set", () => {
    expect(resolveInboxSettings({ sample: true, env: {}, dataDir })).toEqual({ driver: "demo" });
  });

  it("uses Google when the URL and secret are set", () => {
    expect(
      resolveInboxSettings({ sample: false, env: { INBOX_GOOGLE_URL: url, INBOX_GOOGLE_SECRET: secret }, dataDir }),
    ).toEqual({ driver: "google", url, secret });
  });

  it("writes to a local folder in development", () => {
    expect(resolveInboxSettings({ sample: false, env: { NODE_ENV: "development" }, dataDir })).toEqual({
      driver: "local",
      dir: dataDir,
    });
  });

  it("refuses to pretend in production when nothing is configured", () => {
    expect(resolveInboxSettings({ sample: false, env: { NODE_ENV: "production" }, dataDir }).driver).toBe("unconfigured");
  });

  it("rejects half-configured or malformed Google settings", () => {
    const cases: Array<Record<string, string>> = [
      { INBOX_GOOGLE_URL: url },
      { INBOX_GOOGLE_SECRET: secret },
      { INBOX_GOOGLE_URL: "https://example.com/hook", INBOX_GOOGLE_SECRET: secret },
      { INBOX_GOOGLE_URL: url.replace("/exec", "/dev"), INBOX_GOOGLE_SECRET: secret },
      { INBOX_GOOGLE_URL: url, INBOX_GOOGLE_SECRET: "short" },
      { INBOX_DRIVER: "carrier-pigeon" },
    ];
    for (const env of cases) {
      expect(resolveInboxSettings({ sample: false, env, dataDir }).driver, JSON.stringify(env)).toBe("unconfigured");
    }
  });

  it("lets INBOX_DRIVER force a driver, for example local testing of a sample site", () => {
    expect(resolveInboxSettings({ sample: true, env: { INBOX_DRIVER: "local" }, dataDir }).driver).toBe("local");
    expect(resolveInboxSettings({ sample: false, env: { INBOX_DRIVER: "demo" }, dataDir }).driver).toBe("demo");
  });

  it("fails delivery, with the reason, when unconfigured", async () => {
    const result = await deliver(submission, business, { driver: "unconfigured", reason: "nothing set" });
    expect(result).toEqual({ ok: false, driver: "unconfigured", error: "nothing set" });
  });
});

describe("demo and local drivers", () => {
  it("demo returns previews and touches nothing", async () => {
    const result = await deliver(submission, business, { driver: "demo" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview?.customerEmail.to).toBe("jordan@example.com");
      expect(result.preview?.row.Reference).toBe(submission.id);
    }
  });

  it("local records the inquiry and writes both emails to disk", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inbox-test-"));
    try {
      const result = await deliver(submission, business, { driver: "local", dir });
      expect(result).toEqual({ ok: true, driver: "local" });
      const lines = fs.readFileSync(path.join(dir, "inbox", "catering.jsonl"), "utf8").trim().split("\n");
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0]).id).toBe(submission.id);
      const owner = fs.readFileSync(path.join(dir, "outbox", `${submission.id}-owner.txt`), "utf8");
      expect(owner).toContain("To: owner@hibana.example");
      expect(owner).toContain("Reply-To: jordan@example.com");
      const customer = fs.readFileSync(path.join(dir, "outbox", `${submission.id}-customer.txt`), "utf8");
      expect(customer).toContain("Subject: We received your catering request | Hibana");

      await deliver({ ...submission, id: "CAT-20261111-AAAA" }, business, { driver: "local", dir });
      expect(fs.readFileSync(path.join(dir, "inbox", "catering.jsonl"), "utf8").trim().split("\n")).toHaveLength(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("local reports a failure instead of throwing when the folder cannot be written", async () => {
    // A path underneath a regular file can never be created.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inbox-test-"));
    const file = path.join(dir, "not-a-folder");
    fs.writeFileSync(file, "x");
    try {
      const result = await deliver(submission, business, { driver: "local", dir: path.join(file, "data") });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.driver).toBe("local");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("Google driver, against a stand-in for the Apps Script web app", () => {
  let server: http.Server;
  let base: string;
  let mode: "ok" | "redirect" | "refuse" | "html" | "flaky" = "ok";
  let requests: Array<{ method: string; url: string; body: string }> = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        requests.push({ method: req.method ?? "", url: req.url ?? "", body });
        const json = (status: number, data: unknown) => {
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(data));
        };
        if (req.url === "/result") return json(200, { ok: true });
        if (mode === "redirect") {
          // A real Apps Script web app runs the POST, then redirects to a URL that returns the result.
          res.writeHead(302, { Location: "/result" });
          return res.end();
        }
        if (mode === "refuse") return json(200, { ok: false, error: "bad secret" });
        if (mode === "html") {
          res.writeHead(200, { "Content-Type": "text/html" });
          return res.end("<html>Sign in to continue</html>");
        }
        if (mode === "flaky" && requests.length === 1) {
          res.writeHead(500, { "Content-Type": "text/html" });
          return res.end("<html>Service error</html>");
        }
        return json(200, { ok: true });
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    requests = [];
    mode = "ok";
  });

  it("posts the inquiry as JSON with the secret and formula-safe values", async () => {
    const result = await deliverGoogle(submission, `${base}/exec`, "shared-secret");
    expect(result).toEqual({ ok: true, driver: "google" });
    expect(requests).toHaveLength(1);
    const sent = JSON.parse(requests[0].body);
    expect(sent).toMatchObject({ version: 1, secret: "shared-secret", id: submission.id, kind: "catering" });
    expect(sent.customer).toEqual(submission.customer);
    expect(sent.ackSummary).toBe(submission.ackSummary);
    expect(sent.fields.at(-1).value.startsWith("'=")).toBe(true);
  });

  it("follows the redirect a real web app answers with", async () => {
    mode = "redirect";
    expect(await deliverGoogle(submission, `${base}/exec`, "shared-secret")).toEqual({ ok: true, driver: "google" });
    expect(requests.map((r) => `${r.method} ${r.url}`)).toEqual(["POST /exec", "GET /result"]);
  });

  it("does not retry when the script refuses the request", async () => {
    mode = "refuse";
    const result = await deliverGoogle(submission, `${base}/exec`, "wrong");
    expect(result).toEqual({ ok: false, driver: "google", error: "bad secret" });
    expect(requests).toHaveLength(1);
  });

  it("retries once after a transient failure, then succeeds", async () => {
    mode = "flaky";
    expect(await deliverGoogle(submission, `${base}/exec`, "shared-secret")).toEqual({ ok: true, driver: "google" });
    expect(requests).toHaveLength(2);
  });

  it("gives up, with a useful message, when the script keeps answering with a web page", async () => {
    mode = "html";
    const result = await deliverGoogle(submission, `${base}/exec`, "shared-secret");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not JSON/);
    expect(requests).toHaveLength(2);
  });

  it("reports a network failure instead of throwing", async () => {
    const result = await deliverGoogle(submission, "http://127.0.0.1:9/exec", "shared-secret");
    expect(result.ok).toBe(false);
  });
});
