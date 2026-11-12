# Launch guide

How to get the studio from "files in a repository" to "ready to talk to a restaurant". Do the steps
in this order; each one depends on the one before. Allow two to three weeks of part-time evenings.

Nothing here has been executed yet: no domain is registered, nothing is deployed, no Stripe account
is live. Where a page says "to confirm", check it before you rely on it.

| Order | Page | What you finish with | Rough time |
|---|---|---|---|
| 1 | [06-legal-and-tax-notes.md](06-legal-and-tax-notes.md) | Questions sent to the right people. Start first: answers take the longest. If you are on a student visa, item 12 comes before everything else. | 1 h, then waiting |
| 2 | [07-name-and-brand.md](07-name-and-brand.md) | A name you have checked and decided on | 1 to 2 h |
| 3 | [01-accounts-and-costs.md](01-accounts-and-costs.md) | Every account opened, and you know what you will pay each month | 1 h |
| 4 | [03-domain-and-email.md](03-domain-and-email.md) | Domain registered, studio email working | 1 h |
| 5 | [02-hosting-and-deployment.md](02-hosting-and-deployment.md) | Agency site and both sample concepts live on Vercel Pro | 2 to 3 h |
| 6 | [04-launch-checklist.md](04-launch-checklist.md) | Every box ticked, including the phone read and a live inbox test | 2 h |
| 7 | [05-first-customer-plan.md](05-first-customer-plan.md) | 14 days of careful, personal outreach | about 10 h a week |

## Costs at a glance

About $21 a month before the first client (Vercel Pro plus the domain, with free email forwarding),
or about $28 with Google Workspace. Details and sources in `01-accounts-and-costs.md`.

## Where everything else lives

- Prices and package terms: `../../config/pricing.json` (the only source; never retype a number)
- Studio details: `../../config/studio.json`, then `node scripts/sync-shared.mjs`
- Running client projects: `../operations/README.md`
- Payments: `../payments.md` and `../../tools/stripe/README.md`
- Agreements: `../../legal/README.md`
- Sales playbook: `../../sales/README.md`
