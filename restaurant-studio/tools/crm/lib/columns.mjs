/**
 * The shape of the CRM workbook: tab names, columns and dropdown values.
 *
 * This file is the one place they are defined. build-crm.mjs builds the workbook from it,
 * make-prospect-package.mjs writes prospects.csv from it, and the tests check both against it.
 *
 * Column types:
 *   text    plain text (the default)
 *   date    a real spreadsheet date. In a CSV file write it as YYYY-MM-DD.
 *   int     a whole number
 *   money   dollars
 * A column with `list` gets a dropdown that reads its choices from the Lists tab.
 */

export const SHEETS = {
  dashboard: "Dashboard",
  prospects: "Prospects",
  leads: "Leads",
  clients: "Clients",
  lists: "Lists",
};

/** Tab order in the workbook. */
export const SHEET_ORDER = [SHEETS.dashboard, SHEETS.prospects, SHEETS.leads, SHEETS.clients, SHEETS.lists];

export const OUTREACH_STATUSES = [
  "Not checked yet",
  "Checked and ready",
  "Emailed",
  "Called",
  "Visited",
  "Replied",
  "Call booked",
  "Proposal sent",
  "Won",
  "Lost",
  "Do not contact",
];

export const PAYMENT_STATUSES = [
  "None yet",
  "Deposit requested",
  "Deposit paid",
  "Balance requested",
  "Paid in full",
  "Refunded",
];

/** How the research found something. Neither value means that anyone looked at the site. */
export const EVIDENCE = ["verified-by-search", "needs-visual-check"];

export const CONTACT_ROUTES = ["In person", "Phone", "Business email", "Contact form on their site"];

/**
 * The Status values the website inbox script writes on the Leads tab
 * (automation/google-sheets-inbox/Code.gs, CONFIG.STATUSES). New rows arrive as the first one.
 */
export const LEAD_STATUSES = ["New", "Contacted", "Quoted", "Booked", "Declined"];

export const YES_NO = ["Yes", "No"];

export const DOMAIN_ACCOUNTS = ["Client's own account", "Not confirmed yet", "Someone else (sort this out)"];

export const HOSTING_CHOICES = ["Studio account (maintenance plan)", "Client's own account", "Not decided yet"];

/** Statuses that mean a real conversation is under way. Open pipeline counts only these. */
export const PIPELINE_STATUSES = ["Replied", "Call booked", "Proposal sent"];

/** Statuses that mean the restaurant has been contacted. Used by the phone-check guard. */
export const CONTACTED_STATUSES = ["Emailed", "Called", "Visited", "Replied", "Call booked", "Proposal sent", "Won"];

/** Rows in these statuses are greyed out and never count as a follow-up that is due. */
export const CLOSED_STATUSES = ["Lost", "Do not contact"];

export const PROSPECT_COLUMNS = [
  { key: "restaurant", header: "Restaurant", width: 24 },
  { key: "city", header: "City", width: 13 },
  { key: "cuisine", header: "Cuisine", width: 20 },
  {
    key: "contactName",
    header: "Contact name",
    width: 18,
    note: "Only a name the restaurant or the press has published, or one the person gave you. Leave it empty otherwise.",
  },
  { key: "phone", header: "Phone", width: 15, note: "The published business number only." },
  {
    key: "publicEmail",
    header: "Public email",
    width: 24,
    note: "A business address the restaurant publishes itself. Never a personal or guessed address.",
  },
  { key: "website", header: "Website", width: 28 },
  { key: "otherListings", header: "Other listings", width: 32 },
  { key: "observedIssue", header: "Observed issue", width: 46 },
  {
    key: "evidence",
    header: "Evidence",
    width: 19,
    list: "evidence",
    note: "How the research found the main issue. verified-by-search: search results showed it. needs-visual-check: guessed from what search did not show. Neither means that anyone has looked at the site.",
  },
  {
    key: "checkedOn",
    header: "Checked on my phone",
    width: 14,
    type: "date",
    note: "The date you looked at their site on your own phone. Contact nobody until this is filled in.",
  },
  { key: "confirmed", header: "What I confirmed", width: 36, note: "What you saw with your own eyes, in a sentence or two." },
  { key: "package", header: "Suggested package", width: 24, list: "packages" },
  { key: "fit", header: "Fit (1 to 5)", width: 8, type: "int", min: 1, max: 5 },
  { key: "route", header: "Best contact route", width: 15, list: "routes" },
  {
    key: "status",
    header: "Outreach status",
    width: 17,
    list: "outreach",
    strict: true,
    note: "Pick from the list. The Dashboard counts these exact words.",
  },
  { key: "lastContact", header: "Last contact", width: 14, type: "date" },
  { key: "response", header: "Response", width: 30 },
  {
    key: "nextFollowUp",
    header: "Next follow-up",
    width: 15,
    type: "date",
    note: "Enter a date. It turns amber on the day and red once it has passed.",
  },
  {
    key: "dealValue",
    header: "Deal value",
    width: 12,
    type: "money",
    note: "The one-time price in dollars, once you have sent a proposal. Leave the monthly maintenance fee out.",
  },
  {
    key: "paymentStatus",
    header: "Payment status",
    width: 17,
    list: "payment",
    strict: true,
    note: "Pick from the list. The Dashboard counts these exact words.",
  },
  { key: "notes", header: "Notes", width: 46 },
];

