# Restaurant studio

Everything for a one-person, part-time studio that builds websites for independent restaurants: the agency's own website, a reusable restaurant site template with two sample concepts, a form inbox that runs on Google Sheets, a sales playbook, operating procedures, draft agreements, and a few small tools.

The working name is "Sidework Studio". It is temporary (see [docs/launch/07-name-and-brand.md](docs/launch/07-name-and-brand.md)).

Prices and package terms live in one place, `config/pricing.json`. The studio's name, email, phone and founder details live in `config/studio.json`, and most of them are still empty placeholders for you to fill in. After you edit either file, run `node scripts/sync-shared.mjs` from this folder.

This repository is public. Real prospects, client materials, signed agreements and CRM exports go only in `private/`, which git ignores.

For where each part stands, see [STATUS.md](STATUS.md).

## What is in each folder

| Folder | What it holds |
| --- | --- |
| `config/` | `pricing.json` (offers, prices, inclusions, exclusions) and `studio.json` (agency identity, mostly placeholders). The only source of truth. |
| `scripts/` | `sync-shared.mjs` copies the shared config and inbox library into the apps. `--check` reports drift. |
| `apps/restaurant/` | The restaurant site template (Next.js). One client is a folder in `clients/`. Two fictional sample concepts: Hibana (hibachi and sushi, Premium) and Bulmat (Korean BBQ, one-page Starter). See [apps/restaurant/README.md](apps/restaurant/README.md). |
| `apps/agency/` | The studio's own website, with a working contact form and a launch preflight. See [apps/agency/README.md](apps/agency/README.md). |
| `automation/google-sheets-inbox/` | The Google Apps Script that records form inquiries in a Google Sheet the restaurant owns and sends two emails. Also the catering add-on. See [automation/google-sheets-inbox/README.md](automation/google-sheets-inbox/README.md). |
| `qa/` | Browser checks every client site must pass before launch, at desktop and phone size. See [qa/README.md](qa/README.md). |
| `sales/` | The sales playbook: research, first contact, follow-up, phone, in person, discovery call, proposal, objections, closing, onboarding. See [sales/README.md](sales/README.md). |
| `docs/launch/` | Getting the studio ready: legal and tax questions, name, accounts, domain and email, hosting, launch checklist, first-customer plan. See [docs/launch/README.md](docs/launch/README.md). |
| `docs/operations/` | Running a project from yes to maintenance, plus the weekly rhythm. See [docs/operations/README.md](docs/operations/README.md). |
| `docs/payments.md` | How money moves: Stripe Payment Links, the 50% deposit, the balance, maintenance. |
| `legal/` | Draft service agreement, statement of work, maintenance terms and catering terms. Unreviewed. See [legal/README.md](legal/README.md). |
| `tools/crm/` | Builds the sales CRM spreadsheet and the private prospect package, and checks that no real names leak. See [tools/crm/README.md](tools/crm/README.md). |
| `tools/stripe/` | Step-by-step Stripe setup in the Dashboard (no code). See [tools/stripe/README.md](tools/stripe/README.md). |
| `tools/invoice/` | `invoice.html`, a printable invoice that fills its prices from `config/pricing.json`. |
| `private/` | Gitignored. The prospect package and CRM workbook. Never commit anything from here. |

## Preview everything on your laptop

You need Node 20.9 or newer (built on Node 22) and npm. Run `npm install` once in each folder before its first use.

**Restaurant samples** (from `apps/restaurant`):

```bash
npm install
npm run dev                    # Hibana at http://localhost:3001
CLIENT=bulmat npm run dev      # Bulmat at http://localhost:3001 instead
```

To see both side by side as production builds (Hibana on 3001, Bulmat on 3002), run each in its own terminal:

```bash
CLIENT=hibana NEXT_DIST_DIR=.next-hibana npm run build && NEXT_DIST_DIR=.next-hibana npx next start -p 3001
CLIENT=bulmat NEXT_DIST_DIR=.next-bulmat npm run build && NEXT_DIST_DIR=.next-bulmat npx next start -p 3002
```

**Agency site** (from `apps/agency`):

```bash
npm install
npm run dev                    # http://localhost:3000
```

Nothing needs configuring for this. The contact form writes each request to `apps/agency/data/` (gitignored) instead of sending it. A production build (`npm run build`, then `npm start`) says the form is not connected unless you start it with `INBOX_DRIVER=local npm start`.

**Browser QA for one client** (from `qa`, after `npm install` and `npx playwright install chromium`):

```bash
CLIENT=hibana npm run qa       # report in qa/reports/hibana/
```

## Read in this order to reach a first paying client

