# Google Sheets inbox

A small Google Apps Script that receives form inquiries from a website and keeps them in a Google Sheet the business owns.

For each inquiry it does three things, in this order:

1. Adds a row to the Sheet, with the status "New".
2. Emails the owner the details. Replying to that email answers the customer.
3. Sends the customer a short note saying the request arrived.

It serves two uses:

- **Restaurant clients.** The catering and contact forms on a client's site. This is the Catering Inquiry Automation add-on ($349, see `config/pricing.json`).
- **The studio itself.** The lead form on the agency site (`apps/agency`).

## What it is not

- It never confirms a booking, a date, availability or a price. The customer's note says the request arrived and that someone will follow up. A person does everything after that.
- It is not an ordering or reservation system. Sites link to the system the restaurant already uses.
- It is not a CRM. The Sheet is a simple list the owner works through.
- It takes no payments and stores no card details.

## Files

| File | What it is |
| --- | --- |
| `Code.gs` | The whole script. One file, pasted into the Apps Script editor. |
| `OWNER-GUIDE.md` | One-page handout for the restaurant owner. |
| `TESTING.md` | What the automated tests prove and what only a live check can prove. |
| `test/` | Tests that run `Code.gs` in a simulated Apps Script environment. Run `npm install` once, then `npm test`. |

**Important:** the script has been tested only in a simulated Apps Script environment on Node, not on Google's servers. The live checklist below is what proves an install works. Run it every time.

## How the pieces fit

1. A visitor fills in the form. The website checks every field.
2. The website POSTs the inquiry as JSON to the script's web app URL, with a shared secret (`apps/restaurant/src/lib/inbox/drivers/google.ts`).
3. The script checks the secret and every field again, takes a lock, ignores a reference it has already recorded, writes the row, then sends the two emails.
4. It answers `{ "ok": true }`, or `{ "ok": false, "error": "..." }` when it refuses. If the website gets anything that is not JSON, it tries once more. Because the script ignores a reference it already has, the retry never makes a second row or a second email.

The wording of both emails lives in the `CONFIG` block at the top of `Code.gs` and in `apps/restaurant/src/lib/inbox/messages.ts`. A test checks that the two produce the same text, character for character. Change both or neither.

## Before you start

- About 30 minutes, the first time.
- The Google account that will own the inquiries. For a client, that is the restaurant's account, not yours.
- The website's hosting settings (Vercel: Project Settings, then Environment Variables).
- The business name, phone and address exactly as they appear on the website. The customer's note uses them.

Google's dialog labels change from time to time. The steps below use the labels as we know them; if a label differs slightly, pick the closest match and note it here.

## Setup for a restaurant client

Do this in the **client's** Google account, with the owner present. The owner signs in, reads each permission screen and approves it. You never need their password, and they own everything that is created.

1. **Create the Sheet.** In the owner's Google Drive: New, then Google Sheets. Name it something they will recognize, for example "Website inquiries".
2. **Paste the script.** In the Sheet: Extensions, then Apps Script. Delete the sample code, paste all of `Code.gs`, and save. Name the project "Website inbox".
3. **Run setup.** In the function list at the top choose `setup`, then Run. Google asks for permission:
   - Choose the owner's account.
   - Google may show "Google hasn't verified this app". That is normal for a script the owner made in their own account. Choose Advanced, then "Go to Website inbox".
   - The permissions are: see and edit this one spreadsheet (the script is limited to the Sheet it is attached to), send email as the owner, and allow it to be reached from the web. Walk the owner through each line before they approve.
4. **Fill in the business details.** Project Settings (the gear), then Script Properties. Fill in `BUSINESS_NAME`, `BUSINESS_PHONE` and `BUSINESS_ADDRESS`, exactly as on the website. Check `OWNER_EMAIL`: setup filled in the owner's account. You can list up to five addresses separated by commas.
5. **Run testSubmission.** It sends one fake inquiry to the owner's own address. Check the row and both emails (see the checklist below), then delete the test row.
6. **Deploy as a web app.** Deploy, then New deployment. Type: Web app. Execute as: **Me** (the owner). Who has access: **Anyone**. Deploy. Copy the Web app URL. It ends in `/exec`.
7. **Give the website the URL and the secret.** The execution log that opened under the code when you ran `setup` shows the line `INBOX_GOOGLE_SECRET = ...` (run `setup` again to see it; it does not change the secret). In the site's hosting settings set:
   - `INBOX_GOOGLE_URL` = the web app URL ending in `/exec`
   - `INBOX_GOOGLE_SECRET` = the secret from the setup log
