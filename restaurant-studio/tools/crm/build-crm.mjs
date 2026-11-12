#!/usr/bin/env node
/**
 * Builds the sales CRM workbook: an .xlsx file made to be uploaded to Google Drive and opened
 * as a Google Sheet (it also opens in Excel).
 *
 *   node build-crm.mjs                              an empty template with two fictional example rows
 *   node build-crm.mjs --prospects <file.csv>       the same workbook with your prospects loaded
 *   node build-crm.mjs --prospects <csv> --out <file.xlsx>
 *
 * With no --out the file goes to restaurant-studio/private/crm/, which git ignores. A workbook
 * with prospects in it is never written into a tracked folder of this public repository.
 *
 * Tabs: Dashboard (formulas only), Prospects, Leads (the website inbox writes here), Clients,
 * Lists (the dropdown values). The columns are defined once, in lib/columns.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import {
  CLIENT_COLUMNS,
  CLOSED_STATUSES,
  CONTACTED_STATUSES,
  CONTACT_ROUTES,
  DOMAIN_ACCOUNTS,
  EVIDENCE,
  HOSTING_CHOICES,
  LEAD_COLUMNS,
  LEAD_STATUSES,
  OUTREACH_STATUSES,
  PAYMENT_STATUSES,
  PIPELINE_STATUSES,
  PROSPECT_COLUMNS,
  SHEETS,
  YES_NO,
  columnLetter,
  letterOf,
} from "./lib/columns.mjs";
import { STUDIO_ROOT, isTrackedLocation, loadConfig, packageOptions } from "./lib/config.mjs";
import { parseCsv, unguardCell } from "./lib/csv.mjs";

/** Rows that get dropdowns, date pickers and highlighting before anything is typed in them. */
export const PROSPECT_ROWS = 500;
export const CLIENT_ROWS = 200;
export const LEAD_ROWS = 1000;

const FONT = "Arial";
const DATE_FORMAT = "mmm d, yyyy";
const MONEY_FORMAT = '"$"#,##0';
const MONEY_FORMAT_CENTS = '"$"#,##0.00';
const DATA_ROW_HEIGHT = 60;

const COLORS = {
  headerFill: "FF263238",
  headerText: "FFFFFFFF",
  sectionFill: "FFE3E8EC",
  mutedText: "FF5F6B73",
  greyText: "FF8A8A8A",
  greyFill: "FFF1F1F1",
  dueFill: "FFFFE08A",
  overdueFill: "FFF4B6A6",
  overdueText: "FF8A1C00",
  newFill: "FFFFF2CC",
};

/* --------------------------------------------------------------------------------------------
 * Dates
 * ------------------------------------------------------------------------------------------ */

/** A calendar date as a spreadsheet stores it: midnight UTC. */
export function calendarDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Today's date on this computer, as a calendar date. */
export function localToday(now = new Date()) {
  return calendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function parseIsoDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = calendarDate(year, month, day);
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? date : null;
}

/* --------------------------------------------------------------------------------------------
 * The dropdown lists and settings on the Lists tab
 * ------------------------------------------------------------------------------------------ */

/** Every dropdown list, in the order of its column on the Lists tab. */
export function listDefinitions(pricing) {
  const { starter, premium } = pricing.packages;
  return [
    { id: "outreach", header: "Outreach status", values: OUTREACH_STATUSES },
    { id: "payment", header: "Payment status", values: PAYMENT_STATUSES },
    { id: "evidence", header: "Evidence", values: EVIDENCE },
    { id: "routes", header: "Best contact route", values: CONTACT_ROUTES },
    { id: "packages", header: "Suggested package", values: packageOptions(pricing).map((option) => option.label) },
    { id: "leadStatus", header: "Lead status", values: LEAD_STATUSES },
    { id: "yesNo", header: "Yes or no", values: YES_NO },
    { id: "clientPackages", header: "Package", values: [starter.name, premium.name] },
    { id: "addons", header: "Add-ons", values: ["None", pricing.addons.catering.name] },
    { id: "domainAccounts", header: "Domain account", values: DOMAIN_ACCOUNTS },
    { id: "hosting", header: "Hosting", values: HOSTING_CHOICES },
  ];
}

