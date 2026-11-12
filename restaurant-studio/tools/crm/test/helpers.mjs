/**
 * Shared test data. Every business in here is made up: the names all start with "Sample",
 * the phone numbers use the 555-01xx range kept for fiction, and the addresses use example.com.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PROSPECT_HEADERS } from "../lib/columns.mjs";
import { stringifyCsv } from "../lib/csv.mjs";

export function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `crm-${label}-`));
}

/** A calendar date as YYYY-MM-DD, `offset` days from the given date. */
export function isoDay(date, offset = 0) {
  const shifted = new Date(date.getTime() + offset * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Thirteen made-up prospects that touch every outreach status, with follow-up dates placed
 * around `today` so the Dashboard has something to count.
 */
export function sampleProspects(today) {
  const day = (offset) => isoDay(today, offset);
  const base = (overrides) => ({
    City: "Anytown, KS",
    Cuisine: "Sample cuisine",
    Phone: "(785) 555-0100",
    Website: "https://example.com",
    "Observed issue": "1. Sample issue [verified-by-search]",
    Evidence: "verified-by-search",
    "Suggested package": "Starter Website",
    "Fit (1 to 5)": "3",
    "Best contact route": "In person",
    "Payment status": "None yet",
    ...overrides,
  });
  return [
    base({ Restaurant: "Sample Noodle Bar", "Outreach status": "Not checked yet", "Fit (1 to 5)": "4" }),
    base({ Restaurant: "Sample Sushi House", "Outreach status": "Checked and ready", "Checked on my phone": day(-2) }),
    base({
      Restaurant: "Sample Taqueria",
      "Outreach status": "Emailed",
      "Checked on my phone": day(-6),
      "Last contact": day(-4),
      "Next follow-up": day(0),
    }),
    base({
      Restaurant: "Sample Diner",
      "Outreach status": "Called",
      "Checked on my phone": day(-9),
      "Last contact": day(-7),
      "Next follow-up": day(-3),
    }),
    // Contacted with no phone check on record: the guard on the Dashboard must count this one.
    base({ Restaurant: "Sample BBQ Shack", "Outreach status": "Visited", "Last contact": day(-1), "Next follow-up": day(3) }),
    base({
      Restaurant: "Sample Pho Kitchen",
      "Outreach status": "Replied",
      "Checked on my phone": day(-8),
      "Next follow-up": day(-1),
      "Deal value": "699",
    }),
    base({ Restaurant: "Sample Curry House", "Outreach status": "Call booked", "Checked on my phone": day(-5), "Deal value": "999" }),
    base({ Restaurant: "Sample Hibachi Grill", "Outreach status": "Proposal sent", "Checked on my phone": day(-5), "Deal value": "1348" }),
    base({
      Restaurant: "Sample Bakery Cafe",
      "Outreach status": "Won",
      "Checked on my phone": day(-20),
      "Deal value": "699",
      "Payment status": "Deposit requested",
    }),
    base({
      Restaurant: "Sample Dumpling Bar",
      "Outreach status": "Won",
      "Checked on my phone": day(-30),
      "Deal value": "999",
      "Payment status": "Balance requested",
    }),
    base({
      Restaurant: "Sample Grill",
      "Outreach status": "Won",
      "Checked on my phone": day(-40),
      "Deal value": "1048",
      "Payment status": "Paid in full",
    }),
    // Closed rows: their dates and values must not be counted as due, overdue or pipeline.
    base({ Restaurant: "Sample Pizza Place", "Outreach status": "Lost", "Checked on my phone": day(-12), "Next follow-up": day(-5), "Deal value": "699" }),
    base({ Restaurant: "Sample Wine Bar", "Outreach status": "Do not contact", "Checked on my phone": day(-12), "Next follow-up": day(0) }),
  ];
}

/** What the Dashboard must show for sampleProspects plus the Leads and Clients rows below. */
export const SAMPLE_EXPECTED = {
  "Follow-ups due today": 1,
  "Follow-ups overdue": 2,
  "New website leads to answer": 2,
  "Client check-ins due": 1,
  "Contacted before a phone check": 1,
  "Not checked yet": 1,
  "Checked and ready": 1,
  Emailed: 1,
  Called: 1,
  Visited: 1,
  Replied: 1,
  "Call booked": 1,
  "Proposal sent": 1,
  Won: 3,
  Lost: 1,
  "Do not contact": 1,
  "All prospects": 13,
  "Open pipeline value": 699 + 999 + 1348,
  "Won value": 699 + 999 + 1048,
  "Deposits outstanding (how many)": 1,
  "Deposits outstanding (amount)": 349.5,
  "Balances outstanding (how many)": 1,
  "Balances outstanding (amount)": 499.5,
  "Signed clients": 2,
  "On the maintenance plan": 1,
};

export function prospectsCsv(rows) {
  return stringifyCsv([PROSPECT_HEADERS, ...rows.map((row) => PROSPECT_HEADERS.map((header) => row[header] ?? ""))]);
}
