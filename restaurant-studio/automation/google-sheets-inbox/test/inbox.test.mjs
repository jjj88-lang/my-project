/**
 * Behaviour of Code.gs, run in a simulated Apps Script environment (test/support).
 * Nothing here talks to Google. See TESTING.md for what this does and does not prove.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadScript, installedProperties, SECRET, BUSINESS } from "./support/load-code.mjs";
import { SAMPLES, requestFor } from "./support/samples.mjs";

const TABS = { catering: "Catering inquiries", contact: "Messages", lead: "Leads" };
const plain = (value) => JSON.parse(JSON.stringify(value));

function assertNothingHappened(world) {
  assert.equal(world.mail.attempts, 0, "no email was attempted");
  for (const sheet of world.spreadsheet.getSheets()) assert.equal(sheet.getLastRow(), 0, `tab ${sheet.getName()} stayed empty`);
}

describe("happy path", () => {
  for (const kind of ["catering", "contact", "lead"]) {
    test(`${kind}: one row in the right tab, an email to the owner, a note to the customer`, () => {
      const { world, post, tab } = loadScript();
      const { reply, mime } = post(requestFor(SAMPLES[kind]));
      assert.equal(mime, "JSON");
      assert.deepEqual(reply, { ok: true, duplicate: false, ownerEmail: "Sent", customerEmail: "Sent" });

      const sheet = tab(TABS[kind]);
      assert.ok(sheet, "tab exists");
      const { header, rows } = sheet.table();
      assert.deepEqual(header.slice(0, 3), ["Received", "Reference", "Status"]);
      assert.deepEqual(header.slice(-2), ["Email to owner", "Note to customer"]);
      assert.deepEqual(header.slice(3, -2), SAMPLES[kind].fields.map((f) => f.label));
      assert.equal(sheet.getFrozenRows(), 1);
      assert.ok(plain(sheet.getRange(1, 1, 1, header.length).getFontWeights()[0]).every((w) => w === "bold"));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].Reference, SAMPLES[kind].id);
      assert.equal(rows[0].Status, "New");
      assert.equal(rows[0]["Email to owner"], "Sent");
      assert.equal(rows[0]["Note to customer"], "Sent");

      assert.equal(world.mail.sent.length, 2);
      const [owner, customer] = world.mail.sent;
      assert.equal(owner.to, "owner@restaurant.example");
      assert.equal(owner.replyTo, SAMPLES[kind].customer.email);
      assert.equal(customer.to, SAMPLES[kind].customer.email);
      assert.equal(customer.htmlBody, undefined, "plain text only");
      assert.equal(customer.name, BUSINESS.name);

      // The row is committed before any email goes out, and all of it happens under the lock.
      assert.ok(world.mail.sent.every((m) => m.sheetsDirtyAtSend === false));
      const webappWrites = world.journal.filter((j) => j.context === "webapp");
      assert.ok(webappWrites.length > 0 && webappWrites.every((j) => j.lockHeld), "every write held the script lock");
      assert.equal(world.lock.held, false, "lock released");
    });
  }

  test("the customer's note never contains free text the visitor typed", () => {
    const { world, post } = loadScript();
    post(requestFor(SAMPLES.catering));
    const note = world.mail.sent[1];
    assert.doesNotMatch(note.body, /HYPERLINK|Second line|Drop-off|555 0100/);
    assert.match(note.body, /Hi Mary-Jane,/);
    assert.match(note.body, /It is not a confirmation of your event, availability or pricing\./);
    assert.match(note.body, /Reference: CAT-20261212-7F3K/);
  });

  test("OWNER_EMAIL empty falls back to the account that owns the script", () => {
    const { world, post } = loadScript({ properties: installedProperties({ OWNER_EMAIL: "" }), ownerAccount: "me@owner.example" });
    post(requestFor(SAMPLES.contact));
    assert.equal(world.mail.sent[0].to, "me@owner.example");
  });
});

describe("refusals: nothing is recorded or sent", () => {
  test("wrong secret", () => {
    const { world, post } = loadScript();
    const { reply } = post(requestFor(SAMPLES.catering, { secret: SECRET.slice(0, -1) + "X" }));
    assert.equal(reply.ok, false);
    assert.equal(reply.code, "unauthorized");
    assertNothingHappened(world);
  });

  test("missing secret, and a secret that is not a string", () => {
    for (const secret of [undefined, "", 12345, null]) {
      const { world, post } = loadScript();
      const body = requestFor(SAMPLES.catering);
      if (secret === undefined) delete body.secret;
      else body.secret = secret;
      assert.equal(post(body).reply.code, "unauthorized");
      assertNothingHappened(world);
    }
  });

  test("an inbox that has not been set up refuses everything", () => {
    const { world, post } = loadScript({ properties: {} });
    assert.equal(post(requestFor(SAMPLES.catering, { secret: "" })).reply.code, "not_set_up");
    assertNothingHappened(world);
  });

  test("during a secret rotation the previous secret works until it is retired", () => {
    const { post, run } = loadScript();
    run("rotateSecret");
    assert.equal(post(requestFor(SAMPLES.catering)).reply.ok, true);
    run("retireOldSecret");
    assert.equal(post(requestFor(SAMPLES.contact)).reply.code, "unauthorized");
  });

  test("the secret comparison looks at every character and handles different lengths", () => {
    const { script } = loadScript();
    assert.equal(script.sameText_("abc", "abc"), true);
    assert.equal(script.sameText_("abc", "abd"), false);
    assert.equal(script.sameText_("abc", "abcd"), false);
    assert.equal(script.sameText_("", "a"), false);
    assert.match(script.sameText_.toString(), /for \(var i = 0; i < length; i\+\+\)/);
    assert.doesNotMatch(script.sameText_.toString(), /return false|break/, "no early exit");
  });

  test("unknown kind, and a known kind this inbox is not set up for", () => {
    const { world, post } = loadScript({ properties: installedProperties({ KINDS: "catering,contact" }) });
    assert.equal(post(requestFor(SAMPLES.catering, { kind: "order" })).reply.code, "unknown_kind");
    assert.equal(post(requestFor(SAMPLES.catering, { kind: "__proto__" })).reply.code, "unknown_kind");
    assert.equal(post(requestFor(SAMPLES.lead)).reply.code, "kind_not_enabled");
    assertNothingHappened(world);
  });

  test("malformed JSON, an empty body, a body that is not an object, an oversized body", () => {
    const { world, post } = loadScript();
    assert.equal(post("{not json").reply.code, "bad_json");
    assert.equal(post("").reply.code, "no_body");
    assert.equal(post("[1,2]").reply.code, "bad_json");
    assert.equal(post("null").reply.code, "bad_json");
    assert.equal(post("x".repeat(60001)).reply.code, "too_large");
    assert.equal(post(requestFor(SAMPLES.catering, { version: 2 })).reply.code, "unsupported_version");
    assertNothingHappened(world);
  });

  test("a request with no postData at all", () => {
    const { world, script } = loadScript();
    const reply = JSON.parse(script.doPost(undefined).getContent());
    assert.equal(reply.code, "no_body");
    assertNothingHappened(world);
  });

  const field = (label, value) => ({ label, value });
  const base = SAMPLES.contact;
  const malformed = {
    "reference id in the wrong format": { id: "CAT-2026-1" },
    "reference id with a formula": { id: "=1+1" },
    "missing kindLabel": { kindLabel: "" },
    "submittedAt that is not ISO": { submittedAt: "yesterday" },
    "a line break in the source": { source: "a\nb" },
    "no customer": { customer: null },
    "customer name too long": { customer: { name: "A".repeat(121), email: "a@example.com" } },
    "customer name with a line break": { customer: { name: "Ann\nBcc: x@example.com", email: "a@example.com" } },
    "malformed email": { customer: { name: "Ann", email: "not-an-email" } },
    "email that is too long": { customer: { name: "Ann", email: "a".repeat(250) + "@example.com" } },
    "ackSummary with a link": { ackSummary: " see http://bad.example" },
    "ackSummary with an address": { ackSummary: " write to a@b" },
    "ackSummary too long": { ackSummary: " for".repeat(40) },
    "summary that is not a string": { summary: 5 },
    "fields not a list": { fields: "x" },
    "no fields": { fields: [] },
    "31 fields": { fields: Array.from({ length: 31 }, (_, i) => field(`Field ${i + 1}`, "x")) },
    "a field that is not an object": { fields: ["x"] },
    "a label that is too long": { fields: [field("L".repeat(101), "x")] },
    "a label that starts like a formula": { fields: [field("=A1", "x")] },
    "a label with a line break": { fields: [field("a\nb", "x")] },
    "a label that repeats": { fields: [field("Phone", "1"), field("phone", "2")] },
    "a label the inbox keeps for itself": { fields: [field("Status", "Booked")] },
    "a value that is too long": { fields: [field("Message", "x".repeat(5001))] },
    "a value that is not text": { fields: [field("Guests", 40)] },
    "a value with a control character": { fields: [field("Message", "a\u0000b")] },
  };
  for (const [name, overrides] of Object.entries(malformed)) {
    test(`refuses ${name}`, () => {
      const { world, post } = loadScript();
      const { reply } = post(requestFor(base, overrides));
      assert.equal(reply.ok, false);
      assert.ok(["invalid", "unknown_kind"].includes(reply.code), reply.code);
      assert.equal(typeof reply.error, "string");
      assertNothingHappened(world);
    });
  }

  test("30 fields and values at the length caps are accepted", () => {
    const { post } = loadScript();
    const fields = Array.from({ length: 30 }, (_, i) => field(`F${i + 1}`, "v"));
    fields[0] = field("L".repeat(100), "x".repeat(5000));
    assert.equal(post(requestFor(base, { fields })).reply.ok, true);
  });

  test("paused inbox refuses, and accepts again after resumeInbox", () => {
    const { world, post, run } = loadScript();
    run("pauseInbox");
    assert.equal(post(requestFor(SAMPLES.catering)).reply.code, "paused");
    assertNothingHappened(world);
    run("resumeInbox");
    assert.equal(post(requestFor(SAMPLES.catering)).reply.ok, true);
  });

  test("busy lock: refused with JSON, nothing recorded", () => {
    const { world, post } = loadScript();
    world.lock.heldByOther = true;
    const { reply, mime } = post(requestFor(SAMPLES.catering));
    assert.equal(mime, "JSON");
    assert.equal(reply.code, "busy");
    assertNothingHappened(world);
  });
});

describe("recording", () => {
  test("a duplicate reference is answered ok with duplicate: true and nothing is sent twice", () => {
    const { world, post, tab } = loadScript();
    post(requestFor(SAMPLES.catering));
    const again = post(requestFor(SAMPLES.catering));
    assert.deepEqual(again.reply, { ok: true, duplicate: true });
    assert.equal(tab(TABS.catering).table().rows.length, 1);
    assert.equal(world.mail.sent.length, 2);
  });

  test("a new field label adds a column left of the email columns; older rows stay intact", () => {
    const { post, tab } = loadScript();
    post(requestFor(SAMPLES.contact));
    const second = requestFor(SAMPLES.contact, { id: "MSG-20261111-AAAA" });
    second.fields.splice(3, 0, { label: "Preferred time", value: "Evenings" });
    assert.equal(post(second).reply.ok, true);
    const { header, rows } = tab(TABS.contact).table();
    assert.equal(header.filter((h) => h === "Preferred time").length, 1);
    assert.ok(header.indexOf("Preferred time") < header.indexOf("Email to owner"));
    assert.deepEqual(header.slice(-2), ["Email to owner", "Note to customer"]);
    assert.equal(rows[0]["Preferred time"], "");
    assert.equal(rows[0]["Email to owner"], "Sent");
    assert.equal(rows[1]["Preferred time"], "Evenings");
    assert.equal(rows[1]["Note to customer"], "Sent");
  });

  test("columns the owner reordered are still found by their heading", () => {
    const { post, tab } = loadScript();
    post(requestFor(SAMPLES.contact));
    const sheet = tab(TABS.contact);
    sheet.moveColumn(sheet.table().header.indexOf("Message") + 1, 1);
    post(requestFor(SAMPLES.contact, { id: "MSG-20261111-BBBB" }));
    const { rows } = sheet.table();
    assert.equal(rows[1].Message, "@SUM(A1:A2) do you have parking:");
    assert.equal(rows[1].Reference, "MSG-20261111-BBBB");
  });

  const INJECTIONS = ["=1+1", '=HYPERLINK("http://bad.example","x")', "+15555550100", "-2+3", "@SUM(A1)", "\t=1+1", "\r=1+1", "2026-12-12", "40", "TRUE"];
  for (const viaSite of [true, false]) {
    test(`formula injection: nothing is evaluated or converted (${viaSite ? "apostrophe added by the site" : "raw values sent straight to the script"})`, () => {
      const { post, tab } = loadScript();
      const fields = INJECTIONS.map((value, i) => ({ label: `Field ${i + 1}`, value }));
      const body = requestFor(SAMPLES.contact, { fields });
      if (!viaSite) body.fields = fields;
      assert.equal(post(body).reply.ok, true);
      const sheet = tab(TABS.contact);
      assert.deepEqual(plain(sheet.formulaCells()), []);
      assert.deepEqual(plain(sheet.convertedCells()), []);
      const row = sheet.table().rows[0];
      INJECTIONS.forEach((value, i) => assert.equal(row[`Field ${i + 1}`], value, `shown exactly as typed: ${JSON.stringify(value)}`));
    });
  }

  test("a passing Sheets error is retried once and the row is written once", () => {
    const { world, post, tab } = loadScript();
    world.failNext("Range.setValues");
    const { reply } = post(requestFor(SAMPLES.catering));
    assert.equal(reply.ok, true);
    assert.equal(tab(TABS.catering).table().rows.length, 1);
  });
});

describe("email limits and failures never lose the row", () => {
  test("daily quota exhausted: row recorded, both marked not sent, no email attempted", () => {
    const { world, post, tab } = loadScript({ quota: 0 });
    const { reply } = post(requestFor(SAMPLES.catering));
    assert.equal(reply.ok, true);
    assert.equal(world.mail.attempts, 0);
    const row = tab(TABS.catering).table().rows[0];
    assert.equal(row.Reference, SAMPLES.catering.id);
    assert.equal(row["Email to owner"], "Email not sent: daily email limit reached");
    assert.equal(row["Note to customer"], "Email not sent: daily email limit reached");
    assert.equal(tab(TABS.catering).cellUnder("Note to customer", 2).background, "#fce8e6");
  });

  test("quota for one more email: the owner gets it, and is told the customer got no note", () => {
    const { world, post, tab } = loadScript({ quota: 1 });
    post(requestFor(SAMPLES.catering));
    assert.equal(world.mail.sent.length, 1);
    assert.match(world.mail.sent[0].body, /No automatic note was sent, because your Google account reached its daily email limit/);
    assert.equal(tab(TABS.catering).table().rows[0]["Note to customer"], "Email not sent: daily email limit reached");
  });

  test("hourly cap: rows still recorded, no customer notes, the owner is told once, next hour resumes", () => {
    const { world, post, tab } = loadScript({ properties: installedProperties({ HOURLY_LIMIT: "3" }) });
    for (let i = 0; i < 6; i++) {
      const reply = post(requestFor(SAMPLES.contact, { id: `MSG-20261111-H00${i}` })).reply;
      assert.equal(reply.ok, true);
    }
    const rows = tab(TABS.contact).table().rows;
    assert.equal(rows.length, 6);
    assert.deepEqual(rows.map((r) => r["Note to customer"]), ["Sent", "Sent", "Sent", "Email not sent: hourly limit reached", "Email not sent: hourly limit reached", "Email not sent: hourly limit reached"]);
    const notices = world.mail.sent.filter((m) => /emails paused for the rest of this hour/.test(m.subject));
    assert.equal(notices.length, 1);
    assert.equal(notices[0].to, "owner@restaurant.example");
    assert.equal(world.mail.sent.filter((m) => m.to === SAMPLES.contact.customer.email).length, 3);

    world.clock.advance(60 * 60 * 1000);
    post(requestFor(SAMPLES.contact, { id: "MSG-20261111-NEXT" }));
    assert.equal(tab(TABS.contact).table().rows[6]["Note to customer"], "Sent");
  });

  test("the customer note fails after the row is written: row kept, marked, owner corrected", () => {
    const { world, post, tab } = loadScript();
    world.mail.failWhen = (message) => (message.to === SAMPLES.catering.customer.email ? new Error("Mail service unavailable") : undefined);
    const { reply } = post(requestFor(SAMPLES.catering));
    assert.equal(reply.ok, true);
    const row = tab(TABS.catering).table().rows[0];
    assert.equal(row["Email to owner"], "Sent");
    assert.match(row["Note to customer"], /^Email not sent: error \(Mail service unavailable\)/);
    assert.ok(world.mail.sent.some((m) => /^Correction: the automatic note for CAT-20261212-7F3K was not sent$/.test(m.subject)));
  });

  test("every email fails: row kept, both marked not sent, the site still gets ok", () => {
    const { world, post, tab } = loadScript();
    world.mail.failWhen = () => new Error("boom");
    const { reply } = post(requestFor(SAMPLES.lead));
    assert.equal(reply.ok, true);
    const row = tab(TABS.lead).table().rows[0];
    assert.equal(row.Reference, SAMPLES.lead.id);
    assert.match(row["Email to owner"], /^Email not sent: error/);
    assert.match(row["Note to customer"], /^Email not sent: error/);
    // The log never holds the customer's address.
    assert.ok(world.console.every((line) => !line.text.includes("@sample-sushi.example")));
  });

  test("the quota check itself throws: the script still tries, and the row is kept", () => {
    const { world, post } = loadScript();
    world.failNext("MailApp.getRemainingDailyQuota");
    assert.equal(post(requestFor(SAMPLES.contact)).reply.ok, true);
    assert.equal(world.mail.sent.length, 2);
  });

  test("business details missing: no note to the customer, and the owner is told so", () => {
    const { world, post, tab } = loadScript({ properties: installedProperties({ BUSINESS_PHONE: "" }) });
    post(requestFor(SAMPLES.contact));
    assert.equal(world.mail.sent.length, 1);
    assert.match(world.mail.sent[0].body, /business name, phone or address is missing/);
    assert.equal(tab(TABS.contact).table().rows[0]["Note to customer"], "Email not sent: business details missing in script settings");
  });
});

describe("editor functions and doGet", () => {
  test("doGet answers JSON and reveals no data", () => {
    const { get, post } = loadScript();
    post(requestFor(SAMPLES.catering));
    const { reply, mime, text } = get();
    assert.equal(mime, "JSON");
    assert.equal(reply.ok, true);
    assert.deepEqual(Object.keys(reply).sort(), ["ok", "script", "service"]);
    assert.doesNotMatch(text, /@|CAT-|Hibana|secret/i);
  });

  test("setup(): tabs with bold frozen headers, a long random secret, default properties, instructions in the log", () => {
    const { world, run, tab } = loadScript({ properties: {}, ownerAccount: "owner@restaurant.example" });
    const result = run("setup");
    assert.deepEqual(result.tabs, ["Catering inquiries", "Messages"]);
    for (const name of result.tabs) {
      assert.equal(tab(name).getFrozenRows(), 1);
      assert.deepEqual(tab(name).table().header, ["Received", "Reference", "Status", "Email to owner", "Note to customer"]);
    }
    const secret = world.properties.get("INBOX_SECRET");
    assert.match(secret, /^[0-9a-f]{64}$/);
    assert.equal(world.properties.get("OWNER_EMAIL"), "owner@restaurant.example");
    assert.equal(world.properties.get("HOURLY_LIMIT"), "20");
    assert.equal(world.properties.get("PAUSED"), "no");
    assert.equal(world.properties.get("BUSINESS_NAME"), "");
    const log = world.logger.join("\n");
    assert.match(log, new RegExp(`INBOX_GOOGLE_SECRET = ${secret}`));
    assert.match(log, /INBOX_GOOGLE_URL/);
    assert.match(log, /Fill in BUSINESS_NAME, BUSINESS_PHONE, BUSINESS_ADDRESS/);

    // Running it again changes nothing that was already set.
    world.properties.set("BUSINESS_NAME", "Kept");
    run("setup");
    assert.equal(world.properties.get("INBOX_SECRET"), secret);
    assert.equal(world.properties.get("BUSINESS_NAME"), "Kept");
    assert.equal(world.spreadsheet.getSheets().filter((s) => s.getName() === "Messages").length, 1);
  });

  test("setupStudio(): one Leads tab for the studio's own inbox", () => {
    const { world, run } = loadScript({ properties: {} });
    const result = run("setupStudio");
    assert.deepEqual(result.tabs, ["Leads"]);
    assert.equal(world.properties.get("KINDS"), "lead");
  });

  test("setup() in a script that is not attached to a Sheet explains what to do", () => {
    const { run } = loadScript({ properties: {}, bound: false });
    assert.throws(() => run("setup"), /not attached to a Google Sheet/);
  });

  test("testSubmission(): one fake row and both emails to the owner's own address", () => {
    const { world, run, tab } = loadScript({ properties: {}, ownerAccount: "owner@restaurant.example" });
    run("setup");
    world.properties.set("BUSINESS_NAME", BUSINESS.name);
    world.properties.set("BUSINESS_PHONE", BUSINESS.phone);
    world.properties.set("BUSINESS_ADDRESS", BUSINESS.address);
    const answer = run("testSubmission");
    assert.equal(answer.ok, true);
    const sheet = tab("Catering inquiries");
    const row = sheet.table().rows[0];
    assert.match(row.Reference, /^TEST-\d{8}-[0-9A-F]{4}$/);
    assert.equal(row["Your name"], "Test Customer");
    assert.match(row["Anything else we should know?"], /^=1\+1 This is a test/);
    assert.equal(row.Phone, "+1 (555) 555-0100");
    assert.deepEqual(plain(sheet.formulaCells()), []);
    assert.equal(world.mail.sent.length, 2);
    assert.ok(world.mail.sent.every((m) => m.to === "owner@restaurant.example"));
    assert.match(world.mail.sent[1].body, /We received your catering request for \w+day, \w+ \d{1,2}, 2026 \(25 guests\)\./);
    assert.match(world.logger.join("\n"), /went through/);
  });

  test("testSubmission() before setup fails with a clear message", () => {
    const { run } = loadScript({ properties: {} });
    assert.throws(() => run("testSubmission"), /Run setup first/);
  });
});
