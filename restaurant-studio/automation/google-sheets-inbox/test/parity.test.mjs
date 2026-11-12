/**
 * PARITY: the emails and the row Code.gs produces must be identical, character for character, to
 * what apps/restaurant/src/lib/inbox/messages.ts produces for the same submission. The sample
 * sites show messages.ts output as their demo preview, so this keeps the preview honest.
 *
 * The request is captured from the real deliverGoogle driver (drivers/google.ts), so the script
 * is fed exactly the body a live site sends.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACK_TEMPLATES,
  SHEET_NAMES,
  renderOwnerEmail,
  renderCustomerEmail,
  sheetRow,
  safeCell,
  firstName,
} from "../../../apps/restaurant/src/lib/inbox/messages.ts";
import { deliverGoogle } from "../../../apps/restaurant/src/lib/inbox/drivers/google.ts";
import { loadScript, installedProperties, SECRET, BUSINESS } from "./support/load-code.mjs";
import { SAMPLES } from "./support/samples.mjs";

const OWNER = "owner@restaurant.example";
const business = { ...BUSINESS, ownerEmail: OWNER };
const plain = (value) => JSON.parse(JSON.stringify(value));

/** The JSON body deliverGoogle would POST for this submission. */
async function capturedRequest(submission) {
  let body;
  const fakeFetch = async (_url, init) => {
    body = init.body;
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  };
  const result = await deliverGoogle(submission, "https://script.google.com/macros/s/TEST/exec", SECRET, fakeFetch);
  assert.equal(result.ok, true);
  return body;
}

// Extra cases that stress the shared rules: odd names, labels ending in ? or :, empty values.
const EXTRA = {
  ...SAMPLES.contact,
  id: "MSG-20261111-ZZ99",
  customer: { name: "  Zoë-Anne D’Arcy!! <b>", email: "zoe@example.net" },
  summary: "",
  fields: [
    { label: "Your name", value: "Zoë-Anne D’Arcy" },
    { label: "Email", value: "zoe@example.net" },
    { label: "Allergies:", value: "-peanuts" },
    { label: "Seating?", value: "" },
    { label: "Notes?", value: "+ window seat\nthanks" },
  ],
};
const NUMERIC_NAME = { ...SAMPLES.lead, id: "LEAD-20261111-0000", customer: { name: "12345", email: "n@example.com" } };

const CASES = [SAMPLES.catering, SAMPLES.contact, SAMPLES.lead, EXTRA, NUMERIC_NAME];

for (const submission of CASES) {
  test(`parity for ${submission.id} (${submission.kind})`, async () => {
    const { world, post, tab } = loadScript({ properties: installedProperties({ OWNER_EMAIL: OWNER }) });
    const { reply } = post(await capturedRequest(submission));
    assert.equal(reply.ok, true, JSON.stringify(reply));

    const [ownerSent, customerSent] = world.mail.sent;
    const expectedOwner = renderOwnerEmail(submission, business);
    assert.equal(ownerSent.to, expectedOwner.to);
    assert.equal(ownerSent.replyTo, expectedOwner.replyTo);
    assert.equal(ownerSent.subject, expectedOwner.subject);
    assert.equal(ownerSent.body, expectedOwner.text);

    const expectedCustomer = renderCustomerEmail(submission, business);
    assert.equal(customerSent.to, expectedCustomer.to);
    assert.equal(customerSent.subject, expectedCustomer.subject);
    assert.equal(customerSent.body, expectedCustomer.text);

    // The row: every column sheetRow defines, with exactly the string handed to the sheet.
    const sheet = tab(SHEET_NAMES[submission.kind]);
    const raw = plain(sheet.rawRow(2));
    const expectedRow = sheetRow(submission);
    for (const [heading, value] of Object.entries(expectedRow)) {
      assert.equal(raw[heading], value, `column ${heading}`);
    }
    const extraColumns = Object.keys(raw).filter((h) => !(h in expectedRow));
    assert.deepEqual(extraColumns, ["Email to owner", "Note to customer"]);
  });
}

test("the script's templates, tab names and helpers equal those in messages.ts", () => {
  const { script } = loadScript();
  const config = plain(script.CONFIG);
  assert.deepEqual(Object.keys(config.KINDS).sort(), Object.keys(ACK_TEMPLATES).sort());
  for (const kind of Object.keys(ACK_TEMPLATES)) {
    assert.deepEqual(config.KINDS[kind].ack, ACK_TEMPLATES[kind], `ack template for ${kind}`);
    assert.equal(config.KINDS[kind].sheet, SHEET_NAMES[kind], `tab name for ${kind}`);
  }
  for (const value of ["=1", "+1", "-1", "@a", "\tx", "\rx", "'=x", "plain", "", " =1"]) {
    assert.equal(script.safeCell_(value), safeCell(value), `safeCell ${JSON.stringify(value)}`);
  }
  for (const name of ["Mary-Jane O'Neil", "  José  Álvarez", "Zoë!!", "12345", "", "李 小龙", "D’Arcy's", "A".repeat(60)]) {
    assert.equal(script.firstName_(name), firstName(name), `firstName ${JSON.stringify(name)}`);
  }
});
