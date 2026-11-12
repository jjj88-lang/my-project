# 06. Deploying (launch day)

Not yet executed: nobody has deployed the agency site or a client site yet. The account setup and the first deployment are in `docs/launch/02-hosting-and-deployment.md`; do that once, with a sample site, before your first client launch. Domain and DNS basics: `docs/launch/03-domain-and-email.md`.

Hosting model: one Vercel project per client, on the studio's Vercel Pro account, Root Directory `restaurant-studio/apps/restaurant`. Clients on maintenance stay there. Never put a client site on Vercel's free Hobby plan: it is for non-commercial use only (https://vercel.com/docs/limits/fair-use-guidelines, as of November 2026).

## The day before

- [ ] Written approval saved and the balance **Succeeded** in Stripe.
- [ ] Launch time agreed with the owner: a quiet weekday morning, never just before a dinner service or on a Friday.
- [ ] Domain access arranged. The domain is in the client's own account. Either the owner logs in on a short call (screen share or in person) or adds you as a user if their registrar allows it. Never accept their password by text or email.
- [ ] In `apps/restaurant`:

  ```bash
  npm run validate -- <slug>
  npm run launch-check -- <slug>     # fails on a 555 number, example.com, sample wording or no menu date
  ```

- [ ] In `restaurant-studio/qa`: `CLIENT=<slug> npm run qa`. It must pass. Open `qa/reports/<slug>/` and look at the phone screenshots.
- [ ] Catering add-on: the client's Google Sheet and Apps Script are set up and tested (`automation/google-sheets-inbox/README.md`), and you have their web app URL and secret.

## Launch

1. **Environment variables** in the client's Vercel project, Settings, Environment Variables, Production:
   - `CLIENT` = `<slug>`
   - `SITE_URL` = `https://their-domain.com` (the final address, with https)
   - `INBOX_GOOGLE_URL` and `INBOX_GOOGLE_SECRET`, only when the site has a form
   - optional: `FORM_SECRET` (32 or more random characters), `NEXT_PUBLIC_STUDIO_NAME`, `NEXT_PUBLIC_STUDIO_URL`
2. **Deploy to production** (push the approved version to the production branch). A production build runs the launch check automatically and fails if a placeholder is left. Open the `.vercel.app` address of the new deployment and check it.
3. **Before touching DNS, screenshot every existing record** at the registrar and save it in `private/clients/<slug>/`. This is your rollback.
4. **Add the domain** in the Vercel project (Settings, Domains): add both `their-domain.com` and `www.their-domain.com`, and set one to redirect to the other.
5. **Enter the DNS records Vercel shows**, exactly as shown, at the registrar. Copy them from the Vercel screen each time; do not reuse values from memory or another client.
   - Replace only the old records for the same names (the bare domain and `www`).
   - Never delete or change MX or TXT records. Those run the restaurant's email and verifications.
   - Do not change the nameservers unless you and the owner have decided to.
6. **Wait** until Vercel shows the domain as valid and the certificate is issued. DNS changes can take from minutes to a few hours to reach everyone (owner to confirm against the registrar's help page).

## Checks after launch (on your phone, on mobile data)

- [ ] `https://their-domain.com` and `www.` both load the new site with the padlock.
- [ ] Call, directions, order and reserve buttons work. Spot-check five prices.
- [ ] Form sites: send one real test request labelled TEST. Confirm the row in the owner's Sheet, the owner's email and the customer acknowledgment. Tell the owner to expect it.
- [ ] Ask the owner to put the new address on their Google Business Profile and other listings. Those are theirs; offer to sit with them while they do it.
- [ ] Ask the owner not to cancel any old website or hosting for 14 days.

## Close out

- [ ] Send the maintenance link if they chose it (`05-collecting-payment.md`).
- [ ] Message the owner: the site is live, the 14-day fix window runs until [date], how to reach you.
- [ ] CRM: launch date. `log.md`: launch date and fix-window end date. Calendar: fix-window end.

## Rollback

- **A bad deployment** (something broke after an update): in the Vercel project, Deployments, pick the last good production deployment and promote it or roll back to it (confirm the button name in the dashboard the first time). Or revert the commit and push. Then find the cause.
- **The domain is not working** and you cannot fix it within an hour: put back the old DNS records from your screenshot. The old site returns as the change spreads. Tell the owner plainly what happened and when you will try again.