1. [docs/launch/06-legal-and-tax-notes.md](docs/launch/06-legal-and-tax-notes.md). Send these questions first; the answers take longest. If you are in the US on a student visa, item 12 comes before anything else.
2. [docs/launch/README.md](docs/launch/README.md), then its pages in the order it gives: name, accounts and costs, domain and email, hosting, launch checklist.
3. [legal/README.md](legal/README.md) and the drafts it lists. Get them reviewed before any client signs.
4. [docs/payments.md](docs/payments.md) and [tools/stripe/README.md](tools/stripe/README.md). Set up your own Stripe account and test every link.
5. [sales/README.md](sales/README.md) and the numbered playbook files, then [tools/crm/README.md](tools/crm/README.md) to load the private prospect list.
6. [docs/launch/05-first-customer-plan.md](docs/launch/05-first-customer-plan.md). The first 14 days of personal outreach.
7. [docs/operations/README.md](docs/operations/README.md). Once an owner says yes, follow the procedures from onboarding to maintenance.
8. [apps/restaurant/README.md](apps/restaurant/README.md) and [qa/README.md](qa/README.md). How to build their site and check it before launch.

## What has been tested

Commands run on 2026-11-12 during the final check of this folder, with their results:

| Where | Command | Result |
| --- | --- | --- |
| `apps/restaurant` | `npm test` | 6 test files, 106 tests passed |
| `apps/agency` | `npm test` | 5 test files, 140 tests passed |
| `apps/agency` | `npm run preflight` | Ran as designed: exit 1 with 18 launch blockers, all owner items (placeholders in studio.json, inbox, Stripe and sample-site variables, legal review). Shared files in sync. |
| `automation/google-sheets-inbox` | `npm test` | 72 tests passed, 0 failed (simulated Apps Script, see [TESTING.md](automation/google-sheets-inbox/TESTING.md)) |
| `tools/crm` | `npm test` | 70 tests passed, 0 failed, including the Dashboard recalculated in LibreOffice |
| `tools/crm` | `npm run check:names` | Clean: 228 names, addresses, phone numbers and web addresses from the private research looked for in `tools/crm` and `sales`, none found |
| `tools/crm` | `node check-no-real-names.mjs` over every source folder (both apps, automation, docs, legal, qa, sales, scripts, tools, config) | 264 files scanned. Only two hits, both generic Korean dish names in the Bulmat sample menu (`clients/bulmat/menu.json`, lines 73 and 94) that contain a common food word which also appears in the research. These are false positives. No real restaurant name, address, phone or web address appears. |
| `tools/invoice` | `npm test`, `npm run check`, `npm run test:browser` | 5 tests passed; presets match config; browser check passed (one-page PDF, no network requests, no page errors) |
| this folder | `node scripts/sync-shared.mjs --check` | "Shared files are in sync." |
| all Markdown | relative link check over 48 files | 3 dead links found and fixed (two to the CRM README, now written; one to the site-audit tool, which does not exist) |

Recorded by earlier engineers, not rerun in this check: the QA suite (`qa/README.md`: Hibana 97 passed, Bulmat 66 passed, none failed); lint, typecheck, production build and an axe accessibility pass of every agency page at 1440 and 390 px (`apps/agency/README.md` and `NOTES.md`).

## What has not been done or tested

- **Nothing is deployed.** No domain is registered, no Vercel account exists, and the agency site and samples have only run on this machine.
- **The Google Apps Script has only run in a simulated environment.** It has never run in a real Google account, sent a real email or written to a real Sheet. [TESTING.md](automation/google-sheets-inbox/TESTING.md) lists what only a live test can prove.
- **Stripe has not been touched.** No account, no products, no Payment Links. The agency's /pay page shows no links until you set them.
- **The Stripe automation script was not built.** Setup is by hand in the Stripe Dashboard ([tools/stripe/README.md](tools/stripe/README.md)), which is the recommended path anyway.
- **The site-audit tool was not built.** `tools/site-audit/` does not exist. Check each prospect's site on your own phone.
- **The sample sites have no photographs.** They use drawn motifs. About 31 openly licensed candidate photos were downloaded to a temporary working folder outside this repository, but none was selected or added, and that folder will not survive this session.
- **Bulmat has no screenshots on the agency site.** Only Hibana appears on /work until someone runs `npm run capture` in `apps/agency`.
- **The 30 prospects are unverified.** They come from search-engine text only. Nobody has looked at any of their websites. Every row starts at "Not checked yet".
- **The agency name is temporary**, and the email, phone, mailing address and founder details are empty.
- **The legal documents are unreviewed drafts** written without a lawyer. So are the privacy policy and terms pages on the agency site.
- **Tax, registration and licensing facts are unverified.** [docs/launch/06-legal-and-tax-notes.md](docs/launch/06-legal-and-tax-notes.md) lists them as questions with the official source to ask.
- **No real email has been sent or received**, and no domain email (SPF, DKIM, DMARC) is set up.
