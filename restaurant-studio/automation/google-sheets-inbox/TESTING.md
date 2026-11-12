# What the tests prove, and what they do not

`npm test` (after `npm install`) runs 72 tests with Node's built-in test runner. They never contact Google. `Code.gs` runs inside a `node:vm` sandbox whose `SpreadsheetApp`, `MailApp`, `PropertiesService`, `LockService`, `CacheService`, `ContentService`, `Session`, `Utilities` and `Logger` are fakes written from Google's documentation (`test/support/apps-script-fakes.mjs`).

**The script has been tested only in this simulated environment, not on Google's servers.** A live install is proven only by the checklist in README.md.

## Proven by the automated tests

`test/inbox.test.mjs`, the script's behaviour:

- Happy path for each kind (catering, contact, lead): one row in the right tab, header row bold and frozen, columns Received, Reference, Status "New", one per field label, then the two email columns; one owner email with Reply-To set to the customer; one plain-text customer note.
- Every sheet write and email happens while the script lock is held; the row is flushed before any email is sent; the lock is released afterwards.
- Refusals that record and send nothing: wrong, missing and non-string secret; inbox not set up; unknown kind and kind not enabled; malformed JSON, empty body, non-object body, oversized body, wrong version; 26 malformed-field cases (bad reference format, bad email, names with line breaks, ackSummary containing a link or an address, 31 fields, long or formula-like labels, duplicate or reserved labels, long, non-string or control-character values); paused inbox; lock held elsewhere.
- Values at the caps (30 fields, 100-character label, 5,000-character value) are accepted.
- The secret comparison handles different lengths and contains no early exit; the previous secret works during a rotation and stops after `retireOldSecret`.
- A duplicate reference answers `{ ok: true, duplicate: true }`, adds no row and sends nothing.
- A new field label adds one column just left of the email columns; older rows stay correct. Columns the owner moved are still found by heading.
- Formula injection: `=`, `+`, `-`, `@`, tab and carriage-return values, both with the site's apostrophe and sent raw, are stored and shown as typed; nothing is evaluated, and dates, numbers and TRUE are not converted.
- A one-time Sheets write error is retried and the row is written once.
- Daily quota at 0: row saved, both emails marked "Email not sent", nothing attempted. Quota of 1: the owner gets it and is told the customer got no note.
- Hourly cap: rows keep being saved, customer notes stop, the owner gets exactly one notice, and the next hour sends normally.
- Email failures after the row is written: the row stays, the failure is written into it, the site still gets `ok: true`, the owner is sent a correction when the customer note fails, and the log contains no customer address.
- Missing business details: no customer note, and the owner email says so.
- `doGet` answers JSON with no data. `setup()` creates the tabs, a 64-character secret and the default properties, logs the values for the website, and is safe to run twice. `setupStudio()` creates the Leads tab. `testSubmission()` pushes a fake inquiry through `doPost` with both emails to the owner and a formula probe that stays text.

`test/parity.test.mjs`, the contract with the websites:

- For five submissions (one per kind plus two edge cases: an odd name, labels ending in `?` and `:`, empty values, formula-like values), the request body is captured from the real `deliverGoogle` driver and fed to the script. The owner email (to, Reply-To, subject, body) and the customer note (to, subject, body) are character-for-character equal to `renderOwnerEmail` and `renderCustomerEmail` in `apps/restaurant/src/lib/inbox/messages.ts`, and the row equals `sheetRow`.
- The templates and tab names in `CONFIG` equal `ACK_TEMPLATES` and `SHEET_NAMES`; `safeCell_` and `firstName_` equal `safeCell` and `firstName`.

`test/request-side.test.mjs`, the website's driver against a local imitation of the web app (which runs the real `Code.gs` and answers with a 302 redirect, as Google does):

- Success follows the redirect and returns `{ ok: true }`.
- A refusal (wrong secret) is reported with the script's reason and not retried.
- An HTML page is treated as a failure and retried once.
- A timeout is treated as a failure and retried once. The test passes a 300 ms abort signal to the same driver instead of waiting the real 12 seconds.
- An answer lost after the script recorded the inquiry leads to a retry that adds no second row and no second email.

## Only a live Google account can prove

- That Google stores a string starting with an apostrophe, or written into a plain-text (`@`) cell, as text. The fakes assume this (assumptions A1 to A3 at the top of the fakes file). The formula check in the live checklist covers it.
- That the permission screens, the "Execute as: Me" and "Anyone" settings, and the deployment URL behave as README.md describes, and what the dialogs are currently called.
- The real redirect from `script.google.com` to `script.googleusercontent.com`, and that the site's server reaches it within its 12-second timeout.
- `LockService` under real simultaneous requests.
- `CacheService` timing (entries can disappear early on Google's side, which would only make the hourly cap more lenient).
- Real email: delivery, the sender name, Reply-To handling in Gmail and other mail apps, spam filtering, and the actual daily quota of the account.
- The Unicode name rule (`\p{L}`) on Google's V8 runtime. The script has a fallback if it is not supported; the fallback is not tested.
- How the status dropdown and the red tint for "Email not sent" look in Sheets.

## Known differences from messages.ts, by design

- When the customer note will not go out (invalid address, missing business details, daily quota), the owner email replaces its last paragraph with the reason, so the owner is never told something that did not happen. When Reply-To cannot be used, the reply line says so.
- If a visitor's text itself starts with an apostrophe followed by `=`, `+`, `-` or `@`, the owner email shows it without that apostrophe. The demo preview shows it with the apostrophe. The Sheet is the same in both.
