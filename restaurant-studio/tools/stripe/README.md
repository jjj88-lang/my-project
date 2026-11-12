# Taking payments with Stripe

This guide is for someone who has never used Stripe. It takes you from an empty account to seven working payment links, tested with a fake card, and stops at a clear approval gate before any real money moves.

How the studio takes money, in one paragraph: every payment happens on a page hosted by Stripe (a **Payment Link**). The studio never sees, types or stores a card number. The agency site's `/pay` page simply shows buttons that open those Stripe pages. The studio pays the card fees; the client pays the listed price and nothing more.

Prices come from `config/pricing.json`. The amounts below were computed from it on 2026-11-12 (50% deposit, 50% balance). If that file changes, recompute the amounts before you create or change any link.

Nothing in this folder has been run against a real Stripe account. Everything here is a set of steps for the owner to follow, test mode first.

Facts about Stripe in this guide were checked on Stripe's official pages on 2026-11-11. Stripe changes its screens and prices, so if something here does not match what you see, trust Stripe's page and update this file. Sources are listed at the end.

---

## 1. Create the account (about 20 minutes)

1. Go to stripe.com and sign up with the studio email address (the one in `config/studio.json`, once it is filled in). Use a strong, unique password and turn on two-step login when Stripe offers it.
2. Stripe opens in **test mode** (sometimes called a sandbox). You can build and test everything there before you give Stripe any personal details.
3. When you are ready to take real money, choose **Activate payments** (or **Complete your profile**) and answer the questions:
   - **Business type:** Individual or sole proprietorship. You do not need an LLC.
   - **Tax ID:** a sole proprietor without an EIN can use their Social Security number. Stripe checks that the name and SSN match. If you later get a free EIN from the IRS, you can switch to it. (Whether to get an EIN is your call; see the tax note in `docs/payments.md`.)
   - **Industry:** website design or software services, whichever Stripe offers that fits best.
   - **Website:** the agency site URL. Stripe may look at it, so make sure it shows your prices and terms.
   - **Bank account:** the account where payouts should land.
4. Stripe may ask for more identity checks. Answer them in the Dashboard only, never through a link in an email you did not expect.

## 2. Settings to switch on before taking money

Do these once, in the Dashboard **Settings**. Labels move around; use the Dashboard search box if you cannot find one.

| Setting | Where | What to set |
| --- | --- | --- |
| Public business name | Settings, Business, Public details | The studio name (temporary: "Sidework Studio"). This is what clients see on the payment page and receipts. |
| Statement descriptor | Settings, Business, Public details | What shows on the client's card statement, for example `SIDEWORK STUDIO`. A name they recognize prevents "what is this charge?" disputes. |
| Support email and phone | Settings, Business, Public details | The studio email and phone. Leave the phone blank until you have a business number you are happy to publish. |
| Receipts by email | Settings, Customer emails | Turn on **Successful payments** and **Refunds**. The client gets a receipt from Stripe automatically. |
| Branding | Settings, Branding | Logo or icon, brand color, accent color. Keep it plain and readable. |
| Payout schedule | Settings, Payouts | Check what Stripe set. Daily automatic is common in the US, but confirm it in your Dashboard. |
| Two-step login | Your profile, Security | On. |
| Team | Settings, Team | Only you. Do not add anyone else unless you have a real reason. |

## 3. Create the seven payment links by hand

This is the recommended path. It takes about 30 minutes and needs no code. (The links could also be created by a script later; none exists today.)

Do this **in test mode first**. Test links and live links are separate: when you switch to live mode later, you repeat this section there.

### 3a. Create the four products

Dashboard, **Product catalog**, **Add product**. Create these four. For the three one-time products, add two prices each (deposit and balance), and give each price a clear description so you can tell them apart in reports.

| Product | Price 1 | Price 2 |
| --- | --- | --- |
| Starter Website | $349.50, one-time, description "Deposit (50%)" | $349.50, one-time, description "Balance (50%)" |
| Premium Website | $499.50, one-time, description "Deposit (50%)" | $499.50, one-time, description "Balance (50%)" |
| Catering Inquiry Automation | $174.50, one-time, description "Deposit (50%)" | $174.50, one-time, description "Balance (50%)" |
| Monthly Website Maintenance | $59.00, recurring, monthly | (none) |

