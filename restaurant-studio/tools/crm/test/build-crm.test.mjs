/**
 * Builds the workbook into a temporary folder, opens the file again and checks what is in it:
 * the tabs, the headings, the dropdowns, the Dashboard formulas and the formatting rules.
 *
 * The formula checks do not trust the builder's own idea of where a column is. They look the
 * heading up in the file that was written and expect the formula to point at that letter.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import ExcelJS from "exceljs";
import {
  CLIENT_ROWS,
  LEAD_ROWS,
  PROSPECT_ROWS,
  buildWorkbook,
  calendarDate,
  dashboardRows,
  localToday,
  parseArgs,
  readProspectsCsv,
} from "../build-crm.mjs";
import {
  CLIENT_COLUMNS,
  LEAD_COLUMNS,
  LEAD_STATUSES,
  OUTREACH_STATUSES,
  PAYMENT_STATUSES,
  PROSPECT_COLUMNS,
  PROSPECT_HEADERS,
  SHEET_ORDER,
  columnLetter,
} from "../lib/columns.mjs";
import { isTrackedLocation, loadConfig, packageOptions, STUDIO_ROOT } from "../lib/config.mjs";
import { parseCsv } from "../lib/csv.mjs";
import { prospectsCsv, sampleProspects, tempDir } from "./helpers.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const toolDir = path.resolve(here, "..");
const { pricing } = loadConfig();
const today = localToday();

async function writeAndReopen(workbook, file) {
  await workbook.xlsx.writeFile(file);
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.readFile(file);
  return reopened;
}

/** The headings of row 1, as written in the file. */
function headings(sheet) {
  const values = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell) => values.push(String(cell.value)));
  return values;
}

/** The letter of the column whose heading is `heading`, read from the file itself. */
function letterIn(sheet, heading) {
  const index = headings(sheet).indexOf(heading);
  assert.notEqual(index, -1, `no "${heading}" column on the ${sheet.name} tab`);
  return columnLetter(index + 1);
}

function formulaOf(cell) {
  const value = cell.value;
  return value && typeof value === "object" && typeof value.formula === "string" ? value.formula : null;
}

/** Follows every Lists!$X$n reference in a formula and returns the words in those cells. */
function listWords(formula, lists) {
  return [...formula.matchAll(/Lists!\$([A-Z]+)\$(\d+)/g)].map((match) => lists.getCell(`${match[1]}${match[2]}`).value);
}

