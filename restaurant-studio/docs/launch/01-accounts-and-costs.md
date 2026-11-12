# 01. Accounts and costs

Every account the studio needs, and what it costs. Prices are as of November 2026, taken from the
fact sheet the team checked on 2026-11-11 (from search excerpts of the official pages, not direct
page reads). Open each source page once before you pay, and fix this table if anything changed.

Studio prices come from `config/pricing.json`. Never retype them from memory.

## Accounts

| Account | Needed for | Cost (as of November 2026) | Source |
|---|---|---|---|
| Studio domain (.com) | Agency site and email address | Cloudflare Registrar $11.17/year. Porkbun $11.81/year. Namecheap $16.18 first year, $20.18/year renewal (with the ICANN fee) | https://pricing.registrar.cloudflare.com/ ; https://porkbun.com/tld/com ; https://www.namecheap.com/support/knowledgebase/article.aspx/10840/2201/com-price-change-november-1-2026/ |
| Business email, low-cost path | Receiving mail at hello@yourdomain | Cloudflare Email Routing forwards to an inbox you already have: free | https://developers.cloudflare.com/email-service/platform/limits/ |
| Business email, full path | Sending and receiving from your own address | Google Workspace Business Starter: $7/user/month (annual) or $8.40/user/month (flexible) | https://workspace.google.com/pricing |
| Hosting: Vercel Pro | Agency site and every client on maintenance | $20/month, includes one deploying seat and $20 of usage credit | https://vercel.com/docs/plans/pro-plan ; https://vercel.com/pricing |
| Stripe | Deposits, balances, the monthly plan | No monthly fee. 2.9% + 30¢ per domestic card charge. Billing adds 0.7% on subscriptions | https://stripe.com/pricing ; https://stripe.com/billing/pricing |
| Google account for the lead inbox | The agency contact form (Apps Script and a Sheet) | Free consumer account. Its script can email up to 100 recipients a day | https://developers.google.com/apps-script/guides/services/quotas |
| GitHub | The repository Vercel deploys from | Already in use. Owner to confirm the plan | (owner to confirm) |
| Mailing address for outreach email | Required in every commercial email | Owner to confirm. A PO box may qualify: not verified, see 04 | https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business |

Do not use Vercel's free Hobby plan for the agency or any client: it is for "non-commercial personal
use only" (https://vercel.com/docs/limits/fair-use-guidelines, as of November 2026).

Clients pay for their own domain, in their own name (about $12 to $20 a year, per
`config/pricing.json`). That is not a studio cost.

## What card fees cost the studio

The studio absorbs card fees. Domestic card, as of November 2026 (https://stripe.com/pricing):

| Charge | Fee | You keep |
|---|---|---|
| Starter, $699 | $20.57 | $678.43 |
| Premium, $999 | $29.27 | $969.73 |
| Catering add-on, $349 | $10.42 | $338.58 |
| Maintenance, $59/month (processing $2.01 + Billing $0.41) | $2.42 | $56.58 |

These are single charges. Projects are paid in two halves (deposit and balance), so each project
pays one extra 30¢: Starter $20.87, Premium $29.57, catering add-on $10.72 if billed separately.
International cards add 1.5%. A card typed in by hand adds 0.5%. Your first payout arrives 7 to 14
days after the first live payment (https://docs.stripe.com/payouts, as of November 2026).

## Totals

Low-cost path: Vercel Pro, a Cloudflare domain, Email Routing, a free Google account.

| | Per month | Per year |
|---|---|---|
| Before the first client | $20.93 | $251.17 |
| With Google Workspace (annual) instead of Email Routing | $27.93 | $335.17 |
| At three clients on maintenance (adds $7.26/month in Stripe fees) | $28.19 | $338.29 |
| Same, with Google Workspace (annual) | $35.19 | $422.29 |

How the numbers add up: $20 Vercel + $11.17/12 domain ($0.93) = $20.93. Three maintenance
payments cost 3 x $2.42 = $7.26 a month in fees.

For comparison only (not a forecast): three clients on maintenance bring in 3 x $59 = $177 a month
before fees.

## Costs that can appear later

- Vercel usage beyond the $20 credit. Pro includes 1 million CDN requests and 1 TB of transfer a
  month (https://vercel.com/docs/pricing/flat-rate-cdn). Image resizing is billed per use, $0.05
  per 1,000 transformations (https://vercel.com/docs/image-optimization/limits-and-pricing). A
  small restaurant site should stay well inside this, but check Usage in the dashboard monthly.
  Older Vercel pages list different included amounts: confirm in the dashboard.
- A second Vercel seat ($20/month) if anyone else ever deploys.
- Stripe Invoicing, 0.4% per paid invoice, only if you send Stripe invoices instead of Payment
  Links (https://stripe.com/invoicing/pricing).