8. **Redeploy the website** so it picks up the new values.
9. **Run the live checklist** below.

Keep the secret out of email and chat. If it leaks, rotate it (see Security).

"Anyone" is needed because the website's server calls the script without a Google sign-in. The secret is what keeps everyone else out.

## Setup for the studio's own lead inbox

The same steps, in the studio's Google account, with two differences:

- In step 3 run `setupStudio` instead of `setup`. It creates one "Leads" tab.
- In step 4, `BUSINESS_NAME` is the studio name and `BUSINESS_PHONE` the number a lead should call or text. The lead note does not use an address. Until the founder has a phone number in `config/studio.json`, the note to the lead cannot be sent: the row is still saved, and the owner email says no note went out.

Put the URL and secret in the agency site's hosting settings (`apps/agency/.env.example` lists the names).

## Live verification checklist

Run this after every install and after every change to the script. It takes about five minutes.

- [ ] Open the web app URL in a browser. It shows a short line of JSON with `"ok":true` and nothing else.
- [ ] Submit the real form on the live website with your own name and an email address you can read.
- [ ] The website shows its success message with a reference such as `CAT-20261212-7F3K`.
- [ ] A new row appears in the right tab: Received, Reference, Status "New", one column per form field, then "Email to owner" and "Note to customer", both "Sent".
- [ ] **Formula check.** Submit again with `=1+1` in a free-text field such as "Anything else we should know?". The cell shows `=1+1` as text, not `2`. A phone number starting with `+` shows exactly as typed.
- [ ] The owner gets the inquiry email. Pressing Reply addresses your test address.
- [ ] Your test address gets the customer note. Read it in full: it says the request arrived, gives the reference and the phone number, and **promises nothing**. No confirmed date, no availability, no price.
- [ ] Check spam folders on both ends. If the note lands in spam, tell the owner and note it in the client file.
- [ ] Delete the test rows. Leave the header row.

## Updating the script later

1. Open the Sheet, then Extensions, then Apps Script.
2. Replace the code with the new `Code.gs` and save. Script Properties stay as they are.
3. Deploy, then Manage deployments. Select the existing web app deployment, choose Edit (the pencil), set Version to **New version**, and Deploy.
4. The URL stays the same, so the website needs no change.
5. Run the live checklist.

Do not choose "New deployment" for an update. That makes a new URL and the website keeps calling the old one, which still runs the old code.

## Functions you can run from the editor

| Function | What it does |
| --- | --- |
| `setup` | First-time setup for a restaurant. Safe to run again: it only fills gaps and never changes the secret. |
| `setupStudio` | The same, for the studio's lead inbox. |
| `testSubmission` | One fake inquiry through the whole path, emails to the owner's own address. |
| `pauseInbox` / `resumeInbox` | Stop and restart accepting inquiries. While paused, the website tells visitors it could not send and asks them to call. |
| `rotateSecret` / `retireOldSecret` | Change the secret without breaking the form in between. |

Script Properties: `INBOX_SECRET`, `OWNER_EMAIL`, `BUSINESS_NAME`, `BUSINESS_PHONE`, `BUSINESS_ADDRESS`, `KINDS` (which forms this inbox accepts: `catering`, `contact`, `lead`), `HOURLY_LIMIT` (default 20), `PAUSED` (`yes` or `no`).

## Troubleshooting

**The website says the script answered with something that is not JSON.** Google returned a web page instead of the script's answer. Usually one of these:
- The deployment's "Who has access" is not "Anyone". Edit the deployment and fix it.
- The URL is the editor URL or a `/dev` URL. It must be the deployment URL ending in `/exec`.
- The owner has not approved the permissions yet, or Google asked again after a script change. Run `setup` once from the editor and approve.