/** Numbers the Dashboard reads, plus the price list for reference. Copied from pricing.json. */
export function settingRows(pricing) {
  return [
    { id: "depositPercent", label: "Deposit percent", value: pricing.depositPercent },
    { id: "starterPrice", label: pricing.packages.starter.name, value: pricing.packages.starter.price },
    { id: "premiumPrice", label: pricing.packages.premium.name, value: pricing.packages.premium.price },
    { id: "cateringPrice", label: `${pricing.addons.catering.name} (add-on)`, value: pricing.addons.catering.price },
    { id: "maintenancePrice", label: `${pricing.maintenance.name} (per month)`, value: pricing.maintenance.pricePerMonth },
    { id: "hourlyRate", label: "Hourly rate for work outside the package", value: pricing.hourlyRate },
    { id: "revisionRounds", label: "Revision rounds included", value: pricing.packages.starter.revisionRounds },
  ];
}

/** Where things sit on the Lists tab, so formulas and dropdowns can point at them. */
function listsLayout(pricing) {
  const lists = listDefinitions(pricing);
  const settings = settingRows(pricing);
  const settingsLabelColumn = lists.length + 2; // one empty column between the lists and the settings
  const settingsValueColumn = settingsLabelColumn + 1;
  const sheet = SHEETS.lists;

  const columnOf = (id) => {
    const index = lists.findIndex((list) => list.id === id);
    if (index === -1) throw new Error(`No dropdown list called "${id}".`);
    return index + 1;
  };

  return {
    lists,
    settings,
    settingsLabelColumn,
    settingsValueColumn,
    /** The range a dropdown reads, for example Lists!$A$2:$A$12 */
    range(id) {
      const letter = columnLetter(columnOf(id));
      const count = lists[columnOf(id) - 1].values.length;
      return `${sheet}!$${letter}$2:$${letter}$${count + 1}`;
    },
    /** The cell that holds one value of a list, for example Lists!$A$10 for "Won" */
    cell(id, value) {
      const column = columnOf(id);
      const index = lists[column - 1].values.indexOf(value);
      if (index === -1) throw new Error(`"${value}" is not in the "${id}" list.`);
      return `${sheet}!$${columnLetter(column)}$${index + 2}`;
    },
    /** The cell that holds a setting, for example Lists!$N$2 for the deposit percent */
    setting(id) {
      const index = settings.findIndex((setting) => setting.id === id);
      if (index === -1) throw new Error(`No setting called "${id}".`);
      return `${sheet}!$${columnLetter(settingsValueColumn)}$${index + 2}`;
    },
  };
}

/* --------------------------------------------------------------------------------------------
 * The Dashboard
 * ------------------------------------------------------------------------------------------ */

/**
 * Every line of the Dashboard, top to bottom. Exported so the tests can check each formula
 * against the workbook that was actually written.
 *
 * kind: "title" | "today" | "section" | "blank" | "metric" | "status"
 */
