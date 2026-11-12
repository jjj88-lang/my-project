# 02. Hosting and deployment

**Status: none of these steps has been run yet.** Nobody has deployed the agency site or a client
site. Follow them as instructions, and fix this page where reality differs.

## The recommended setup: one Vercel Pro team

One Vercel Pro team ($20/month), owned by the studio, hosts the agency site and every client on the
maintenance plan. Why:

- It is allowed. Hobby is "restricted to non-commercial personal use only", and being paid to build,
  update or host a site counts as commercial (https://vercel.com/docs/limits/fair-use-guidelines,
  as of November 2026). Pro covers commercial use.
- One bill covers every client. Pro has unlimited projects and domains per project
  (https://vercel.com/docs/limits, as of November 2026).
- Both apps are Next.js 16.4.6, which Vercel builds without adapters or extra setup.
- Every push gives a preview address, which is how a client reviews their site before launch.
- `npm run launch-check` runs automatically on Vercel production builds (see the template README).

A client who declines maintenance gets their site files and help moving to hosting in their own
account (see `../operations/07-ownership-and-handoff.md`). Their own Vercel account would also need
Pro for a business site.

## Alternatives and their caveats (as of November 2026)

| Host | What to know | Source |
|---|---|---|
| Netlify | Free plan allows commercial use, but has 300 credits a month shared by every site; when they run out, every site in the account pauses. Pro is $20/month. Next.js runs through an adapter; an explicit Next.js 16 statement was not found. Untested with this template. | https://www.netlify.com/pricing/ ; https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/ |
| Cloudflare Workers | Cloudflare now recommends vinext, which is "not yet a drop-in replacement" for every app. The OpenNext adapter accepts Next.js 16.4.5 or later. The Free plan's 3 MB size limit can force the $5/month plan. Whether Free allows client work was not verified against the agreement. Untested with this template. | https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ ; https://www.npmjs.com/package/vinext ; https://developers.cloudflare.com/workers/platform/limits/ |

For a client hosting on their own, Netlify is the likeliest low-cost option. Test a build there
before you promise it.

## Create the team (once)

1. Sign up at vercel.com with the studio email. Create a team and choose Pro. Add a card.
2. Connect GitHub and give Vercel access to this repository.
3. In team billing settings, set a spend limit or alert if Vercel offers one, so usage beyond the
   included $20 credit cannot surprise you. (To confirm: the exact setting name.)

## Deploy the agency site

1. On your machine: `cd restaurant-studio/apps/agency && npm run preflight`. It lists what is still
   missing (studio details, inbox, payment links). Fix what you can first; see `04-launch-checklist.md`.
2. Vercel: Add New > Project > this repository. Root Directory: `restaurant-studio/apps/agency`.
   Framework: Next.js (detected).
3. Environment variables, from `apps/agency/.env.example`. Required in production:
   `INBOX_GOOGLE_URL` and `INBOX_GOOGLE_SECRET` (from `../../automation/google-sheets-inbox/README.md`;
   without them the contact form refuses to send). Optional: `SITE_URL`, `FORM_SECRET`,
   `STUDIO_TIMEZONE`, the seven `NEXT_PUBLIC_STRIPE_LINK_*` links, and
   `NEXT_PUBLIC_DEMO_HIBANA_URL` and `NEXT_PUBLIC_DEMO_BULMAT_URL`. Leave `INBOX_DRIVER` empty.
4. Deploy. Open the `.vercel.app` address on your phone and send yourself a test inquiry.
5. Add the studio domain under Project > Settings > Domains and enter the records Vercel shows at
   your registrar (see `03-domain-and-email.md`).

## Deploy a client site

One Vercel project per client, all from this repository.

1. Before the first deploy, in `apps/restaurant`: `npm run validate -- <slug>`, then in
   `restaurant-studio/qa`: `CLIENT=<slug> npm run qa`. Both must pass.
2. Add New > Project > this repository. Name it after the slug. Root Directory:
   `restaurant-studio/apps/restaurant`.
3. Environment variables:
   - `CLIENT` = the slug, for example `sakura-house`
   - `SITE_URL` = the final address, `https://their-domain.com`
   - `INBOX_GOOGLE_URL` and `INBOX_GOOGLE_SECRET`, only if the client has a form (Premium contact
     form or the catering add-on)
   - Optional: `FORM_SECRET` (32 or more random characters), `NEXT_PUBLIC_STUDIO_NAME` and
     `NEXT_PUBLIC_STUDIO_URL` for the footer credit
4. Deploy. While placeholder content remains (a fictional phone, an example.com address, starter
   wording), the production build fails on purpose: that is `launch-check` doing its job.
5. Client approval: push the client's work to a branch. Vercel builds a preview address for it,
   which skips the strict launch check. Send that address to the client
   (`../operations/04-review-and-approval.md`).
   To confirm: Vercel may protect preview addresses behind a Vercel login by default. If the client
   sees a login page, check Project > Settings > Deployment Protection.
6. After written approval and the balance payment, merge to the production branch, then connect
   their domain (`../operations/06-deploying.md`).

Every push to the repository rebuilds every client project. Pro allows 6,000 deployments a day
(https://vercel.com/docs/limits), so this is noise, not a limit.

## Rollback

Project > Deployments > open the last good deployment and use its rollback or promote option (to
confirm: the exact button label). Then fix the cause in the repository. Full steps: `../operations/06-deploying.md`.
