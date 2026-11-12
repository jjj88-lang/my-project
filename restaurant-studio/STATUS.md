# Status

Checked on 2026-11-12 against the original brief. Done means built and tested on this machine. Partly means built but missing a piece, or never run for real. Not done means it does not exist. Test commands and results are in [README.md](README.md#what-has-been-tested).

## The brief, item by item

| Item | Status | Evidence or reason |
| --- | --- | --- |
| Agency website | Partly | All pages in `apps/agency` are built (home, /services, /work, /process, /about, /faq, /contact, /pay, /thanks, /privacy, /terms) and 140 unit tests pass, but it is not deployed and `npm run preflight` lists 18 launch blockers, all of them owner details, accounts and links. |
| Restaurant demonstration site | Partly | Two sample concepts, Hibana (Premium, multi-page) and Bulmat (Starter, one page), pass 106 unit tests and the recorded QA run (97 and 66 browser checks), but neither has photographs and neither is deployed. |
| Reusable client website system | Done | A new client is one folder in `apps/restaurant/clients/` started with `npm run new-client`, checked with `npm run validate` and `npm run launch-check`, then the QA suite (`CLIENT=<slug> npm run qa`). |
| Lead capture: validation, spam protection, notification, tracking | Partly | Signed timed token, honeypot, rate limit and full validation are tested on both sites, and each request gets a `LEAD-` reference; the owner email and Sheet row come from the Apps Script, which has only run in a simulated environment. |
| Sales tracking (CRM) | Done | `tools/crm` builds the CRM workbook (Dashboard, Prospects, Leads, Clients) and the private prospect package; 70 tests pass, including the Dashboard formulas recalculated in LibreOffice. It has not been opened in Google Sheets yet. |
| Stripe payment workflow | Partly | The by-hand Dashboard setup is written step by step ([tools/stripe/README.md](tools/stripe/README.md), [docs/payments.md](docs/payments.md)) and the /pay page accepts only real Stripe links; no Stripe account exists and the automation script was not built. |
| Project agreement | Partly | Service agreement, statement of work, maintenance terms and catering terms are drafted in `legal/`; none has been reviewed by a lawyer. |
| Invoice template | Done | `tools/invoice/invoice.html` fills its prices from `config/pricing.json`; its tests and a browser check (one-page PDF, no network requests) pass. |
| 50% deposit workflow | Done (on paper) | The steps from agreement to deposit link to balance are in [docs/payments.md](docs/payments.md) and [docs/operations/05-collecting-payment.md](docs/operations/05-collecting-payment.md), with CRM payment statuses to match; it has never been run with real money. |
| Prospect research | Partly | Method in [sales/01-prospect-research.md](sales/01-prospect-research.md); the planned site-audit tool was not built, so the check is by hand on your phone. |
| 30 prospects | Partly | 30 candidates (15 Topeka, 15 Ithaca) are in the gitignored `private/prospects/`, but they come only from search-engine text and none has been verified by looking at the restaurant's site. |
| The ten sales documents | Done | `sales/01` to `sales/10` (research, cold email, personalized pitch, follow-up, phone, in person, discovery call, proposal, objections, closing) plus `11-onboarding-checklist.md` and a printable one-pager. |
| Catering inquiry automation | Partly | `Code.gs` with an owner guide and connection steps, 72 passing tests in a simulated Apps Script, and a working demonstration on Hibana's catering page; never deployed to a real Google account. |
| Quality and security checks | Partly | QA suite (pages, content, forms, navigation, SEO, accessibility) recorded as passing for both samples; no-real-names check is clean; no secrets in tracked files (`.env.example` placeholders only). No penetration test and no check against a live deployment. |
| Operating procedures and weekly workload | Done | Ten procedures in `docs/operations/` from onboarding to resolving issues, plus [weekly-rhythm.md](docs/operations/weekly-rhythm.md) (8 to 10 hours a week, no more than two builds at once). |
| Launch: hosting | Partly | Vercel Pro setup is written up in [docs/launch/02-hosting-and-deployment.md](docs/launch/02-hosting-and-deployment.md); nothing has been deployed. |
| Launch: email and domain | Partly | Written up in [docs/launch/03-domain-and-email.md](docs/launch/03-domain-and-email.md); no domain registered, no studio email. |
| Launch: Stripe | Partly | Written up; no account. |
| Launch: checklist | Done | [docs/launch/04-launch-checklist.md](docs/launch/04-launch-checklist.md); none of its boxes is ticked yet. |
| Launch: first-customer plan | Done | [docs/launch/05-first-customer-plan.md](docs/launch/05-first-customer-plan.md): 14 days of personal outreach, one restaurant at a time. |

## Improve later (left out on purpose)

- Real photographs for the two samples. About 31 openly licensed candidates were downloaded to a temporary folder outside the repository and will need to be found again.
- Bulmat screenshots on the agency's /work page (`npm run capture` in `apps/agency` with both samples running).
- The site-audit tool for prospect research.
- A script that creates the Stripe products and Payment Links (doing it by hand takes about 30 minutes).
- Analytics on the agency site (none on purpose: no third-party scripts).
- A final name for the studio, and a logo beyond the text wordmark.

## What only you can do

1. If you are in the US on a student visa, ask your school's international student office whether you may take paid work like this, before anything else ([docs/launch/06-legal-and-tax-notes.md](docs/launch/06-legal-and-tax-notes.md), item 12).
2. Send the other legal, tax and registration questions in that file to the offices it names, and decide whether to get an EIN and a separate bank account.
3. Have a lawyer licensed in your state review everything in `legal/` and the agency's privacy and terms pages, then set `legalReviewed` to true in `config/studio.json`.
4. Choose and check the studio's final name, then register the domain in your own account.
5. Fill in `config/studio.json`: name, url, email, phone, mailing address (needed for outreach email), founder name and your own founder text. Then run `node scripts/sync-shared.mjs`.
6. Open the Vercel Pro account ($20 a month) and deploy the agency site and both samples, following [docs/launch/02-hosting-and-deployment.md](docs/launch/02-hosting-and-deployment.md).
7. Set up the studio email and a Google account for the lead inbox, deploy `Code.gs` there, and send one real test inquiry end to end.
8. Open your own Stripe account, create the products and seven Payment Links, test them in test mode, and approve the configuration before any link goes live.
9. Set the inbox, Stripe and sample-site environment variables on Vercel, then run `npm run preflight` in `apps/agency` until it reports nothing blocking.
10. Choose photographs for the samples (or take your own) and record each one's license.
11. Upload the CRM workbook to your own Google Drive and keep it private.
12. Look at every prospect's website on your own phone before contacting anyone, and approve each contact yourself.
13. Read the sales material once as the restaurant owner would, and change anything that does not sound like you.
