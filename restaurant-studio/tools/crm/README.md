# Sales CRM tools

Three small Node scripts for tracking prospects, website leads and clients in one spreadsheet. The spreadsheet is an `.xlsx` file that you upload to Google Drive and open as a Google Sheet (it also opens in Excel).

This repository is public. Anything that names a real restaurant lives only in `restaurant-studio/private/`, which git ignores. The scripts hold no restaurant names themselves.

## Set up once

```
cd restaurant-studio/tools/crm
npm install
```

## The three scripts

| Command | What it does |
| --- | --- |
| `npm run build` | Writes an empty CRM workbook with two fictional example rows to `private/crm/`. |
| `npm run build:private` | Writes the CRM with your prospects loaded from `private/prospects/prospects.csv` to `private/crm/sidework-crm.xlsx`. |
| `npm run prospects` | Turns the private research files (`private/prospects/research/*.json`) into the private prospect package: `prospects.csv`, `README.md`, `rejected.md` and one working file per restaurant in `outreach/`. Running it again keeps anything you typed under "My notes". |
| `npm run check:names` | Looks for every restaurant name, web address, phone number, email and street address from the private research in `tools/crm` and `sales`. Exit code 1 means something leaked. Pass folders to scan others: `node check-no-real-names.mjs ../../docs ../../legal`. |
| `npm test` | Runs the tests (Node's built-in test runner). One test recalculates the Dashboard with LibreOffice and is skipped when `soffice` is not installed. |

`build-crm.mjs` also takes options directly: `node build-crm.mjs --prospects <file.csv> --out <file.xlsx>`. Without `--out` the file always goes to `private/crm/`, so a workbook with real prospects is never written into a tracked folder.

## The workbook

- **Dashboard**: formulas only. What to do today (follow-ups due and overdue, new website leads, client check-ins), any prospect contacted before a phone check, prospects by outreach status, open pipeline and won value, deposits and balances outstanding, and client counts. Prices are copied in from `config/pricing.json`.
- **Prospects**: one row per restaurant. The columns match `prospects-template.csv`: what you observed, the evidence, whether you checked the site on your own phone, the suggested package, the outreach status, the last contact, the next follow-up, the deal value and the payment status.
- **Leads**: the website inbox (`automation/google-sheets-inbox/Code.gs`) writes inquiries here. The column names and the Status values (New, Contacted, Quoted, Booked, Declined) must stay the same in both places; `test/leads-contract.test.mjs` checks that.
- **Clients**: one row per paying client.
- **Lists**: the dropdown values. Do not rename them without changing `lib/columns.mjs`.

Every column is defined once, in `lib/columns.mjs`.

Outreach status runs: Not checked yet, Checked and ready, Emailed, Called, Visited, Replied, Call booked, Proposal sent, Won, Lost, Do not contact. A row moves past "Not checked yet" only after you have looked at the restaurant's site on your own phone. "Do not contact" is permanent.

Payment status runs: None yet, Deposit requested, Deposit paid, Balance requested, Paid in full, Refunded.

## How far to trust the prospect list

Every prospect came from desk research on search-engine text. The Evidence column says either `verified-by-search` or `needs-visual-check`. Neither one means that anyone has looked at the restaurant's website. Check each site on your phone before you contact anyone, and follow the rules in [../../sales/README.md](../../sales/README.md).

## Using it in Google Sheets

1. Run `npm run build:private`.
2. Upload `private/crm/sidework-crm.xlsx` to your own Google Drive and open it with Google Sheets (File, Save as Google Sheets).
3. Keep the Sheet private. Do not share it with anyone who does not need it.
4. If the website inbox should write to the same file, connect it as described in [../../automation/google-sheets-inbox/README.md](../../automation/google-sheets-inbox/README.md).

## Before every commit that touches sales material

```
npm run check:names
```