export function dashboardRows(pricing) {
  const lists = listsLayout(pricing);
  const whole = (sheet, columns, key) => {
    const letter = letterOf(columns, key);
    return `${sheet}!$${letter}:$${letter}`;
  };
  const P = (key) => whole(SHEETS.prospects, PROSPECT_COLUMNS, key);
  const C = (key) => whole(SHEETS.clients, CLIENT_COLUMNS, key);
  const L = (key) => whole(SHEETS.leads, LEAD_COLUMNS, key);

  const status = (value) => lists.cell("outreach", value);
  const payment = (value) => lists.cell("payment", value);
  const notClosed = CLOSED_STATUSES.map((value) => `${P("status")},"<>"&${status(value)}`).join(",");
  const deposit = lists.setting("depositPercent");
  const depositPercent = pricing.depositPercent;

  const rows = [
    { kind: "title", label: "Sales dashboard" },
    {
      kind: "today",
      id: "today",
      label: "Today",
      formula: "TODAY()",
      format: DATE_FORMAT,
      note: "Every number on this tab is a formula. Change the other tabs, not this one.",
    },
    { kind: "blank" },

    { kind: "section", label: "Do today" },
    {
      kind: "metric",
      id: "dueToday",
      label: "Follow-ups due today",
      formula: `COUNTIFS(${P("nextFollowUp")},TODAY(),${notClosed})`,
      alert: "due",
      note: "Prospects whose Next follow-up is today. Lost and Do not contact are left out.",
    },
    {
      kind: "metric",
      id: "overdue",
      label: "Follow-ups overdue",
      formula: `COUNTIFS(${P("nextFollowUp")},"<"&TODAY(),${notClosed})`,
      alert: "overdue",
      note: "Next follow-up is in the past. Do these first, or clear the date if you have decided to stop.",
    },
    {
      kind: "metric",
      id: "newLeads",
      label: "New website leads to answer",
      formula: `COUNTIF(${L("status")},${lists.cell("leadStatus", LEAD_STATUSES[0])})`,
      alert: "due",
      note: "Rows on the Leads tab still marked New. Reply within one business day.",
    },
    {
      kind: "metric",
      id: "checkInsDue",
      label: "Client check-ins due",
      formula: `COUNTIF(${C("nextCheckIn")},"<="&TODAY())`,
      alert: "due",
      note: "Rows on the Clients tab with Next check-in today or earlier.",
    },
    {
      kind: "metric",
      id: "contactedUnchecked",
      label: "Contacted before a phone check",
      formula: CONTACTED_STATUSES.map((value) => `COUNTIFS(${P("checkedOn")},"",${P("status")},${status(value)})`).join("+"),
      alert: "overdue",
      note: "Should always be 0. These rows say you made contact, but Checked on my phone is empty. Look at the site yourself first.",
    },
    { kind: "blank" },

    { kind: "section", label: "Prospects by outreach status" },
    ...OUTREACH_STATUSES.map((value) => ({
      kind: "status",
      id: `status:${value}`,
      labelFormula: status(value),
      // The label cell (column A of the same row) is filled in when the row is placed.
      formulaForRow: (row) => `COUNTIF(${P("status")},$A${row})`,
    })),
    {
      kind: "metric",
      id: "allProspects",
      label: "All prospects",
      formula: `MAX(0,COUNTA(${P("restaurant")})-1)`,
      note: "Every row on the Prospects tab that has a restaurant name.",
    },
    { kind: "blank" },

    { kind: "section", label: "Money" },
    {
      kind: "metric",
      id: "openPipeline",
      label: "Open pipeline value",
      formula: PIPELINE_STATUSES.map((value) => `SUMIFS(${P("dealValue")},${P("status")},${status(value)})`).join("+"),
      format: MONEY_FORMAT_CENTS,
      note: `Deal value of prospects at ${PIPELINE_STATUSES.join(", ")}. A price next to a restaurant you have not spoken with is not pipeline.`,
    },
    {
      kind: "metric",
      id: "wonValue",
      label: "Won value",
      formula: `SUMIFS(${P("dealValue")},${P("status")},${status("Won")})`,
      format: MONEY_FORMAT_CENTS,
      note: "Deal value of prospects at Won.",
    },
    {
      kind: "metric",
      id: "depositsCount",
      label: "Deposits outstanding (how many)",
      formula: `COUNTIF(${P("paymentStatus")},${payment("Deposit requested")})`,
      note: "Prospects whose Payment status is Deposit requested.",
    },
    {
      kind: "metric",
      id: "depositsAmount",
      label: "Deposits outstanding (amount)",
      formula: `SUMIFS(${P("dealValue")},${P("paymentStatus")},${payment("Deposit requested")})*${deposit}/100`,
      format: MONEY_FORMAT_CENTS,
      note: `${depositPercent}% of the deal value on those rows. The percentage is on the Lists tab.`,
    },
    {
      kind: "metric",
      id: "balancesCount",
      label: "Balances outstanding (how many)",
      formula: `COUNTIF(${P("paymentStatus")},${payment("Balance requested")})`,
      note: "Prospects whose Payment status is Balance requested.",
    },
    {
      kind: "metric",
      id: "balancesAmount",
      label: "Balances outstanding (amount)",
      formula: `SUMIFS(${P("dealValue")},${P("paymentStatus")},${payment("Balance requested")})*(100-${deposit})/100`,
      format: MONEY_FORMAT_CENTS,
      note: `The remaining ${100 - depositPercent}% of the deal value on those rows.`,
    },
    { kind: "blank" },

    { kind: "section", label: "Clients" },
    {
      kind: "metric",
      id: "clients",
      label: "Signed clients",
      formula: `MAX(0,COUNTA(${C("restaurant")})-1)`,
      note: "Rows on the Clients tab.",
    },
    {
      kind: "metric",
      id: "maintenance",
      label: "On the maintenance plan",
      formula: `COUNTIF(${C("maintenancePlan")},${lists.cell("yesNo", "Yes")})`,
      note: "Clients with Yes under Maintenance plan.",
    },
  ];

  // Give every line its row number and its final formula.
  return rows.map((row, index) => {
    const number = index + 1;
    const formula = row.formulaForRow ? row.formulaForRow(number) : row.formula;
    const { formulaForRow, ...rest } = row;
    return { ...rest, row: number, formula };
  });
}