/**
 * The first columns are the ones the website inbox script writes for a "lead", in the order it
 * creates them on an empty tab. The script finds its columns by heading, so the headings must
 * match the labels on the agency site's contact form exactly.
 */
export const LEAD_SCRIPT_COLUMNS = [
  { key: "received", header: "Received", width: 18 },
  { key: "reference", header: "Reference", width: 16 },
  { key: "status", header: "Status", width: 12, list: "leadStatus" },
  { key: "name", header: "Your name", width: 18 },
  { key: "restaurant", header: "Restaurant name", width: 22 },
  { key: "email", header: "Email", width: 24 },
  { key: "phone", header: "Phone", width: 15 },
  { key: "city", header: "City and state", width: 16 },
  { key: "website", header: "Current website", width: 24 },
  { key: "need", header: "What do you need?", width: 22 },
  { key: "reach", header: "Best way to reach you", width: 14 },
  { key: "message", header: "Anything else?", width: 40 },
  { key: "ownerEmail", header: "Email to owner", width: 14 },
  { key: "customerEmail", header: "Note to customer", width: 14 },
];

/** Columns of our own, to the right of the script's. The script leaves these alone. */
export const LEAD_EXTRA_COLUMNS = [
  { key: "nextFollowUp", header: "Next follow-up", width: 13, type: "date" },
  { key: "myNotes", header: "My notes", width: 40 },
];

export const LEAD_COLUMNS = [...LEAD_SCRIPT_COLUMNS, ...LEAD_EXTRA_COLUMNS];

export const CLIENT_COLUMNS = [
  { key: "restaurant", header: "Restaurant", width: 24 },
  { key: "contactName", header: "Contact name", width: 18 },
  { key: "package", header: "Package", width: 18, list: "clientPackages" },
  { key: "addons", header: "Add-ons", width: 24, list: "addons" },
  { key: "agreementSigned", header: "Agreement signed", width: 13, type: "date", note: "The date it happened. Leave empty until it has." },
  { key: "depositPaid", header: "Deposit paid", width: 13, type: "date", note: "The date the deposit arrived. Work starts after this." },
  { key: "materialsReceived", header: "Materials received", width: 13, type: "date" },
  { key: "firstDraftSent", header: "First draft sent", width: 13, type: "date" },
  { key: "revisionRounds", header: "Revision rounds used", width: 10, type: "int", min: 0, max: 20 },
  { key: "approved", header: "Approved", width: 13, type: "date" },
  { key: "balancePaid", header: "Balance paid", width: 13, type: "date", note: "The site goes live after this." },
  { key: "launchDate", header: "Launch date", width: 13, type: "date" },
  { key: "domainRegistrar", header: "Domain registrar", width: 18 },
  { key: "domainAccount", header: "Domain account", width: 20, list: "domainAccounts", note: "The client owns the domain, in their own name and their own account." },
  { key: "hosting", header: "Hosting", width: 24, list: "hosting" },
  { key: "maintenancePlan", header: "Maintenance plan", width: 12, list: "yesNo" },
  { key: "maintenanceStart", header: "Maintenance start", width: 13, type: "date" },
  { key: "nextCheckIn", header: "Next check-in", width: 13, type: "date" },
  { key: "notes", header: "Notes", width: 46 },
];

/** 1 -> "A", 27 -> "AA" */
export function columnLetter(index) {
  let n = index;
  let letters = "";
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** The spreadsheet letter of a column, found by its key. */
export function letterOf(columns, key) {
  const index = columns.findIndex((column) => column.key === key);
  if (index === -1) throw new Error(`No column with the key "${key}".`);
  return columnLetter(index + 1);
}

export const PROSPECT_HEADERS = PROSPECT_COLUMNS.map((column) => column.header);
