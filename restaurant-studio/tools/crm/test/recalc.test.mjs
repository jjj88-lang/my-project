/**
 * Has a real spreadsheet program work out the Dashboard.
 *
 * The workbook is written without stored results, so the structure tests can only compare
 * formula text. Here LibreOffice opens the file, calculates every formula and exports the
 * Dashboard, and the numbers are compared with ones worked out by hand in helpers.mjs.
 *
 * LibreOffice is not Google Sheets or Excel, but it is an independent program reading the same
 * formulas. The test is skipped where LibreOffice ("soffice") is not installed.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { after, before, describe, it } from "node:test";
import { addDays, buildWorkbook, localToday, readProspectsCsv } from "../build-crm.mjs";
import { CLIENT_COLUMNS, LEAD_COLUMNS, OUTREACH_STATUSES } from "../lib/columns.mjs";
import { loadConfig } from "../lib/config.mjs";
import { parseCsv } from "../lib/csv.mjs";
import { SAMPLE_EXPECTED, prospectsCsv, sampleProspects, tempDir } from "./helpers.mjs";

function findOffice() {
  for (const command of ["soffice", "libreoffice"]) {
    const probe = spawnSync(command, ["--version"], { encoding: "utf8", timeout: 30000 });
    if (probe.status === 0) return command;
  }
  return null;
}

const office = findOffice();
const { pricing } = loadConfig();

function setCell(sheet, columns, row, key, value) {
  const index = columns.findIndex((column) => column.key === key);
  assert.notEqual(index, -1, `no column "${key}"`);
  sheet.getCell(row, index + 1).value = value;
}

/** Opens the workbook in LibreOffice, recalculates it and returns the Dashboard as label -> value. */
function recalculatedDashboard(dir, file) {
  const outDir = path.join(dir, "out");
  const profile = pathToFileURL(path.join(dir, "office-profile")).href;
  const result = spawnSync(
    office,
    ["--headless", "--norestore", `-env:UserInstallation=${profile}`, "--convert-to", "csv", "--outdir", outDir, file],
    { encoding: "utf8", timeout: 150000 },
  );
  assert.equal(result.status, 0, `LibreOffice failed: ${result.stderr || result.stdout}`);
  const csv = path.join(outDir, `${path.basename(file, ".xlsx")}.csv`);
  assert.ok(fs.existsSync(csv), `LibreOffice wrote no CSV. Output: ${result.stdout}`);

  const values = new Map();
  for (const [label, value] of parseCsv(fs.readFileSync(csv, "utf8"))) {
    if (label && value !== undefined && value !== "") values.set(label, value);
  }
  return values;
}

describe("the Dashboard, calculated by LibreOffice", { skip: office ? false : "LibreOffice (soffice) is not installed" }, () => {
  let dir;
  before(() => {
    dir = tempDir("recalc");
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("counts a known set of prospects, leads and clients correctly", { timeout: 180000 }, async () => {
    const today = localToday();
    const { rows } = readProspectsCsv(prospectsCsv(sampleProspects(today)), pricing);
    const workbook = buildWorkbook({ prospects: rows, pricing, today });

    // Three website leads: two still New, one already answered.
    const leads = workbook.getWorksheet("Leads");
    ["New", "New", "Contacted"].forEach((status, index) => {
      setCell(leads, LEAD_COLUMNS, index + 2, "received", `2026-11-0${index + 1} 10:00`);
      setCell(leads, LEAD_COLUMNS, index + 2, "reference", `LEAD-SAMPLE-${index + 1}`);
      setCell(leads, LEAD_COLUMNS, index + 2, "status", status);
      setCell(leads, LEAD_COLUMNS, index + 2, "restaurant", `Sample Lead ${index + 1}`);
    });

    // Two clients: one on maintenance with a check-in that is due, one without and not due.
    const clients = workbook.getWorksheet("Clients");
    setCell(clients, CLIENT_COLUMNS, 2, "restaurant", "Sample Bakery Cafe");
    setCell(clients, CLIENT_COLUMNS, 2, "maintenancePlan", "Yes");
    setCell(clients, CLIENT_COLUMNS, 2, "nextCheckIn", addDays(today, -1));
    setCell(clients, CLIENT_COLUMNS, 3, "restaurant", "Sample Dumpling Bar");
    setCell(clients, CLIENT_COLUMNS, 3, "maintenancePlan", "No");
    setCell(clients, CLIENT_COLUMNS, 3, "nextCheckIn", addDays(today, 10));

    const file = path.join(dir, "sample.xlsx");
    await workbook.xlsx.writeFile(file);
    const dashboard = recalculatedDashboard(dir, file);

    for (const [label, expected] of Object.entries(SAMPLE_EXPECTED)) {
      assert.ok(dashboard.has(label), `the Dashboard has no line called "${label}"`);
      assert.equal(Number(dashboard.get(label)), expected, label);
    }
    // The status counts add up to the total, so no row was counted twice or missed.
    const sum = OUTREACH_STATUSES.reduce((total, status) => total + Number(dashboard.get(status)), 0);
    assert.equal(sum, Number(dashboard.get("All prospects")));
  });

  it("shows zeros, not errors, when the workbook is empty", { timeout: 180000 }, async () => {
    const workbook = buildWorkbook({ prospects: [], pricing });
    const file = path.join(dir, "empty.xlsx");
    await workbook.xlsx.writeFile(file);
    const dashboard = recalculatedDashboard(dir, file);

    for (const label of Object.keys(SAMPLE_EXPECTED)) {
      assert.equal(dashboard.get(label), "0", `${label} should be 0 in an empty workbook, got ${dashboard.get(label)}`);
    }
    for (const value of dashboard.values()) assert.doesNotMatch(String(value), /^(#|Err:)/, "a Dashboard cell shows an error");
  });

  it("calculates the two example rows of the template", { timeout: 180000 }, async () => {
    const workbook = buildWorkbook({ pricing });
    const file = path.join(dir, "template.xlsx");
    await workbook.xlsx.writeFile(file);
    const dashboard = recalculatedDashboard(dir, file);
    const { starter, premium } = pricing.packages;

    assert.equal(Number(dashboard.get("All prospects")), 2);
    assert.equal(Number(dashboard.get("Follow-ups due today")), 1);
    assert.equal(Number(dashboard.get("Follow-ups overdue")), 0);
    assert.equal(Number(dashboard.get("Contacted before a phone check")), 0);
    assert.equal(Number(dashboard.get("Open pipeline value")), premium.price);
    assert.equal(Number(dashboard.get("Won value")), starter.price);
    assert.equal(Number(dashboard.get("Deposits outstanding (amount)")), (starter.price * pricing.depositPercent) / 100);
  });
});
