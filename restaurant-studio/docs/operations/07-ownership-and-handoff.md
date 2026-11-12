# 07. Ownership and handoff

The terms are section 8 of `legal/service-agreement.md` and "What happens to the site when the plan ends" in `legal/maintenance-terms.md`. This page is how you carry them out.

## Who owns what

| The client owns | The studio keeps |
| --- | --- |
| Their domain name, registered in their name and their own registrar account | The template code, design system and tools in this repository, which it reuses for other clients |
| Their content: menu, text, logo, photos | Its own notes, time logs and invoices |
| Their business listings (Google, Yelp, social accounts) | |
| Their Google account, catering Sheet and Apps Script (add-on) | |
| A permanent, non-exclusive license to use, host and edit the site as built, once paid in full | |

Practical rules that follow from this:

- Never register a client's domain in your own account, even "just to save time". Register it with them, in their account.
- Never ask for or store a client's passwords. Use a short call, or a user/delegate role they grant and can remove.
- Never reuse a client's photos, logo or text for anyone else, including in demos. Portfolio use needs the ticked box in section 14 of the agreement.

## When a client declines maintenance (at launch)

The site cannot stay on the studio's hosting account without the plan. During the 14-day fix window:

1. Agree a handoff date with the owner, inside the fix window.
2. Help them open a hosting account in their own name on a plan that allows commercial use (Vercel's free Hobby plan does not: https://vercel.com/docs/limits/fair-use-guidelines, as of November 2026). Their own costs are theirs; show them the provider's pricing page rather than quoting from memory.
3. Hand over the package below and deploy it into their account with them, using the same environment variables as in `06-deploying.md`.
4. Point their domain at the new host (they enter the records, or you do on a call). Check the site on your phone.
5. Remove the project from the studio's Vercel account once the new one is live.

## When a client leaves maintenance

Notice is 30 days. During the notice period the site stays live and supported. Then follow steps 2 to 5 above. If the owner does not want help moving, send the package and give them a date when the studio's hosting stops (the end of the notice period).

## The handoff package

Make it from committed files only, so nothing private or temporary slips in. Commit the client's latest content first. Then, from the repository root:

```bash
mkdir -p restaurant-studio/private/handoff/<slug>
git archive HEAD:restaurant-studio/apps/restaurant | tar -x -C restaurant-studio/private/handoff/<slug>
cd restaurant-studio/private/handoff/<slug>
find clients -mindepth 1 -maxdepth 1 ! -name <slug> -exec rm -rf {} +    # removes every other client's folder
cd .. && zip -r <slug>-site.zip <slug>
```

The package contains the site code as built and only this client's `clients/<slug>/` folder. Send with it:

- [ ] The zip, through a file-sharing link (it is too big for some email systems).
- [ ] Their original photos and logo from `private/clients/<slug>/materials/`.
- [ ] A short note: "To run or deploy this site, follow `README.md` inside, sections Run it and Deploying a client. Set `CLIENT=<slug>`."
- [ ] The list of environment variable names their host needs (`06-deploying.md`). The form secret belongs to their own Apps Script; they can read it there. Never send secrets in the same message as the zip.
- [ ] Confirmation that the catering Sheet and script already live in their own Google account and keep working.

Check before you send: open the zip and confirm only one folder sits under `clients/`.

## After the handoff

- [ ] Remove the client's project and domain from the studio's Vercel account.
- [ ] Remove any user or delegate access they gave you (registrar, Google). Tell them it is done.
- [ ] Cancel the maintenance subscription in Stripe at the end of the notice period.
- [ ] CRM note and `log.md`: date handed over. Keep invoices and the signed agreement for your tax records.
- [ ] Remove their folder from the client-work repository. Its history still holds it, which is one more reason client work lives in a private repository (`01-onboarding-a-customer.md`).