Currency for all of them: USD. Leave tax settings off unless you have confirmed you must collect sales tax (see `docs/payments.md`).

Deposit and balance have the same amount because the price splits exactly in half. If `depositPercent` in `config/pricing.json` ever changes, the deposit is that percent of the price rounded to the cent, and the balance is whatever is left, so the two always add up to the full price.

### 3b. Create one payment link per price

Dashboard, **Payment Links**, **New** (or **Create payment link**). For every link, use the same settings, then the item and redirect from the table below.

Settings for every link:

- **Product:** add one item only, the price named in the table. Do not add optional items.
- **Let customers adjust quantity:** off.
- **Allow promotion codes:** off.
- **Collect customers' names:** on, choose **business name**, and make it required. This tells you which restaurant paid.
- **Collect customers' addresses:** off (Stripe collects what the card needs).
- **Collect phone numbers:** off. You already have it from the agreement.
- **Custom fields:** none. Never add a field that asks for sensitive information.
- **Limit the number of payments:** off (one link serves every client).
- **After payment** tab: choose **Don't show confirmation page** and enter the redirect URL from the table. Replace `https://YOUR-SITE` with the agency site address, for example `https://sideworkstudio.com`, with no trailing slash.
- **Payment methods:** leave Stripe's defaults. Cards are what matters.

| # | Link name (for you) | Item and amount | Redirect after payment | Environment variable it fills |
| --- | --- | --- | --- | --- |
| 1 | Starter Website, deposit | Starter Website, Deposit (50%), $349.50 one-time | `https://YOUR-SITE/thanks?item=starterDeposit` | `NEXT_PUBLIC_STRIPE_LINK_STARTER_DEPOSIT` |
| 2 | Starter Website, balance | Starter Website, Balance (50%), $349.50 one-time | `https://YOUR-SITE/thanks?item=starterBalance` | `NEXT_PUBLIC_STRIPE_LINK_STARTER_BALANCE` |
| 3 | Premium Website, deposit | Premium Website, Deposit (50%), $499.50 one-time | `https://YOUR-SITE/thanks?item=premiumDeposit` | `NEXT_PUBLIC_STRIPE_LINK_PREMIUM_DEPOSIT` |
| 4 | Premium Website, balance | Premium Website, Balance (50%), $499.50 one-time | `https://YOUR-SITE/thanks?item=premiumBalance` | `NEXT_PUBLIC_STRIPE_LINK_PREMIUM_BALANCE` |
| 5 | Catering add-on, deposit | Catering Inquiry Automation, Deposit (50%), $174.50 one-time | `https://YOUR-SITE/thanks?item=cateringDeposit` | `NEXT_PUBLIC_STRIPE_LINK_CATERING_DEPOSIT` |
| 6 | Catering add-on, balance | Catering Inquiry Automation, Balance (50%), $174.50 one-time | `https://YOUR-SITE/thanks?item=cateringBalance` | `NEXT_PUBLIC_STRIPE_LINK_CATERING_BALANCE` |
| 7 | Monthly maintenance | Monthly Website Maintenance, $59.00 per month | `https://YOUR-SITE/thanks?item=maintenance` | `NEXT_PUBLIC_STRIPE_LINK_MAINTENANCE` |

Link 7 uses a recurring price, so Stripe makes it a subscription: the client's card is charged $59 today and on the same day each month until it is cancelled.

### 3c. Save the links

Each link has an address that starts with `https://buy.stripe.com/`. Payment Link addresses are not secret (clients see them), but keep the list tidy:

1. Copy each address into a file at `restaurant-studio/private/stripe/links.test.json` (or `links.live.json` for live mode). The `private/` folder is ignored by git, so it never reaches the public repository. Suggested shape:

   ```json
   {
     "mode": "test",
     "createdOn": "2026-11-12",
     "NEXT_PUBLIC_STRIPE_LINK_STARTER_DEPOSIT": "https://buy.stripe.com/test_...",
     "NEXT_PUBLIC_STRIPE_LINK_STARTER_BALANCE": "https://buy.stripe.com/test_..."
   }
   ```

2. In the hosting dashboard for the agency site (Vercel, project Settings, Environment Variables), add the seven variables with those addresses. Use the **Preview** environment for test links and **Production** for live links, so a test link can never appear on the real site. Then redeploy: these variables are read when the site is built.
3. Open `/pay` on the site and check that each button opens the right Stripe page with the right amount. A missing or mistyped variable simply hides that button.

