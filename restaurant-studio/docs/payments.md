# Payments: from "yes" to paid in full

One page for the whole money side of a project. How to set up Stripe and the seven payment links is in `tools/stripe/README.md`. Invoices and receipts come from `tools/invoice/invoice.html` (open it in a browser, fill it in, print to PDF; after any price change run `node tools/invoice/build.mjs`). The terms behind every step are in `legal/service-agreement.md` (sections 6 and 7) and `legal/maintenance-terms.md`. Day-to-day steps for a new client are in `docs/operations/` (onboarding and collecting payment).

Rules that never change:

- Prices come from `config/pricing.json`: Starter $699, Premium $999, Catering add-on $349, Maintenance $59 a month.
- 50% deposit to start, 50% balance at approval, before launch.
- Every card payment goes through a Stripe-hosted page. The studio never takes a card number by phone, text, email or in person.
- The studio pays the card fees. The client pays the listed price.

## The workflow

| # | Step | What you do | CRM "Payment status" | Other CRM fields |
| --- | --- | --- | --- | --- |
| 1 | Proposal accepted | Client says yes to a package in writing. | None yet | "Deal value": the one-time total in dollars (for example 699, or 1048 for Starter plus catering). Leave maintenance out. |
| 2 | Agreement signed | Send `legal/service-agreement.md` with the statement of work filled in. Wait for the signed copy. No link goes out before this. | None yet | Note the date signed. |
| 3 | Deposit link sent | Send the deposit link for the package (and for the add-on, if chosen; see "Combined purchases"). Attach an invoice from `tools/invoice/invoice.html` set to "Deposit" if the client wants one. | Deposit requested | Note the date sent. |
| 4 | Deposit received | Confirm it in Stripe (see below). Reply to the client to say it arrived and when the first draft is due. | Deposit paid | Note the date paid. |
| 5 | Work starts | Build. The schedule in the agreement starts once you have the deposit and the client's materials. | Deposit paid | |
| 6 | Approval | Client approves the final preview in writing (an email or text that says so is enough). Save it. | Deposit paid | Note the approval date. |
| 7 | Balance link sent | Send the balance link (plus the add-on balance, if any). Attach an invoice set to "Balance" if wanted. | Balance requested | |
| 8 | Balance received | Confirm it in Stripe. Send a receipt (Stripe sends one; the invoice tool can make a "Paid" copy). | Paid in full | |
| 9 | Launch | The site goes live only after approval and the balance. The 14-day fix window starts at launch. | Paid in full | Note the launch date. |
| 10 | Maintenance, if chosen | On launch day, send the maintenance link ($59 a month). It starts a monthly Stripe subscription. Confirm the first payment in Stripe the same way. | Paid in full | Note "Maintenance since <date>" in Notes. Deal value stays one-time only. |

If the client does not take maintenance, hand over the site files and help them move it to hosting in their own account, as the agreement says.

### How to confirm a payment in Stripe

1. Open the Stripe Dashboard in **live mode**, then **Payments** (or **Transactions**).
2. Find the payment by the business name the client typed and the amount (for example $349.50).
3. The status must say **Succeeded**. "Incomplete" or "Failed" means no money moved.
4. Only then update the CRM and reply to the client.

The money reaches your bank later: the first payout on a new account takes about 7 to 14 days, later ones follow your payout schedule. You can start work when the payment says Succeeded; you do not need to wait for the payout.

## Combined purchases (website plus the catering add-on)

Two ways, both fine. Pick one and tell the client which.

**A. Send both deposit links** (recommended). For example, the Starter deposit ($349.50) and the catering deposit ($174.50). The client pays twice, $524 in total. Fees: $10.44 + $5.36 = $15.80. Same again for the balance.

**B. One Stripe invoice for the combined amount.** In the Dashboard, **Invoices**, **Create invoice**, add a line "Starter Website, deposit (50%)" $349.50 and a line "Catering Inquiry Automation, deposit (50%)" $174.50, and send it. The client pays once. Stripe Invoicing adds 0.4% of each paid invoice on top of the card fee, so it costs a little more:

