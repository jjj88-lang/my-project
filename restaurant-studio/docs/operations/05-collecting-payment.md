# 05. Collecting payment

The mechanics (creating the links, confirming a payment, combined purchases, checks, refunds) are in `docs/payments.md`. Setting up Stripe is in `tools/stripe/README.md`. This page is when to send what, and what to say.

Rules: every card payment goes through a Stripe-hosted page. Never take a card number by phone, text, email or in person. The studio pays the card fees; the client pays the listed price.

## Amounts (from `config/pricing.json`: 50% deposit, 50% balance)

| Item | Price | Deposit | Balance |
| --- | --- | --- | --- |
| Starter Website | $699 | $349.50 | $349.50 |
| Premium Website | $999 | $499.50 | $499.50 |
| Catering Inquiry Automation | $349 | $174.50 | $174.50 |
| Monthly Website Maintenance | $59 a month, from launch | none | none |

Card fees for your records: 2.9% + 30¢ per successful domestic card charge (https://stripe.com/pricing, as of November 2026). The maintenance subscription also carries Stripe Billing at 0.7% (https://stripe.com/billing/pricing, as of November 2026).

## Deposit (after the signed agreement comes back)

> Thank you for signing, [Owner name]. Here is the deposit link for the [package], $[amount]: [link]
> It's a secure Stripe page; you can pay by card. Work starts as soon as it goes through, and I'll confirm by message.

[Add the catering deposit link on its own line if they bought the add-on. See "Combined purchases" in `docs/payments.md`.]

- [ ] CRM Payment status **Deposit requested**, with the date.
- [ ] When Stripe shows **Succeeded**: CRM **Deposit paid**, reply to confirm, send the kickoff message (`01-onboarding-a-customer.md`).

## Balance (after written approval)

> Thank you for approving the site. Here is the balance link, $[amount]: [link]
> Once it goes through, I'll schedule the launch with you. [Proposed day and time.]

- [ ] CRM **Balance requested**. When Stripe shows Succeeded: **Paid in full**, then launch (`06-deploying.md`).
- [ ] The site never goes live before the balance is paid (section 5 of the agreement). No exceptions for "I'll pay next week": offer to hold the launch date instead.

## Maintenance (on launch day, if they chose it)

> Your site is live. Here is the link for monthly maintenance, $59 a month starting today: [link]. Stripe emails you a receipt each month. You can cancel any time with 30 days' notice.

## When payment is late

Keep it short and kind. Restaurants have uneven cash flow, and a late payment is rarely a bad sign about the person.

| Situation | Day 7 | Day 14 | After that |
| --- | --- | --- | --- |
| Deposit not paid | One friendly reminder with the link | Set CRM back to **None yet**, note it, and move on | Nothing is owed, nothing has started |
| Balance not paid | Reminder with the link | Second reminder | Call the owner. The site stays unlaunched; the preview stays available |
| Maintenance card failed | Email the client (Stripe also emails them) | Second email | Follow `legal/maintenance-terms.md` (Billing) |

Reminder wording:

> Hi [Owner name], a quick reminder about the [deposit / balance] for your website: [link]. If something about it doesn't work for you, tell me and we'll sort it out.

Never add late fees or interest the signed agreement does not mention. Never threaten to take a live site down outside the steps in the maintenance terms.

## Refunds and disputes

Refund rules: section 7 of `legal/service-agreement.md`; how to issue one: `tools/stripe/README.md` section 6. Chargebacks: `10-resolving-issues.md` and `tools/stripe/README.md` section 7.
