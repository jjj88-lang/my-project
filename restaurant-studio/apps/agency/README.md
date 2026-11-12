# Agency website

The studio's own website: what it offers, the sample work, prices, the process and a contact form
that really delivers. Next.js 16.4, TypeScript and Tailwind CSS v4. No analytics and no
third-party scripts.

Prices and package details come from `restaurant-studio/config/pricing.json`, and the studio's
name, contact details and founder text from `restaurant-studio/config/studio.json`. Edit those
two files, never the copies in `src/content/`, then run `node scripts/sync-shared.mjs` from
`restaurant-studio/`.

## Run it

Requires Node 20.9 or newer (developed on Node 22).

```bash
npm install
npm run dev          # http://localhost:3000
```

Nothing needs to be configured to run it on your machine. The contact form writes each request
to `data/` (gitignored): `data/inbox/lead.jsonl` plus the two emails it would have sent, in
`data/outbox/`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (vitest) |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm run preflight` | What still blocks launch (see below) |
| `npm run capture -- --hibana <url> --bulmat <url>` | Retake the sample screenshots |
| `npm run review -- --axe / /work` | Screenshots, overflow, console and axe checks on a running site |

`npm start` is a production server: the form says it is not connected unless you start it with
`INBOX_DRIVER=local npm start` or set the Google variables.

## Environment variables

All of them are listed, with placeholders only, in [`.env.example`](.env.example). Copy it to
`.env.local` for development. On Vercel, set them in Project Settings, Environment Variables.

| Variable | Needed for | Notes |
| --- | --- | --- |
| `INBOX_GOOGLE_URL`, `INBOX_GOOGLE_SECRET` | The contact form in production | From the Apps Script backend, see `../../automation/google-sheets-inbox/README.md`. Without them the live form refuses requests and points to the studio's email or phone. |
| `INBOX_DRIVER` | Local testing only | `local` writes to `data/` from a production build. Leave empty on Vercel. |
| `FORM_SECRET` | Optional | Signs form tokens. A random one is generated on every build (`scripts/prepare.ts`). |
| `SITE_URL` | Optional | Overrides `url` in studio.json, for a preview deployment. |
| `STUDIO_TIMEZONE` | Optional | Dates request references. Default `America/Chicago`. |
| `NEXT_PUBLIC_STRIPE_LINK_*` (7) | `/pay` | Stripe-hosted Payment Links from the owner's own Stripe account. Only `https://buy.stripe.com/` values are shown; test-mode links are hidden on the live site. See `../../docs/payments.md` and `../../tools/stripe/README.md`. |
| `NEXT_PUBLIC_DEMO_HIBANA_URL`, `NEXT_PUBLIC_DEMO_BULMAT_URL` | `/work` | Deployed sample sites. Falls back to `demos.*.url` in studio.json. With neither, no "open the live sample" link is shown. |

`NEXT_PUBLIC_` values are built into the pages, so redeploy after changing one.

## Launch preflight

```bash
npm run preflight
```

Prints a checklist and exits 1 while anything blocks launch: placeholders in studio.json
(temporary name, example.com address and email, empty phone, mailing address and founder text,
legal review not done), missing inbox, Stripe and sample-site variables, missing screenshots
(a note, not a blocker), and whether the shared files are in sync with `config/`. It reads the
shell environment plus `.env.production.local` and `.env.local` when present.

While `url` in studio.json is still example.com, robots.txt and every page ask search engines to
stay away. While `legalReviewed` is false, /privacy and /terms show a draft notice.

## Sample screenshots

`/work` and the home page show screenshots of the two fictional sample restaurants from
`public/work/`. The build includes whatever is there and leaves out a sample, or a single
shot, that is missing (`src/lib/work/shots.ts`).

To retake them, start both samples (see `../restaurant/README.md`, "preview two clients side
by side"), then:

```bash
node scripts/capture-work.cjs --hibana http://localhost:3001 --bulmat http://localhost:3002
npm run build
```

A sample given no URL is skipped. A shot that fails leaves the old file in place and the script
exits 1. It uses the globally installed Playwright.

## Deploy on Vercel

1. New project from this repository. Root Directory: `restaurant-studio/apps/agency`.
   Framework: Next.js (detected). Build command and output: the defaults.
2. Use the studio's Vercel Pro account. The free Hobby plan is for non-commercial use only and
   must not host the agency site.
3. Add the environment variables above for Production (and Preview if you want previews to
   take real requests).
4. Deploy, check the preview address, then add the studio's domain and put the same address in
   `url` in `config/studio.json` (sync, commit, redeploy).
5. Run `npm run preflight` locally with the production values in `.env.production.local`, and
   send a test request through the live form.

These steps have not been run yet: they need the studio's own Vercel account.

## Checks before a release

Run these from this folder. All of them passed on 2026-11-12.

```bash
npm run lint
npm run typecheck        # next typegen, then tsc --noEmit
npm test                 # vitest: form rules, the lead route, Stripe links, contrast, content
npm run build
INBOX_DRIVER=local npx next start --port 3100 &
node scripts/review.cjs --base http://localhost:3100 --axe / /services /work /process /about /faq /contact /privacy /terms /pay /thanks
```

`review.cjs` loads each page at 1440 x 900 and 390 x 844 and reports horizontal overflow,
console errors, failed requests, small tap targets and every axe-core finding. After that, send
one request through /contact and check that a `LEAD-` reference appears and a line lands in
`data/inbox/lead.jsonl`. Stop the server when you are done (the process is named `next-server`).

## Where things are

- `src/app/` pages, `api/form-token` and `api/lead`, metadata routes (robots, sitemap,
  manifest, icons, Open Graph image)
- `src/components/` layout, pricing menu, tickets, device frames, lead form, legal layout
- `src/lib/` pricing helpers, studio details, SEO, Stripe links, sample URLs, preflight checks,
  the lead server (`lead/`) and the synced inbox library (`inbox/`, do not edit)
- `scripts/` prepare (form secret), preflight, capture-work, review
- `test/` unit tests
- `NOTES.md` design system and notes for whoever works on the site next