| Deposit | Two links | One invoice | Difference |
| --- | --- | --- | --- |
| Starter plus catering, $524.00 | $15.80 | $15.50 card + $2.10 invoicing = $17.60 | about $1.80 more |
| Premium plus catering, $674.00 | $20.15 | $19.85 card + $2.70 invoicing = $22.55 | about $2.40 more |

Whichever you choose, the CRM "Deal value" is the combined one-time total ($1,048 or $1,348).

## Payments outside Stripe (check or bank transfer)

Some owners prefer to pay by check or bank transfer. You may accept it.

- **Good:** no card fee, which some owners appreciate.
- **Less good:** checks take time to clear and can bounce; a transfer means sharing bank details by email, which is a common target for fraud; nothing records the payment for you; and the client gets no automatic receipt.
- **If you accept one:** wait until the money has cleared in your bank before you mark it paid. Never email your bank details in a message that could be forged: give them by phone to a number you already know, or on the signed invoice in person. Make a receipt with the invoice tool. Record "Paid by check, cleared <date>" in the CRM Notes.
- Never accept cash for a whole project without writing a receipt on the spot.

## Late payment

- **Deposit not paid:** nothing has started, so nothing is owed. Send one friendly reminder after a week. After two weeks, mark the CRM status back to "None yet" with a note and move on.
- **Balance not paid after approval:** the site does not launch until it is paid (section 5 of the agreement). Send a short reminder with the link after 7 days, then a second after 14. Be patient and polite; restaurants have uneven cash flow. If it stays unpaid, talk to the owner by phone before anything else.
- **Maintenance payment fails:** Stripe emails the client and may retry the card (check Settings, Billing, for the retry and email settings). Follow `legal/maintenance-terms.md`: email the client; if it is still unpaid 30 days after it was due, you may stop making changes, and after a further written notice you may take the site offline. Their domain and content always stay theirs.
- Never add late fees or interest that the signed agreement does not mention.

## Refunds

Follow section 7 of `legal/service-agreement.md`:

- Before work begins: the full deposit is refunded.
- After work begins, before the first draft: the deposit minus the time already spent at $60 per hour, with a written record of that time (the owner still needs to confirm this middle step).
- After the first draft is delivered: the deposit is kept.
- If the studio cannot deliver the site described in the statement of work: everything paid is refunded.

Refund from the Stripe Dashboard (steps in `tools/stripe/README.md`, section 6), to the same card, within the period the agreement states. Set the CRM status to **Refunded** and note the amount and date. Assume the original card fee is not returned to the studio.

## Records and taxes (not tax advice)

This is a starting point, not advice. Nothing in this section has been checked against official sources. Confirm each item with the official pages below or with a tax professional.

- Keep a simple record of every payment: date, client, amount, Stripe fee, and how it was paid. Stripe's Dashboard can export payments and payouts as a spreadsheet; save one each month in `private/` or your own storage, never in the public repository.
- Keep invoices, receipts, the signed agreement and refund records for each client.
- Income from this work is generally self-employment income and is reportable whether or not you receive a tax form. To confirm: IRS Self-Employed Individuals Tax Center, https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center
- Stripe may issue a Form 1099-K above a federal threshold; the threshold and any lower state threshold need confirming: https://www.irs.gov/businesses/understanding-your-form-1099-k
- An EIN is free from the IRS and keeps your Social Security number off forms you give clients: https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number
- Whether web design, hosting or maintenance are subject to sales tax in Kansas or New York has not been confirmed. Check with the Kansas Department of Revenue (https://www.ksrevenue.gov/) and the New York Department of Taxation and Finance (https://www.tax.ny.gov/) before the first sale, and keep Stripe's tax settings off until you know.
- Set aside part of every payment for taxes. A tax professional can tell you how much and whether you need to pay quarterly.