function solidFill(argb) {
  return { type: "pattern", pattern: "solid", fgColor: { argb }, bgColor: { argb } };
}

function buildDashboard(workbook, pricing) {
  const sheet = workbook.addWorksheet(SHEETS.dashboard, {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: "FF263238" } },
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });
  sheet.columns = [{ width: 36 }, { width: 14 }, { width: 64 }];

  const rows = dashboardRows(pricing);
  for (const line of rows) {
    const label = sheet.getCell(line.row, 1);
    const value = sheet.getCell(line.row, 2);
    const note = sheet.getCell(line.row, 3);
    label.font = { name: FONT, size: 10 };
    value.font = { name: FONT, size: 11, bold: true };
    value.alignment = { horizontal: "right", vertical: "top" };
    label.alignment = { vertical: "top", wrapText: true };
    note.font = { name: FONT, size: 9, color: { argb: COLORS.mutedText } };
    note.alignment = { vertical: "top", wrapText: true, indent: 1 };

    if (line.kind === "title") {
      label.value = line.label;
      label.font = { name: FONT, size: 14, bold: true };
      continue;
    }
    if (line.kind === "blank") continue;
    if (line.kind === "section") {
      label.value = line.label;
      label.font = { name: FONT, size: 10, bold: true };
      for (const cell of [label, value, note]) cell.fill = solidFill(COLORS.sectionFill);
      continue;
    }

    if (line.labelFormula) label.value = { formula: line.labelFormula };
    else label.value = line.label;
    value.value = { formula: line.formula };
    value.numFmt = line.format || "0";
    if (line.note) note.value = line.note;
  }

  // A count that needs attention is filled in, so it stands out without reading the number.
  let priority = 1;
  for (const line of rows) {
    if (!line.alert) continue;
    const overdue = line.alert === "overdue";
    sheet.addConditionalFormatting({
      ref: `B${line.row}`,
      rules: [
        {
          type: "cellIs",
          operator: "greaterThan",
          formulae: [0],
          priority: priority++,
          style: {
            font: { bold: true, color: { argb: overdue ? COLORS.overdueText : "FF000000" } },
            fill: solidFill(overdue ? COLORS.overdueFill : COLORS.dueFill),
          },
        },
      ],
    });
  }
  return sheet;
}

/* --------------------------------------------------------------------------------------------
 * The data tabs
 * ------------------------------------------------------------------------------------------ */

function headerStyle(cell) {
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLORS.headerText } };
  cell.fill = solidFill(COLORS.headerFill);
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

function bodyStyle(column) {
  const style = {
    font: { name: FONT, size: 10 },
    alignment: { vertical: "top", wrapText: true },
  };
  if (column.type === "date") {
    style.numFmt = DATE_FORMAT;
    style.alignment = { vertical: "top", horizontal: "left" };
  } else if (column.type === "money") {
    style.numFmt = MONEY_FORMAT;
    style.alignment = { vertical: "top", horizontal: "right", indent: 1 };
  } else if (column.type === "int") {
    style.numFmt = "0";
    style.alignment = { vertical: "top", horizontal: "center" };
  } else {
    // Text columns: a phone number or a ZIP code must never be turned into a number.
    style.numFmt = "@";
  }
  return style;
}

function validationFor(column, lists) {
  if (column.list) {
    return {
      type: "list",
      allowBlank: true,
      formulae: [lists.range(column.list)],
      showErrorMessage: true,
      errorStyle: column.strict ? "stop" : "warning",
      errorTitle: "Pick from the list",
      error: column.strict
        ? "Choose one of the values in the dropdown. The Dashboard counts these exact words."
        : "This is not one of the usual values. Choose one from the dropdown if you can.",
    };
  }
  if (column.type === "date") {
    return {
      type: "date",
      operator: "greaterThan",
      allowBlank: true,
      formulae: [calendarDate(2020, 1, 1)],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Enter a date",
      error: "Enter a date, for example 11/20/2026. Text is not counted by the Dashboard.",
    };
  }
  if (column.type === "int") {
    return {
      type: "whole",
      operator: "between",
      allowBlank: true,
      formulae: [column.min, column.max],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Enter a whole number",
      error: `Enter a whole number from ${column.min} to ${column.max}.`,
    };
  }
  if (column.type === "money") {
    return {
      type: "decimal",
      operator: "greaterThanOrEqual",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Enter an amount",
      error: "Enter the amount in dollars as a number, for example 699.",
    };
  }
  return null;
}

