# Legal documents

**These are drafts written without a lawyer. They are not legal advice.** Before you send any of them to a client, have an attorney licensed in your state read them and adjust them. Then set `"legalReviewed": true` in `config/studio.json`.

## What is here

| File | Use it when |
|---|---|
| [service-agreement.md](service-agreement.md) | Every project. The main agreement, about two pages. |
| [statement-of-work-template.md](statement-of-work-template.md) | Every project. One-page scope sheet with the package, dates and materials. |
| [maintenance-terms.md](maintenance-terms.md) | The client takes the $59 monthly plan. |
| [catering-automation-terms.md](catering-automation-terms.md) | The client takes the $349 catering add-on. |

Every price and term comes from `config/pricing.json`. If you change that file, search these documents for the old number and update them too.

## Before the first use

- [ ] Attorney review done. Ask them in particular about: refunds (section 7), limits of liability (section 15), governing law (section 17), the accessibility wording (section 12) and the late-payment steps in the maintenance terms.
- [ ] Fill in every item marked `[OWNER TO CONFIRM]`, or delete the marker once you agree with the text.
- [ ] Decide the governing law state with the attorney.
- [ ] Studio legal name, email and mailing address ready (see `config/studio.json`).

## Preparing a packet for a client

1. Copy the files into `private/clients/<slug>/` (gitignored). Never put a client's name, address or signed agreement in a tracked file: this repository is public.
2. Fill in every `[BRACKET]` field: names, dates, the package boxes and the dollar amounts. Deposit and balance are each 50% of the project total.
3. Attach the maintenance and catering terms only if the client chose them.
4. Read it once on your phone, the way the owner will.
5. Export to PDF (any Markdown editor, or paste into a Google Doc and download as PDF).

## Getting it signed

Either way works. Keep the signed copy in `private/clients/<slug>/` and a backup outside the repository.

- **E-signature:** a free e-signature tool, or the signature feature in Google Docs or Adobe Acrobat Reader. Check the current free limits on the provider's own pricing page before you rely on one.
- **Paper:** print two copies, both sign both, each keeps one. A clear phone photo or scan of the client's signed copy is fine for your records.

Do not send a Stripe deposit link until the agreement is signed. See `docs/operations/01-onboarding-a-customer.md` and `docs/operations/05-collecting-payment.md`.