**"The secret did not match".** `INBOX_GOOGLE_SECRET` on the website is not the script's `INBOX_SECRET`. Copy it again with no spaces at the ends, then redeploy the website.

**"This inbox has not been set up yet".** Run `setup` in the editor.

**Authorization errors in the editor ("Authorization is required", "You do not have permission").** Run `setup` again and approve every screen while signed in as the owner. If the owner uses several Google accounts in one browser, use a private window with only the owner's account.

**Rows arrive but "Email not sent: daily email limit reached".** The Google account has used its daily email allowance (see Limits). The rows are safe. The owner contacts those customers by hand. The allowance resets about 24 hours after the first email of the period.

**"Email not sent: hourly limit reached".** More than `HOURLY_LIMIT` inquiries came in within one clock hour. The owner was emailed once about it. Look at the rows: if they are spam, tell the studio. If the restaurant really gets that many, raise `HOURLY_LIMIT`.

**"Email not sent: business details missing in script settings".** Fill in `BUSINESS_NAME`, `BUSINESS_PHONE` and `BUSINESS_ADDRESS`.

**Something else.** In the editor, open Executions. Each request has a log. The log never contains customer email addresses.

## Limits

These come from Google's quota page as checked on 2026-11-11. **Confirm current limits** at https://developers.google.com/apps-script/guides/services/quotas before relying on them.

- Email recipients per day: about **100** on a consumer Google account (gmail.com), about **1,500** on Google Workspace. Each inquiry uses at least two (owner and customer), so a consumer account handles roughly 40 to 50 inquiries a day with one owner address. Each extra address in `OWNER_EMAIL` uses one more per inquiry.
- Script runtime: 6 minutes per run. One inquiry takes a few seconds.
- Simultaneous runs: 30 per user. The script handles one inquiry at a time with a lock and waits up to 8 seconds for its turn, then refuses with "busy" (the website then asks the visitor to try again or call).
- Quotas can change without notice.

Built-in limits of this script: at most 30 fields per inquiry, labels up to 100 characters, values up to 5,000 characters, names up to 120, and `HOURLY_LIMIT` inquiries per clock hour before emails pause (rows are always saved).

## Security and privacy

- **Who can open the Sheet.** Only the people the owner shares it with. Deploying the web app does not share the Sheet. Keep sharing to the owner and staff who answer inquiries. The studio does not need access to a client's Sheet; if the owner gives it for support, remove it afterwards.
- **What the script can reach.** The `@OnlyCurrentDoc` line limits it to the one Sheet it is attached to. It sends email as the owner and nothing else.
- **The secret.** It is stored in Script Properties and in the website's hosting settings, nowhere else. To change it: run `rotateSecret`, put the new value in the website's hosting settings, redeploy the website, send a test, then run `retireOldSecret`. Rotate when someone with access leaves, or if the secret was ever pasted somewhere it should not be.
- **What the customer is sent.** Only their first name (letters only), the date and guest count the website computed, the reference, and the business's own name, phone and address. Nothing else they typed is ever echoed back, so the form cannot be used to send someone else a message.
- **Spreadsheet formulas.** Values starting with `=`, `+`, `-`, `@`, a tab or a carriage return are stored as plain text. The website adds a protective apostrophe and the script formats every row as plain text before writing.
- **How long to keep inquiries.** Agree a period with the owner, for example 12 months, then delete older rows. This is a suggestion, not legal advice; the owner should confirm whether anything requires a longer or shorter period.
- **Deleting on request.** If a customer asks to have their details removed, the owner deletes the row and the two related emails (search the mailbox for the reference).
- **Logs.** The execution log records errors only, with email addresses replaced by `[address]`.

## For developers

```
cd restaurant-studio/automation/google-sheets-inbox
npm install
npm test
```

The tests load `Code.gs` in a `node:vm` sandbox with fakes of the Apps Script services (`test/support/apps-script-fakes.mjs`), compare its output with `messages.ts`, and run the real website driver against a local imitation of the web app. See `TESTING.md`.