/**
 * Creates a data tab: header row, widths, wrapped text, frozen header, filter and dropdowns.
 * `styledRows` empty rows are given their formatting up front, so a row typed in later (in
 * Google Sheets on a phone, for example) looks and behaves like the ones above it.
 */
function buildDataSheet(workbook, name, columns, lists, options) {
  const { validatedRows, styledRows = 0, tabColor, freezeFirstColumn = true, filter = true } = options;
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1, xSplit: freezeFirstColumn ? 1 : 0 }],
    properties: { tabColor: { argb: tabColor } },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width, style: bodyStyle(column) }));

  const header = sheet.getRow(1);
  header.height = 32;
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.header;
    cell.numFmt = "@";
    headerStyle(cell);
    if (column.note) cell.note = column.note;
  });

  const lastRow = validatedRows + 1;
  const lastLetter = columnLetter(columns.length);

  for (let row = 2; row <= styledRows + 1; row++) {
    columns.forEach((column, index) => {
      sheet.getCell(row, index + 1).style = bodyStyle(column);
    });
  }

  columns.forEach((column, index) => {
    const validation = validationFor(column, lists);
    if (!validation) return;
    const letter = columnLetter(index + 1);
    sheet.dataValidations.add(`${letter}2:${letter}${lastRow}`, validation);
  });

  if (filter) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: lastRow, column: columns.length } };

  return { sheet, lastRow, lastLetter };
}

function writeRows(sheet, columns, rows) {
  rows.forEach((values, index) => {
    const row = sheet.getRow(index + 2);
    row.height = DATA_ROW_HEIGHT;
    columns.forEach((column, columnIndex) => {
      const value = values[column.key];
      const cell = row.getCell(columnIndex + 1);
      cell.style = bodyStyle(column);
      if (value === undefined || value === null || value === "") return;
      cell.value = value;
    });
  });
}

function buildProspects(workbook, pricing, rows) {
  const lists = listsLayout(pricing);
  const { sheet, lastRow, lastLetter } = buildDataSheet(workbook, SHEETS.prospects, PROSPECT_COLUMNS, lists, {
    validatedRows: PROSPECT_ROWS,
    styledRows: PROSPECT_ROWS,
    tabColor: "FF2E7D32",
  });
  writeRows(sheet, PROSPECT_COLUMNS, rows);

  const status = `$${letterOf(PROSPECT_COLUMNS, "status")}2`;
  const followUpLetter = letterOf(PROSPECT_COLUMNS, "nextFollowUp");
  const followUp = `$${followUpLetter}2`;
  const closed = `OR(${CLOSED_STATUSES.map((value) => `${status}="${value}"`).join(",")})`;
  const open = CLOSED_STATUSES.map((value) => `${status}<>"${value}"`).join(",");

  // Lost and Do not contact: the whole row goes grey.
  sheet.addConditionalFormatting({
    ref: `A2:${lastLetter}${lastRow}`,
    rules: [
      {
        type: "expression",
        formulae: [closed],
        priority: 1,
        style: { font: { color: { argb: COLORS.greyText } }, fill: solidFill(COLORS.greyFill) },
      },
    ],
  });

  // A follow-up that is overdue (red) or due today (amber). The restaurant name in the frozen
  // first column is highlighted too, so it shows on a phone without scrolling sideways.
  const overdue = {
    type: "expression",
    formulae: [`AND(${followUp}<>"",${followUp}<TODAY(),${open})`],
    style: { font: { bold: true, color: { argb: COLORS.overdueText } }, fill: solidFill(COLORS.overdueFill) },
  };
  const dueToday = {
    type: "expression",
    formulae: [`AND(${followUp}<>"",${followUp}=TODAY(),${open})`],
    style: { font: { bold: true }, fill: solidFill(COLORS.dueFill) },
  };
  let priority = 2;
  for (const ref of [`${followUpLetter}2:${followUpLetter}${lastRow}`, `A2:A${lastRow}`]) {
    sheet.addConditionalFormatting({
      ref,
      rules: [
        { ...overdue, priority: priority++ },
        { ...dueToday, priority: priority++ },
      ],
    });
  }
  return sheet;
}

