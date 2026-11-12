/**
 * The Leads tab must match what the website inbox script writes, heading for heading, or new
 * website leads would land in freshly added columns instead of the prepared ones.
 *
 * These tests read the two places that define the contract:
 *   automation/google-sheets-inbox/Code.gs          the first three and last two columns, the statuses
 *   apps/agency/src/lib/lead/definition.ts          the labels of the contact form's fields
 * If either file is not there (the folder was moved, or this tool was copied on its own), the
 * matching test is skipped. If a label changes there, change LEAD_SCRIPT_COLUMNS in
 * lib/columns.mjs to match and rebuild the workbook.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { LEAD_COLUMNS, LEAD_EXTRA_COLUMNS, LEAD_SCRIPT_COLUMNS, LEAD_STATUSES, SHEETS } from "../lib/columns.mjs";
import { STUDIO_ROOT } from "../lib/config.mjs";

const scriptFile = path.join(STUDIO_ROOT, "automation", "google-sheets-inbox", "Code.gs");
const formFile = path.join(STUDIO_ROOT, "apps", "agency", "src", "lib", "lead", "definition.ts");
const headers = LEAD_SCRIPT_COLUMNS.map((column) => column.header);

describe("the Leads tab and the website inbox", () => {
  it("keeps our own columns to the right of the script's", () => {
    assert.deepEqual(LEAD_COLUMNS.slice(0, LEAD_SCRIPT_COLUMNS.length), LEAD_SCRIPT_COLUMNS);
    assert.deepEqual(LEAD_COLUMNS.slice(LEAD_SCRIPT_COLUMNS.length), LEAD_EXTRA_COLUMNS);
    assert.equal(new Set(LEAD_COLUMNS.map((column) => column.header)).size, LEAD_COLUMNS.length, "no heading is used twice");
  });

  it("uses the script's own columns, statuses and tab name", { skip: fs.existsSync(scriptFile) ? false : "the inbox script is not in this checkout" }, () => {
    const source = fs.readFileSync(scriptFile, "utf8");

    const columns = /COLUMNS:\s*\{([^}]*)\}/.exec(source);
    assert.ok(columns, "could not find CONFIG.COLUMNS in Code.gs");
    const named = Object.fromEntries([...columns[1].matchAll(/(\w+):\s*"([^"]+)"/g)].map((match) => [match[1], match[2]]));
    assert.deepEqual(headers.slice(0, 3), [named.received, named.reference, named.status]);
    assert.deepEqual(headers.slice(-2), [named.ownerEmail, named.customerEmail]);

    const statuses = /STATUSES:\s*\[([^\]]*)\]/.exec(source);
    assert.ok(statuses, "could not find CONFIG.STATUSES in Code.gs");
    assert.deepEqual([...statuses[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]), LEAD_STATUSES);

    const leadKind = /lead:\s*\{\s*sheet:\s*"([^"]+)"/.exec(source);
    assert.ok(leadKind, 'could not find the "lead" kind in Code.gs');
    assert.equal(leadKind[1], SHEETS.leads);
  });

  it("uses the contact form's field labels", { skip: fs.existsSync(formFile) ? false : "the agency site is not in this checkout" }, () => {
    const source = fs.readFileSync(formFile, "utf8");
    const start = source.indexOf("export const LEAD_FIELDS");
    assert.notEqual(start, -1, "could not find LEAD_FIELDS in definition.ts");
    const end = source.indexOf("\n];", start);
    const labels = [...source.slice(start, end).matchAll(/label:\s*"([^"]+)"/g)].map((match) => match[1]);
    assert.ok(labels.length >= 5, "found too few field labels to be the real form");
    assert.deepEqual(headers.slice(3, -2), labels, "the form's labels and the Leads tab's headings have drifted apart");
  });
});
