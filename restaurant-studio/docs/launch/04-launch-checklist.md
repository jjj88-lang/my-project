# 04. Launch checklist (the studio itself)

Work down the list. Do not send outreach until every box in sections 1 to 6 is ticked.

## 1. Name and domain

- [ ] Name checked and chosen (`07-name-and-brand.md`). If it is final, set `"nameIsTemporary": false`.
- [ ] Studio domain registered in your name, auto-renew on (`03-domain-and-email.md`).
- [ ] Professional email works both ways (send and reply test).

## 2. `config/studio.json`

Fill in every placeholder, then run `node scripts/sync-shared.mjs` from `restaurant-studio/`.

- [ ] `name`
- [ ] `url`: your real domain, not `https://example.com`
- [ ] `email`: not `hello@example.com`
- [ ] `phone`: a number you will answer (or leave empty if you prefer email only)
- [ ] `mailingAddress`: see section 5
- [ ] `founder.name`
- [ ] `founder.story`: only true statements you are happy for a restaurant owner to read. Leave it
      empty rather than pad it.
- [ ] `demos.hibana.url` and `demos.bulmat.url`, once the samples are deployed
- [ ] `legalReviewed`: set to `true` only after section 6 is done

## 3. Agency site

- [ ] `cd apps/agency && npm run preflight` prints no blockers.
- [ ] Deployed on the Vercel Pro team (`02-hosting-and-deployment.md`), domain connected, https works.
- [ ] Both sample concepts deployed and labeled "sample concept" wherever they appear.
- [ ] For each sample: `CLIENT=hibana npm run qa` and `CLIENT=bulmat npm run qa` (inside `qa/`) pass.

## 4. Lead inbox and payments

- [ ] Lead inbox live test: from your phone, on mobile data, send an inquiry through the live
      contact form. Confirm the row in the Sheet, the email to you, and the acknowledgment to the
      sender. Delete the test row. (`../../automation/google-sheets-inbox/README.md`)
- [ ] Stripe account activated in your own name. First payout takes 7 to 14 days after the first
      live payment (https://docs.stripe.com/payouts, as of November 2026).
- [ ] Stripe test-mode run: create the test links (`../../tools/stripe/README.md`), pay each with a
      test card, check the redirect to `/thanks` and the record in the dashboard
      (`../payments.md`).
- [ ] Live Payment Links created, checked against `config/pricing.json`, and pasted into the
      `NEXT_PUBLIC_STRIPE_LINK_*` variables on Vercel. Redeploy, then open `/pay` on your phone.

## 5. Mailing address for outreach email

Every commercial email, including a single personal one to a restaurant, must include a valid
physical postal address and a clear way to opt out, and opt-outs must be honored within 10
business days (https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business,
as of November 2026).

- [ ] Choose an address you are comfortable printing. To confirm on the FTC page: whether a
      registered PO box or private mailbox qualifies. If it does, that keeps your home address private.
- [ ] Added to `mailingAddress` and to your email signature with an opt-out line
      (`../../sales/02-cold-email.md`).

## 6. Legal and tax

- [ ] Drafts in `../../legal/` reviewed by an attorney (`../../legal/README.md`).
- [ ] Every item in `06-legal-and-tax-notes.md` confirmed or consciously deferred, with a note why.
- [ ] Separate bank account opened, connected to Stripe.

## 7. Final read on a phone

On your own phone, on mobile data, open every page of the agency site: `/`, `/services`, `/work`,
`/process`, `/about`, `/faq`, `/contact`, `/pay`, `/thanks`, `/privacy`, `/terms`.

- [ ] Every price matches `config/pricing.json`.
- [ ] No "example.com", "TODO", empty field or placeholder text anywhere.
- [ ] Nothing promises more customers, sales or revenue. No claim you cannot back up.
- [ ] Phone link dials, email link opens, every button goes somewhere real.
- [ ] Read it as a busy owner would. Anything that makes you wince, fix now.