## 4. Test-mode walkthrough (about 15 minutes)

Do this before you ever switch to live mode.

1. Make sure the Dashboard shows **Test mode** (a toggle or banner at the top).
2. Open the test Starter deposit link (link 1), either from `/pay` on a preview deployment or by pasting the address into a browser.
3. Check the page: studio name and logo, "Starter Website", "Deposit (50%)", $349.50, and a required business name field.
4. Pay with Stripe's published test card:
   - Card number `4242 4242 4242 4242`
   - Any expiry date in the future, for example `12 / 34`
   - Any three-digit CVC, for example `123`
   - Any ZIP code, for example `66603`
   - Business name: something obviously fake, for example `Test Restaurant`
   - Email: your own address, so you see the receipt
5. After paying, the browser should land on `https://YOUR-SITE/thanks?item=starterDeposit`.
6. In the Dashboard, open **Payments** (or **Transactions**). The $349.50 test payment is listed as succeeded, with the business name. Click it: you see the fee Stripe would have taken and the net amount.
7. Check your inbox for the Stripe receipt (in test mode, Stripe may only send receipts to your own account email; that is fine).
8. Repeat with link 7 (maintenance). Then open **Customers** or **Subscriptions** and cancel the test subscription, to practice that step.
9. Optional: try the declined test card from Stripe's testing page to see what a client sees when a card fails.

You are done when **the owner sees a test payment in the Dashboard and lands on /thanks**. Write down the date you did it in `private/stripe/`.

## 5. The approval gate before live mode

Do not switch to live keys or live links until every line below is true and the owner has said "yes, go live" in writing (a note to yourself with the date is enough for a one-person business, but make it a deliberate step).

- [ ] The test walkthrough in section 4 passed for at least one deposit link and the maintenance link.
- [ ] Stripe shows the account as activated, with the bank account verified.
- [ ] Public business name, statement descriptor, receipts and branding are set (section 2).
- [ ] The amounts on all seven test links match section 3 and `config/pricing.json`.
- [ ] The agency site shows the real studio URL, email, prices and terms (not example.com placeholders).
- [ ] The service agreement (`legal/service-agreement.md`) and the maintenance terms (`legal/maintenance-terms.md`) have been read and accepted by the owner, and ideally reviewed by an attorney.
- [ ] You know how to refund a payment (section 6) and where disputes appear (section 7).

Then switch the Dashboard to live mode, repeat section 3 there (live products and links are separate from test ones), save them to `private/stripe/links.live.json`, put them in the **Production** environment variables, redeploy, and open each live link once to check the amount. Do not pay a live link yourself to test it unless you are ready to refund it and lose the fee.

## 6. Refunds

When a refund is due under section 7 of the service agreement:

1. Dashboard, **Payments**, open the payment, **Refund**.
2. Choose full or partial, pick a reason, and confirm. For a partial refund (the agreement allows deposit minus time spent at $60 per hour), type the exact amount and keep the written time record with the client's file.
3. The money goes back to the client's card. Their bank can take several business days to show it; Stripe's refund page in the Dashboard gives the current estimate. Stripe emails the client if refund receipts are on.
4. Update the CRM "Payment status" to **Refunded** (see `docs/payments.md`).

Assume the original card fee is not returned to you when you refund. Check the current rule on stripe.com/pricing.

To cancel a maintenance subscription: **Subscriptions**, open it, **Cancel**. Under the maintenance terms the plan runs to the end of the 30-day notice period, so choose to cancel at the right date rather than immediately.

## 7. Disputes (chargebacks)

A dispute is when the client asks their bank to reverse a charge. It is rare when the statement descriptor is clear and the client got what they paid for.

- Stripe emails you and the payment shows as **Disputed**. The amount, plus a dispute fee, is taken from your balance while it is open. Check the current fee on stripe.com/pricing.
- First, contact the client directly. Often it is a misunderstanding ("I did not recognize the charge"). If they agree, they can withdraw it with their bank.
- If not, respond in the Dashboard before the deadline Stripe shows. Upload the signed agreement, the statement of work, the client's written approval, emails showing delivery and the receipt. Keep it factual.
- Never ignore a dispute: an unanswered dispute is lost automatically.

## 8. What fees and payouts look like