function buildLeads(workbook, pricing) {
  const lists = listsLayout(pricing);
  // No pre-formatted empty rows here: the website inbox script adds each row itself and sets
  // its format. Only the header, the widths and the dropdowns are prepared.
  const { sheet, lastRow } = buildDataSheet(workbook, SHEETS.leads, LEAD_COLUMNS, lists, {
    validatedRows: LEAD_ROWS,
    styledRows: 0,
    tabColor: "FFF9A825",
    freezeFirstColumn: false,
  });

  const statusLetter = letterOf(LEAD_COLUMNS, "status");
  sheet.addConditionalFormatting({
    ref: `A2:${statusLetter}${lastRow}`,
    rules: [
      {
        type: "expression",
        formulae: [`$${statusLetter}2="${LEAD_STATUSES[0]}"`],
        priority: 1,
        style: { font: { bold: true }, fill: solidFill(COLORS.newFill) },
      },
    ],
  });
  return sheet;
}

function buildClients(workbook, pricing) {
  const lists = listsLayout(pricing);
  const { sheet, lastRow } = buildDataSheet(workbook, SHEETS.clients, CLIENT_COLUMNS, lists, {
    validatedRows: CLIENT_ROWS,
    styledRows: CLIENT_ROWS,
    tabColor: "FF6A1B9A",
  });

  const checkInLetter = letterOf(CLIENT_COLUMNS, "nextCheckIn");
  const checkIn = `$${checkInLetter}2`;
  const roundsLetter = letterOf(CLIENT_COLUMNS, "revisionRounds");
  const included = pricing.packages.starter.revisionRounds;

  let priority = 1;
  for (const ref of [`${checkInLetter}2:${checkInLetter}${lastRow}`, `A2:A${lastRow}`]) {
    sheet.addConditionalFormatting({
      ref,
      rules: [
        {
          type: "expression",
          formulae: [`AND(${checkIn}<>"",${checkIn}<=TODAY())`],
          priority: priority++,
          style: { font: { bold: true }, fill: solidFill(COLORS.dueFill) },
        },
      ],
    });
  }
  // More revision rounds than the package includes: extra rounds are billed at the hourly rate.
  sheet.addConditionalFormatting({
    ref: `${roundsLetter}2:${roundsLetter}${lastRow}`,
    rules: [
      {
        type: "expression",
        formulae: [`AND(ISNUMBER($${roundsLetter}2),$${roundsLetter}2>${included})`],
        priority: priority++,
        style: { font: { bold: true }, fill: solidFill(COLORS.dueFill) },
      },
    ],
  });
  return sheet;
}

function buildLists(workbook, pricing) {
  const layout = listsLayout(pricing);
  const sheet = workbook.addWorksheet(SHEETS.lists, {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { tabColor: { argb: "FF9E9E9E" } },
  });

  layout.lists.forEach((list, index) => {
    const column = index + 1;
    sheet.getColumn(column).width = Math.max(18, ...list.values.map((value) => value.length + 2), list.header.length + 2);
    const header = sheet.getCell(1, column);
    header.value = list.header;
    headerStyle(header);
    list.values.forEach((value, valueIndex) => {
      const cell = sheet.getCell(valueIndex + 2, column);
      cell.value = value;
      cell.numFmt = "@";
      cell.font = { name: FONT, size: 10 };
    });
  });

  sheet.getColumn(layout.settingsLabelColumn - 1).width = 3;
  sheet.getColumn(layout.settingsLabelColumn).width = 44;
  sheet.getColumn(layout.settingsValueColumn).width = 12;
  const labelHeader = sheet.getCell(1, layout.settingsLabelColumn);
  const valueHeader = sheet.getCell(1, layout.settingsValueColumn);
  labelHeader.value = "Settings and price list";
  valueHeader.value = "Value";
  headerStyle(labelHeader);
  headerStyle(valueHeader);
  layout.settings.forEach((setting, index) => {
    const label = sheet.getCell(index + 2, layout.settingsLabelColumn);
    const value = sheet.getCell(index + 2, layout.settingsValueColumn);
    label.value = setting.label;
    label.font = { name: FONT, size: 10 };
    value.value = setting.value;
    value.font = { name: FONT, size: 10 };
  });

  const notes = [
    "Copied from config/pricing.json when this workbook was built.",
    "The Dashboard reads the deposit percent, and the dropdowns on the other tabs read the lists on the left.",
    "Do not reword a status after you have started using it: rows that carry the old word are no longer counted.",
  ];
  notes.forEach((text, index) => {
    const cell = sheet.getCell(layout.settings.length + 3 + index, layout.settingsLabelColumn);
    cell.value = text;
    // Not wrapped: these rows also hold list values, and a wrapped note would make them tall.
    cell.font = { name: FONT, size: 9, italic: true, color: { argb: COLORS.mutedText } };
    cell.alignment = { wrapText: false, vertical: "top" };
  });
  return sheet;
}

