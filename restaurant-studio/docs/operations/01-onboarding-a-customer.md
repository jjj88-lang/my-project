# 01. Onboarding a customer: from "yes" to kickoff

Goal: a signed agreement, a paid deposit, a kickoff message sent and every record in place. About 45 minutes of your time, spread over a few days.

Prices and terms come from `config/pricing.json`. Never quote a number from memory.

## 1. Confirm the "yes" in writing (same day)

- [ ] Reply to the owner's yes with one short message that names the package, the add-on if any, the one-time total and whether they want maintenance. Example:

  > Thank you, [Owner name]. To confirm: the Premium Website ($999), with the Catering Inquiry Automation ($349), for a one-time total of $1,348. Monthly maintenance ($59 a month) starts at launch if you want it, and you can decide later. I'll send the agreement today.

- [ ] CRM (`private/crm/`): Outreach status **Won**. Deal value = the one-time total in dollars, maintenance left out (for example 699, 1048, 999 or 1348).

## 2. Send the agreement (same day)

- [ ] Fill in a statement of work from `legal/statement-of-work-template.md`: package, price, deposit, balance, the materials due date (kickoff plus 10 days, as in section 2 of the agreement) and anything the owner asked for that is not included.
- [ ] Send `legal/service-agreement.md` with the statement of work. Add `legal/maintenance-terms.md` if they want maintenance, and `legal/catering-automation-terms.md` if they bought the add-on.
- [ ] How to send for signature: see `legal/README.md` (a free e-signature tool or paper).
- [ ] Ask the owner to tick or leave blank the portfolio box (section 14). Blank means no permission.
- [ ] No payment link goes out before the signed copy comes back.

## 3. Take the deposit

- [ ] When the signed copy arrives, send the deposit link(s). Amounts and steps: `05-collecting-payment.md`.
- [ ] Wait until Stripe shows the payment as **Succeeded**. Then CRM Payment status **Deposit paid**, with the date.

## 4. Set up the folders (15 minutes)

- [ ] Create `private/clients/<slug>/` (gitignored, never committed). Use a short lowercase slug, such as `sakura-house`. Put in it:
  - `agreement-signed.pdf`, `sow.pdf`, and any invoice or receipt PDFs
  - `materials/` for everything the owner sends, exactly as received
  - `approvals/` for screenshots or saved copies of written approvals
  - `log.md` for a dated line for every decision, call and change request
- [ ] Back up `private/clients/` to a cloud folder only you can open. It exists only on your laptop otherwise. (Owner to choose where.)
- [ ] Scaffold the site (see `03-building-the-site.md`):

  ```bash
  cd restaurant-studio/apps/restaurant
  npm run new-client -- <slug> --name "Restaurant Name" --plan starter
  ```

  Use `--plan premium` for the Premium Website.

- [ ] Open decision before the first real client: this repository is public, and its rule is that nothing about real businesses is committed (see `restaurant-studio/.gitignore`). A client's folder under `apps/restaurant/clients/` has to be committed somewhere for the host to build it. Recommended: do client work in a private copy of this repository and deploy client projects from there. Do not commit a real client's folder to this public repository until the owner has decided.

## 5. Send the kickoff message (the day the deposit succeeds)

> Hi [Owner name], your deposit arrived. Thank you.
>
> Here is what happens next:
> 1. You send me the materials on the list below by [date, 10 days from today]. Photos of the printed menu are fine.
> 2. I send you a first draft within [5 business days for Starter / 7 business days for Premium] of having everything.
> 3. You get two rounds of changes. When you are happy, you approve it in writing, pay the balance, and we launch.
>
> [Paste the materials request from 02-collecting-materials.md here.]
>
> I am the one person you deal with throughout. The best way to reach me is [studio email]. I reply within two business days.

- [ ] Put three dates in your calendar: materials due, a reminder 5 days before that, and a provisional first-draft date.
- [ ] Add a line to `private/clients/<slug>/log.md`: date, "Kickoff sent".

## Done when

Signed agreement saved, deposit Succeeded, CRM updated, client folder and site scaffold created, kickoff message sent, three dates in the calendar.