describe("the empty template", () => {
  let dir;
  let workbook;
  const sheet = (name) => workbook.getWorksheet(name);

  before(async () => {
    dir = tempDir("template");
    workbook = await writeAndReopen(buildWorkbook({ pricing, today }), path.join(dir, "template.xlsx"));
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("has the five tabs in order", () => {
    assert.deepEqual(workbook.worksheets.map((worksheet) => worksheet.name), SHEET_ORDER);
    assert.deepEqual(SHEET_ORDER, ["Dashboard", "Prospects", "Leads", "Clients", "Lists"]);
  });

  it("has the Prospects headings the founder asked for, in order", () => {
    assert.deepEqual(headings(sheet("Prospects")), [
      "Restaurant",
      "City",
      "Cuisine",
      "Contact name",
      "Phone",
      "Public email",
      "Website",
      "Other listings",
      "Observed issue",
      "Evidence",
      "Checked on my phone",
      "What I confirmed",
      "Suggested package",
      "Fit (1 to 5)",
      "Best contact route",
      "Outreach status",
      "Last contact",
      "Response",
      "Next follow-up",
      "Deal value",
      "Payment status",
      "Notes",
    ]);
    assert.deepEqual(headings(sheet("Prospects")), PROSPECT_HEADERS);
  });

  it("has the Leads and Clients headings", () => {
    assert.deepEqual(headings(sheet("Leads")), LEAD_COLUMNS.map((column) => column.header));
    assert.deepEqual(headings(sheet("Leads")).slice(0, 3), ["Received", "Reference", "Status"]);
    assert.deepEqual(headings(sheet("Clients")), CLIENT_COLUMNS.map((column) => column.header));
    for (const wanted of ["Package", "Add-ons", "Agreement signed", "Deposit paid", "Materials received", "First draft sent", "Revision rounds used", "Approved", "Balance paid", "Launch date", "Domain registrar", "Domain account", "Hosting", "Maintenance plan", "Maintenance start", "Next check-in", "Notes"]) {
      assert.ok(headings(sheet("Clients")).includes(wanted), `Clients is missing "${wanted}"`);
    }
  });

  it("keeps prospects-template.csv in step with the Prospects tab", () => {
    const rows = parseCsv(fs.readFileSync(path.join(toolDir, "prospects-template.csv"), "utf8"));
    assert.equal(rows.length, 1, "the template holds the header row only");
    assert.deepEqual(rows[0], PROSPECT_HEADERS);
  });

  it("lists the dropdown values on the Lists tab", () => {
    const lists = sheet("Lists");
    const column = (heading) => {
      const letter = letterIn(lists, heading);
      const values = [];
      for (let row = 2; lists.getCell(`${letter}${row}`).value; row++) values.push(lists.getCell(`${letter}${row}`).value);
      return values;
    };
    assert.deepEqual(column("Outreach status"), ["Not checked yet", "Checked and ready", "Emailed", "Called", "Visited", "Replied", "Call booked", "Proposal sent", "Won", "Lost", "Do not contact"]);
    assert.deepEqual(column("Payment status"), ["None yet", "Deposit requested", "Deposit paid", "Balance requested", "Paid in full", "Refunded"]);
    assert.deepEqual(column("Evidence"), ["verified-by-search", "needs-visual-check"]);
    assert.deepEqual(column("Lead status"), LEAD_STATUSES);
    assert.deepEqual(column("Suggested package"), packageOptions(pricing).map((option) => option.label));
  });

  it("puts a dropdown on Outreach status and Payment status that reads the right list", () => {
    const prospects = sheet("Prospects");
    const lists = sheet("Lists");
    const check = (heading, expected) => {
      const letter = letterIn(prospects, heading);
      for (const row of [2, 3, PROSPECT_ROWS + 1]) {
        const validation = prospects.getCell(`${letter}${row}`).dataValidation;
        assert.equal(validation?.type, "list", `${heading} row ${row} has no dropdown`);
        const match = /^Lists!\$([A-Z]+)\$(\d+):\$([A-Z]+)\$(\d+)$/.exec(validation.formulae[0]);
        assert.ok(match, `unexpected dropdown source: ${validation.formulae[0]}`);
        const values = [];
        for (let listRow = Number(match[2]); listRow <= Number(match[4]); listRow++) values.push(lists.getCell(`${match[1]}${listRow}`).value);
        assert.deepEqual(values, expected);
        assert.equal(validation.showErrorMessage, true);
        assert.equal(validation.errorStyle, "stop", `${heading} must refuse a value that is not in the list`);
      }
      assert.equal(prospects.getCell(`${letter}${PROSPECT_ROWS + 2}`).dataValidation?.type, undefined, "the dropdown stops after the prepared rows");
    };
    check("Outreach status", OUTREACH_STATUSES);
    check("Payment status", PAYMENT_STATUSES);
  });

  it("validates dates, the fit score and the deal value", () => {
    const prospects = sheet("Prospects");
    for (const heading of ["Checked on my phone", "Last contact", "Next follow-up"]) {
      assert.equal(prospects.getCell(`${letterIn(prospects, heading)}2`).dataValidation?.type, "date", heading);
    }
    const fit = prospects.getCell(`${letterIn(prospects, "Fit (1 to 5)")}2`).dataValidation;
    assert.equal(fit.type, "whole");
    assert.deepEqual(fit.formulae.map(Number), [1, 5]);
    assert.equal(prospects.getCell(`${letterIn(prospects, "Deal value")}2`).dataValidation?.type, "decimal");
    const clients = sheet("Clients");
    assert.equal(clients.getCell(`${letterIn(clients, "Next check-in")}${CLIENT_ROWS + 1}`).dataValidation?.type, "date");
    const leads = sheet("Leads");
    assert.equal(leads.getCell(`${letterIn(leads, "Status")}${LEAD_ROWS + 1}`).dataValidation?.type, "list");
  });

  it("freezes the header row, adds a filter and wraps text", () => {
    for (const name of ["Prospects", "Leads", "Clients"]) {
      const worksheet = sheet(name);
      const view = worksheet.views[0];
      assert.equal(view.state, "frozen", `${name} header is not frozen`);
      assert.equal(view.ySplit, 1);
      assert.ok(worksheet.autoFilter, `${name} has no filter`);
    }
    assert.equal(sheet("Prospects").views[0].xSplit, 1, "the restaurant name stays in view when scrolling sideways");
    const prospects = sheet("Prospects");
    const notes = letterIn(prospects, "Notes");
    assert.equal(prospects.getCell(`${notes}2`).alignment?.wrapText, true);
    assert.equal(prospects.getCell(`${notes}${PROSPECT_ROWS + 1}`).alignment?.wrapText, true, "empty prepared rows wrap too");
    assert.ok(prospects.getColumn(letterIn(prospects, "Observed issue")).width >= 40);
    assert.ok(prospects.getColumn(letterIn(prospects, "Fit (1 to 5)")).width <= 10);
  });

  it("highlights follow-ups that are due and greys out closed rows", () => {
    const prospects = sheet("Prospects");
    const status = letterIn(prospects, "Outreach status");
    const followUp = letterIn(prospects, "Next follow-up");
    const rules = prospects.conditionalFormattings.flatMap((block) => block.rules.map((rule) => ({ ref: block.ref, formula: rule.formulae[0] })));

    const grey = rules.find((rule) => rule.formula === `OR($${status}2="Lost",$${status}2="Do not contact")`);
    assert.ok(grey, "no rule greys out Lost and Do not contact");
    assert.equal(grey.ref, `A2:${columnLetter(PROSPECT_COLUMNS.length)}${PROSPECT_ROWS + 1}`, "the grey rule covers whole rows");

    const closedGuard = `$${status}2<>"Lost",$${status}2<>"Do not contact"`;
    const overdue = `AND($${followUp}2<>"",$${followUp}2<TODAY(),${closedGuard})`;
    const dueToday = `AND($${followUp}2<>"",$${followUp}2=TODAY(),${closedGuard})`;
    for (const ref of [`${followUp}2:${followUp}${PROSPECT_ROWS + 1}`, `A2:A${PROSPECT_ROWS + 1}`]) {
      assert.ok(rules.some((rule) => rule.ref === ref && rule.formula === overdue), `no overdue rule on ${ref}`);
      assert.ok(rules.some((rule) => rule.ref === ref && rule.formula === dueToday), `no due-today rule on ${ref}`);
    }
  });

  it("writes every Dashboard number as a formula", () => {
    const dashboard = sheet("Dashboard");
    const expected = dashboardRows(pricing);
    for (const line of expected) {
      const cell = dashboard.getCell(line.row, 2);
      if (line.formula) assert.equal(formulaOf(cell), line.formula, `row ${line.row} (${line.label || line.id})`);
      else assert.equal(cell.value, null, `row ${line.row} should have no value`);
    }
    let formulas = 0;
    dashboard.getColumn(2).eachCell((cell) => {
      if (cell.value === null || cell.value === undefined) return; // a styled cell with nothing in it
      assert.ok(formulaOf(cell), `Dashboard ${cell.address} holds a typed-in value, not a formula`);
      formulas++;
    });
    assert.equal(formulas, expected.filter((line) => line.formula).length);
  });

  it("points each Dashboard formula at the right columns and the right words", () => {
    const dashboard = sheet("Dashboard");
    const lists = sheet("Lists");
    const prospects = sheet("Prospects");
    const whole = (worksheet, heading) => {
      const letter = letterIn(worksheet, heading);
      return `${worksheet.name}!$${letter}:$${letter}`;
    };
    const formulaFor = (label) => {
      let found = null;
      dashboard.getColumn(1).eachCell((cell) => {
        if (cell.value === label) found = formulaOf(dashboard.getCell(cell.row, 2));
      });
      assert.ok(found, `no Dashboard line called "${label}"`);
      return found;
    };
    const count = (text, piece) => text.split(piece).length - 1;

    const status = whole(prospects, "Outreach status");
    const followUp = whole(prospects, "Next follow-up");
    const deal = whole(prospects, "Deal value");
    const payment = whole(prospects, "Payment status");
    const checked = whole(prospects, "Checked on my phone");

    const dueToday = formulaFor("Follow-ups due today");
    assert.ok(dueToday.startsWith(`COUNTIFS(${followUp},TODAY(),${status},"<>"&`), dueToday);
    assert.deepEqual(listWords(dueToday, lists), ["Lost", "Do not contact"]);

    const overdue = formulaFor("Follow-ups overdue");
    assert.ok(overdue.startsWith(`COUNTIFS(${followUp},"<"&TODAY(),${status},"<>"&`), overdue);
    assert.deepEqual(listWords(overdue, lists), ["Lost", "Do not contact"]);

    const pipeline = formulaFor("Open pipeline value");
    assert.equal(count(pipeline, `SUMIFS(${deal},${status},`), 3, pipeline);
    assert.deepEqual(listWords(pipeline, lists), ["Replied", "Call booked", "Proposal sent"]);

    const won = formulaFor("Won value");
    assert.ok(won.startsWith(`SUMIFS(${deal},${status},`), won);
    assert.deepEqual(listWords(won, lists), ["Won"]);

    const depositsCount = formulaFor("Deposits outstanding (how many)");
    assert.ok(depositsCount.startsWith(`COUNTIF(${payment},`), depositsCount);
    assert.deepEqual(listWords(depositsCount, lists), ["Deposit requested"]);

    const depositsAmount = formulaFor("Deposits outstanding (amount)");
    assert.ok(depositsAmount.startsWith(`SUMIFS(${deal},${payment},`), depositsAmount);
    assert.deepEqual(listWords(depositsAmount, lists), ["Deposit requested", pricing.depositPercent]);

    const balancesAmount = formulaFor("Balances outstanding (amount)");
    assert.deepEqual(listWords(balancesAmount, lists), ["Balance requested", pricing.depositPercent]);

    const guard = formulaFor("Contacted before a phone check");
    assert.equal(count(guard, `COUNTIFS(${checked},"",${status},`), 7, guard);
    assert.deepEqual(listWords(guard, lists), ["Emailed", "Called", "Visited", "Replied", "Call booked", "Proposal sent", "Won"]);

    assert.equal(formulaFor("New website leads to answer").startsWith(`COUNTIF(${whole(sheet("Leads"), "Status")},`), true);
    assert.deepEqual(listWords(formulaFor("New website leads to answer"), lists), ["New"]);
    assert.equal(formulaFor("Client check-ins due"), `COUNTIF(${whole(sheet("Clients"), "Next check-in")},"<="&TODAY())`);
    assert.ok(formulaFor("On the maintenance plan").startsWith(`COUNTIF(${whole(sheet("Clients"), "Maintenance plan")},`));
    assert.deepEqual(listWords(formulaFor("On the maintenance plan"), lists), ["Yes"]);
    assert.equal(formulaFor("All prospects"), `MAX(0,COUNTA(${whole(prospects, "Restaurant")})-1)`);
  });

  it("counts each outreach status against its own label", () => {
    const dashboard = sheet("Dashboard");
    const lists = sheet("Lists");
    const statusColumn = `Prospects!$${letterIn(sheet("Prospects"), "Outreach status")}:$${letterIn(sheet("Prospects"), "Outreach status")}`;
    const seen = [];
    dashboard.getColumn(1).eachCell((cell) => {
      const label = formulaOf(cell);
      if (!label) return;
      seen.push(...listWords(label, lists));
      assert.equal(formulaOf(dashboard.getCell(cell.row, 2)), `COUNTIF(${statusColumn},$A${cell.row})`);
    });
    assert.deepEqual(seen, OUTREACH_STATUSES);
  });

  it("uses only functions that Excel and Google Sheets share", () => {
    const allowed = new Set(["TODAY", "COUNTIF", "COUNTIFS", "SUMIFS", "COUNTA", "MAX"]);
    for (const line of dashboardRows(pricing)) {
      for (const match of (line.formula || "").matchAll(/([A-Z][A-Z0-9.]*)\(/g)) {
        assert.ok(allowed.has(match[1]), `${match[1]} is not on the list of functions known to work in both`);
      }
    }
  });

  it("holds exactly two example rows that are plainly fictional", () => {
    const prospects = sheet("Prospects");
    const names = [];
    prospects.getColumn(1).eachCell((cell) => {
      if (cell.row > 1 && cell.value) names.push(String(cell.value));
    });
    assert.equal(names.length, 2);
    for (const name of names) assert.match(name, /^EXAMPLE .*fictional, delete this row/);
    const phone = prospects.getCell(`${letterIn(prospects, "Phone")}2`).value;
    assert.match(phone, /555-01\d\d/, "example phone numbers use the range kept for fiction");
    assert.equal(sheet("Leads").actualRowCount, 1, "Leads holds only its header, so the website script starts at row 2");
    assert.equal(sheet("Clients").actualRowCount, 1);
  });
});

describe("loading prospects from a CSV file", () => {
  let dir;
  before(() => {
    dir = tempDir("csv");
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("puts each value in its column with the right type", async () => {
    const rows = sampleProspects(today);
    rows[0].Phone = "+1 785 555 0100";
    rows[0].Notes = "=HYPERLINK(\"https://example.com\")";
    const { rows: typed, missing } = readProspectsCsv(prospectsCsv(rows), pricing);
    assert.equal(typed.length, 13);
    assert.deepEqual(missing, []);

    const workbook = await writeAndReopen(buildWorkbook({ prospects: typed, pricing, today }), path.join(dir, "loaded.xlsx"));
    const prospects = workbook.getWorksheet("Prospects");
    const cell = (heading, row) => prospects.getCell(`${letterIn(prospects, heading)}${row}`).value;

    assert.equal(cell("Restaurant", 2), "Sample Noodle Bar");
    assert.equal(cell("Phone", 2), "+1 785 555 0100", "a phone number stays text, exactly as written");
    assert.equal(cell("Notes", 2), '=HYPERLINK("https://example.com")', "text that looks like a formula stays text");
    assert.equal(typeof cell("Notes", 2), "string");
    assert.equal(cell("Fit (1 to 5)", 2), 4);
    assert.equal(cell("Outreach status", 4), "Emailed");
    assert.ok(cell("Next follow-up", 4) instanceof Date, "dates are real dates");
    assert.equal(cell("Next follow-up", 4).toISOString().slice(0, 10), today.toISOString().slice(0, 10));
    assert.equal(cell("Deal value", 9), 1348);
    assert.equal(cell("Payment status", 10), "Deposit requested");
    assert.equal(cell("Restaurant", 14), "Sample Wine Bar");
    assert.equal(cell("Restaurant", 15), null);
    assert.equal(prospects.getRow(2).height, prospects.getRow(14).height, "loaded rows share one height");
  });

  it("refuses a file with problems and says where they are", () => {
    const rows = sampleProspects(today).slice(0, 3);
    rows[0]["Outreach status"] = "Maybe later";
    rows[1]["Next follow-up"] = "11/20/2026";
    rows[2]["Fit (1 to 5)"] = "9";
    assert.throws(
      () => readProspectsCsv(prospectsCsv(rows), pricing),
      (error) => {
        assert.match(error.message, /Line 2, "Outreach status": "Maybe later" is not one of/);
        assert.match(error.message, /Line 3, "Next follow-up": "11\/20\/2026" is not a date\. Write dates as YYYY-MM-DD/);
        assert.match(error.message, /Line 4, "Fit \(1 to 5\)": "9" is not a whole number from 1 to 5/);
        return true;
      },
    );
    assert.throws(() => readProspectsCsv("Restaurant,Owner cell phone\r\nSample,555\r\n", pricing), /Unknown column heading\(s\): Owner cell phone/);
    assert.throws(() => readProspectsCsv("", pricing), /empty/);
    assert.throws(() => readProspectsCsv("City\r\nAnytown\r\n", pricing), /"Restaurant" column is missing/);
  });

  it("accepts a file with only some of the columns", () => {
    const { rows, missing } = readProspectsCsv("Restaurant,City\r\nSample Cafe,\"Anytown, KS\"\r\n", pricing);
    assert.deepEqual(rows, [{ restaurant: "Sample Cafe", city: "Anytown, KS" }]);
    assert.ok(missing.includes("Outreach status"));
  });

  it("rejects impossible calendar dates", () => {
    const rows = sampleProspects(today).slice(0, 1);
    rows[0]["Last contact"] = "2026-02-30";
    assert.throws(() => readProspectsCsv(prospectsCsv(rows), pricing), /"2026-02-30" is not a date/);
    assert.equal(calendarDate(2026, 11, 12).toISOString(), "2026-11-12T00:00:00.000Z");
  });
});

describe("the command line", () => {
  let dir;
  before(() => {
    dir = tempDir("cli");
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const run = (...args) => spawnSync(process.execPath, [path.join(toolDir, "build-crm.mjs"), ...args], { encoding: "utf8" });

  it("writes the template with --out", async () => {
    const out = path.join(dir, "from-cli.xlsx");
    const result = run("--out", out);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /two fictional example rows/);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(out);
    assert.deepEqual(workbook.worksheets.map((worksheet) => worksheet.name), SHEET_ORDER);
  });

  it("loads --prospects", async () => {
    const csv = path.join(dir, "prospects.csv");
    fs.writeFileSync(csv, prospectsCsv(sampleProspects(today)));
    const out = path.join(dir, "loaded-cli.xlsx");
    const result = run("--prospects", csv, "--out", out);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /13 prospects/);
  });

  it("will not write prospects into a tracked folder of the public repository", () => {
    const csv = path.join(dir, "prospects.csv");
    fs.writeFileSync(csv, prospectsCsv(sampleProspects(today)));
    const tracked = path.join(toolDir, "should-not-exist.xlsx");
    const result = run("--prospects", csv, "--out", tracked);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /public repository/);
    assert.equal(fs.existsSync(tracked), false);
  });

  it("knows which folders are tracked", () => {
    assert.equal(isTrackedLocation(path.join(STUDIO_ROOT, "tools", "crm", "x.xlsx")), true);
    assert.equal(isTrackedLocation(path.join(STUDIO_ROOT, "sales", "x.csv")), true);
    assert.equal(isTrackedLocation(path.join(STUDIO_ROOT, "private", "crm", "x.xlsx")), false);
    assert.equal(isTrackedLocation(path.join(dir, "x.xlsx")), false);
    assert.equal(isTrackedLocation(path.join(STUDIO_ROOT, "private-copy", "x.xlsx")), true, "only the real private folder is exempt");
  });

  it("explains a bad option", () => {
    assert.throws(() => parseArgs(["--prospects"]), /needs a file name/);
    assert.throws(() => parseArgs(["--nope"]), /Unknown option/);
    assert.deepEqual(parseArgs(["--prospects", "a.csv", "--out", "b.xlsx"]), { prospects: "a.csv", out: "b.xlsx", force: false, help: false });
  });
});