/* --------------------------------------------------------------------------------------------
 * Prospect rows: from a CSV file, or the two fictional examples
 * ------------------------------------------------------------------------------------------ */

/**
 * Reads a prospects CSV (the layout of prospects-template.csv) into typed rows.
 * Every problem is collected and reported together, with its line number.
 */
export function readProspectsCsv(text, pricing) {
  const table = parseCsv(text);
  if (table.length === 0) throw new Error("The prospects file is empty. It needs the header row from prospects-template.csv.");

  const headers = table[0].map((header) => header.trim());
  const known = new Map(PROSPECT_COLUMNS.map((column) => [column.header, column]));
  const problems = [];

  const unknown = headers.filter((header) => !known.has(header));
  if (unknown.length > 0) problems.push(`Unknown column heading(s): ${unknown.join(", ")}. Use the headings in prospects-template.csv.`);
  const repeated = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (repeated.length > 0) problems.push(`Column heading used twice: ${[...new Set(repeated)].join(", ")}.`);
  if (!headers.includes("Restaurant")) problems.push('The "Restaurant" column is missing.');
  if (problems.length > 0) throw new Error(problems.join("\n"));

  const missing = PROSPECT_COLUMNS.filter((column) => !headers.includes(column.header)).map((column) => column.header);
  const lists = Object.fromEntries(listDefinitions(pricing).map((list) => [list.id, list.values]));
  const rows = [];

  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    if (cells.every((cell) => cell.trim() === "")) return;
    if (cells.length > headers.length) problems.push(`Line ${line}: ${cells.length} cells, but the header has ${headers.length}.`);

    const row = {};
    headers.forEach((header, position) => {
      const column = known.get(header);
      const raw = unguardCell(cells[position] ?? "").trim();
      if (raw === "") return;

      if (column.type === "date") {
        const date = parseIsoDate(raw);
        if (!date) problems.push(`Line ${line}, "${header}": "${raw}" is not a date. Write dates as YYYY-MM-DD, for example 2026-11-20.`);
        else row[column.key] = date;
      } else if (column.type === "int") {
        const number = Number(raw);
        const fits = Number.isInteger(number) && number >= column.min && number <= column.max;
        if (!fits) problems.push(`Line ${line}, "${header}": "${raw}" is not a whole number from ${column.min} to ${column.max}.`);
        else row[column.key] = number;
      } else if (column.type === "money") {
        const number = Number(raw.replace(/[$,\s]/g, ""));
        if (!Number.isFinite(number) || number < 0) problems.push(`Line ${line}, "${header}": "${raw}" is not an amount in dollars.`);
        else row[column.key] = number;
      } else if (column.list && column.strict && !lists[column.list].includes(raw)) {
        problems.push(`Line ${line}, "${header}": "${raw}" is not one of: ${lists[column.list].join(", ")}.`);
      } else {
        row[column.key] = raw;
      }
    });

    if (!row.restaurant) problems.push(`Line ${line}: the Restaurant cell is empty.`);
    rows.push(row);
  });

  if (problems.length > 0) throw new Error(problems.join("\n"));
  if (rows.length > PROSPECT_ROWS) {
    throw new Error(`The file has ${rows.length} prospects. The workbook is prepared for ${PROSPECT_ROWS}. Raise PROSPECT_ROWS in build-crm.mjs.`);
  }
  return { rows, missing };
}

/** Two rows that are plainly made up, so the template shows how the tabs work together. */
export function exampleProspects(today, pricing) {
  const [starter, premium] = packageOptions(pricing);
  return [
    {
      restaurant: "EXAMPLE Noodle House (fictional, delete this row)",
      city: "Anytown, KS",
      cuisine: "Ramen and rice bowls",
      phone: "(785) 555-0142",
      publicEmail: "hello@example.com",
      website: "https://example.com",
      otherListings: "https://example.org/listing",
      observedIssue: "1. The menu is a PDF that needs zooming on a phone [verified-by-search]",
      evidence: EVIDENCE[0],
      checkedOn: addDays(today, -6),
      confirmed: "Opened the menu on my phone: a three-page PDF, hard to read. Hours on the site match the door.",
      package: premium.label,
      fit: 4,
      route: CONTACT_ROUTES[0],
      status: "Proposal sent",
      lastContact: addDays(today, -4),
      response: "Liked the sample. Asked for a written proposal.",
      nextFollowUp: today,
      dealValue: premium.price,
      paymentStatus: PAYMENT_STATUSES[0],
      notes: "Example only. Shows a follow-up that is due today.",
    },
    {
      restaurant: "EXAMPLE Taqueria (fictional, delete this row)",
      city: "Anytown, NY",
      cuisine: "Tacos and burritos",
      phone: "(607) 555-0117",
      website: "",
      otherListings: "https://example.org/another-listing",
      observedIssue: "1. No website of its own found [needs-visual-check]",
      evidence: EVIDENCE[1],
      checkedOn: addDays(today, -12),
      confirmed: "Searched the name and city on my phone and on the map app. No website button and no site of their own.",
      package: starter.label,
      fit: 5,
      route: CONTACT_ROUTES[0],
      status: "Won",
      lastContact: addDays(today, -1),
      response: "Signed the agreement.",
      dealValue: starter.price,
      paymentStatus: "Deposit requested",
      notes: "Example only. Shows a won deal with the deposit still to come.",
    },
  ];
}