Stripe's US price for online card payments: **2.9% plus 30 cents** per successful domestic card charge. Payment Links add no fee of their own. Subscriptions (the maintenance link) also pay Stripe Billing, **0.7%**. Stripe Invoicing, if you send an invoice from the Dashboard, adds **0.4%** of each paid invoice. International cards, manually typed cards and currency conversion cost more. The studio absorbs all of these: the client pays the listed price.

Worked arithmetic (domestic card, rounded to the cent):

**Starter Website, $699, paid as two links**

| | Amount | Fee (2.9% + $0.30) | You receive |
| --- | --- | --- | --- |
| Deposit | $349.50 | $10.14 + $0.30 = $10.44 | $339.06 |
| Balance | $349.50 | $10.44 | $339.06 |
| Total | $699.00 | $20.88 | $678.12 |

If the full $699 were paid in one charge, the fee would be $20.27 + $0.30 = $20.57, so splitting it costs about 31 cents more (the 30-cent part is paid twice).

**Premium Website, $999, paid as two links**

| | Amount | Fee (2.9% + $0.30) | You receive |
| --- | --- | --- | --- |
| Deposit | $499.50 | $14.49 + $0.30 = $14.79 | $484.71 |
| Balance | $499.50 | $14.79 | $484.71 |
| Total | $999.00 | $29.58 | $969.42 |

One charge of $999 would cost $28.97 + $0.30 = $29.27.

**Catering add-on, $349:** $174.50 per half, fee $5.36 each, $10.72 in total, you receive $338.28.

**Maintenance, $59 a month:** card fee $1.71 + $0.30 = $2.01, Billing 0.7% = $0.41, total $2.42, you receive $56.58 a month.

Stripe rounds each fee its own way; the Dashboard shows the exact figure on every payment.

**Payouts.** Money does not reach your bank on the day of the payment. For a new account, the **first payout usually arrives 7 to 14 days after the first successful live payment**, and Stripe does not waive this. After that, payouts follow the schedule in Settings, Payouts (Stripe's documents refer to standard US settlement of about two business days). Plan for the first deposit to take two weeks to reach your bank. In the Dashboard, **Balances** shows what is pending and what is on its way.

## 9. What never to do

- Never share, paste, email or commit a **secret key** (it starts with `sk_live_` or `sk_test_`). You do not need one at all for the by-hand path. If one is ever exposed, roll it at once in Developers, API keys.
- Never take a card number by phone, text, email, chat or in person, and never type a client's card into the Dashboard for them. Send the payment link instead. (Manually entered cards also cost more and are easier to dispute.)
- Never write card numbers, bank details or Social Security numbers in any file in this repository, in the CRM or in a note.
- Never put live links in the Preview environment, or test links in Production.
- Never change the amount of a link that clients already have. Create a new price and a new link, then deactivate the old link.
- Never confirm a catering booking, date or price through Stripe. The catering add-on is the restaurant's inquiry form; it takes no payments.
- Never mark a deposit as paid in the CRM until you see it as **Succeeded** in Stripe.

## Sources (checked 2026-11-11)

- Pricing, 2.9% plus 30 cents and surcharges: https://stripe.com/pricing
- Payment Links carry no extra fee: https://stripe.com/payments/payment-links and https://stripe.com/resources/more/payment-links
- Recurring prices make subscriptions: https://docs.stripe.com/payment-links
- Redirect after payment: https://docs.stripe.com/payment-links/post-payment
- Business name and custom fields: https://docs.stripe.com/payment-links/customize
- Optional items, up to 10 per link: https://docs.stripe.com/payment-links/promotions and https://docs.stripe.com/payments/checkout/optional-items
- Billing, 0.7%: https://stripe.com/billing/pricing
- Invoicing, 0.4% per paid invoice: https://stripe.com/invoicing/pricing and https://support.stripe.com/questions/stripe-invoicing-pricing
- First payout 7 to 14 days: https://docs.stripe.com/payouts and https://support.stripe.com/express/questions/waiting-period-for-first-payout-on-stripe
- Sole proprietor with an SSN: https://support.stripe.com/questions/signing-up-for-stripe-as-a-sole-proprietor-without-employer-id-number and https://support.stripe.com/questions/tax-id-verification-guidelines-by-business-type-in-the-us
- Test cards (not part of the 2026-11-11 check; confirm on the page): https://docs.stripe.com/testing
