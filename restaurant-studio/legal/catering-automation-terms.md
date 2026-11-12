# Catering Inquiry Automation: Terms

> DRAFT written without a lawyer. Have an attorney review it before use. See [README.md](README.md).
> Attached to the [Website Project Agreement](service-agreement.md). Numbers come from `config/pricing.json`.

**Price:** $349, one-time, paid with the website project (50% deposit, 50% before launch). Works with either website package. Requires a Google account that belongs to the restaurant.

## What it does

- [ ] Adds a catering request form to your site: date, headcount, type of service, budget and notes.
- [ ] Saves every request to a Google Sheet that belongs to you.
- [ ] Emails you the details as soon as a request comes in.
- [ ] Sends the customer an automatic note that their request arrived.
- [ ] Includes setup in your own Google account, testing, and a 15-minute walkthrough.

## What it never does

It **never confirms** a booking, a date, availability or a price. The customer's note says plainly that their request arrived and that someone will follow up. You, or your staff, review each request and reply yourselves. You are responsible for every answer, quote and commitment made to a customer.

## Where it runs

- The form backend is a Google Apps Script that runs in **your** Google account, next to the Sheet. The Studio does not run a server that stores your inquiries.
- The Studio sets it up with you, in your account. The Studio never asks for or keeps your Google password. If you give the Studio temporary access to the Sheet or the script, you can remove it after setup, and the Studio will remind you to.
- You own the Sheet, the script copy and every inquiry in them.

## Customer data

- Each inquiry holds what the customer typed: name, email, phone and event details.
- It is stored only in your Sheet and in the emails sent to you. The Studio keeps no copy, except test entries made during setup, which it deletes before handover.
- Use the data only to answer the inquiry and run your catering. Do not add customers to a mailing list without their permission.
- Delete old inquiries you no longer need. Your website's privacy notice should mention that the form collects this information. [OWNER TO CONFIRM wording with the attorney]

## Limits

- Google limits how many emails a script can send each day: 100 recipients a day on a regular Google account (gmail.com) and 1,500 on Google Workspace. Each inquiry uses about two (your copy and the customer's note). Source: https://developers.google.com/apps-script/guides/services/quotas, as of November 2026. Google can change these limits without notice.
- If the daily limit is reached, the inquiry is still saved to the Sheet, but the customer's automatic note is not sent. Check the Sheet if a busy day seems quiet.
- The form has spam protection. Some spam may still get through, and very rarely a real request may be held back.
- The form is not a payment form and does not take deposits.

## If Google changes its service

Google may change Apps Script, Sheets, Gmail or their limits at any time.

- **Within the 14-day fix window after launch:** the Studio fixes anything that stops working, free.
- **On the maintenance plan:** the Studio checks the form during monthly monitoring, and a small fix counts toward your 60 minutes. A larger rebuild is quoted first at $60 per hour.
- **Not on the plan:** fixes are $60 per hour (minimum charge 30 minutes), quoted before work starts.
- If Google ends a feature this depends on, the Studio will suggest a replacement. The Studio is not responsible for Google's outages or changes.

## Turning it off

You can switch the form off at any time from your Google account (the script has a pause option), or ask the Studio to remove the form from your site. Your Sheet and its data stay with you.