/* --------------------------------------------------------------------------------------------
 * The workbook
 * ------------------------------------------------------------------------------------------ */

/**
 * Builds the workbook in memory.
 *   prospects  typed rows from readProspectsCsv, or null for the two fictional examples
 *   pricing    the contents of config/pricing.json
 *   today      a calendar date (see localToday); only the example rows use it
 */
export function buildWorkbook({ prospects = null, pricing, today = localToday() }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "restaurant-studio/tools/crm";
  workbook.created = new Date();
  workbook.modified = new Date();
  // Formulas are stored without results, so the spreadsheet program must work them out on open.
  workbook.calcProperties.fullCalcOnLoad = true;

  const rows = prospects === null ? exampleProspects(today, pricing) : prospects;

  buildDashboard(workbook, pricing);
  buildProspects(workbook, pricing, rows);
  buildLeads(workbook, pricing);
  buildClients(workbook, pricing);
  buildLists(workbook, pricing);
  return workbook;
}

/* --------------------------------------------------------------------------------------------
 * Command line
 * ------------------------------------------------------------------------------------------ */

const HELP = `Builds the sales CRM workbook (.xlsx, made for Google Sheets).

  node build-crm.mjs                             empty template with two fictional example rows
  node build-crm.mjs --prospects <file.csv>      the workbook with your prospects loaded
  node build-crm.mjs --prospects <csv> --out <file.xlsx>

Options
  --prospects <csv>  rows for the Prospects tab, in the layout of prospects-template.csv
  --out <file>       where to write the workbook (default: restaurant-studio/private/crm/)
  --force            allow a workbook with prospects to be written inside the repository
                     but outside private/ (not recommended: this repository is public)
  --help             show this text
`;

export function parseArgs(argv) {
  const options = { prospects: null, out: null, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--prospects" || arg === "--out") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a file name after it.`);
      options[arg.slice(2)] = value;
    } else throw new Error(`Unknown option: ${arg}\n\n${HELP}`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

  const { pricing } = loadConfig();
  const privateCrm = path.join(STUDIO_ROOT, "private", "crm");
  const out = path.resolve(options.out || path.join(privateCrm, options.prospects ? "sidework-crm.xlsx" : "crm-template.xlsx"));

  let prospects = null;
  if (options.prospects) {
    const file = path.resolve(options.prospects);
    if (!fs.existsSync(file)) throw new Error(`Cannot find the prospects file: ${file}`);
    const result = readProspectsCsv(fs.readFileSync(file, "utf8"), pricing);
    prospects = result.rows;
    if (result.missing.length > 0) console.warn(`Note: these columns are not in the file and were left empty: ${result.missing.join(", ")}`);
    if (isTrackedLocation(out) && !options.force) {
      throw new Error(
        `Not written: ${out}\nThis workbook would hold real prospect details, and that folder is part of a public repository.\n` +
          `Leave --out off to write it under restaurant-studio/private/crm/ (which git ignores), or choose a folder outside the repository.`,
      );
    }
  }

  const workbook = buildWorkbook({ prospects, pricing });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await workbook.xlsx.writeFile(out);

  const count = prospects === null ? "two fictional example rows" : `${prospects.length} prospect${prospects.length === 1 ? "" : "s"}`;
  console.log(`Wrote ${out}`);
  console.log(`Prospects tab: ${count}.`);
  console.log("Next: upload the file to Google Drive, open it, then File > Save as Google Sheets. See README.md.");
}

const runDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (runDirectly) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
