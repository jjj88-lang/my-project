# Restaurant site template

One codebase that serves every client's website. A client is a folder of content
(`clients/<slug>/`): two JSON files and some photos. Nothing in `src/` changes from
one restaurant to the next, so a fix or improvement made once reaches every site.

Two fictional sample concepts ship with it:

| Client | Plan | Look | Shows |
| --- | --- | --- | --- |
| `hibana` | Premium | Dark, serif, gold | Multi-page site, catering inquiry form with the behind-the-scenes walkthrough |
| `bulmat` | Starter | Light, bold sans, red | One-page site, catering by phone |

## Run it

```bash
npm install
```

```bash
npm run dev
```

Opens Hibana at http://localhost:3001. To run another client:

```bash
CLIENT=bulmat npm run dev
```

Requires Node 20.9 or newer.

## Create a client site

### 1. Scaffold the folder

```bash
npm run new-client -- sakura-house --name "Sakura House" --plan premium
```

This creates `clients/sakura-house/` with `site.json`, `menu.json` and an empty `images/` folder.
`--plan` is `starter` (one page) or `premium` (separate pages for menu, gallery, story, catering and contact).

### 2. Fill in `site.json`

Open the file in VS Code (or any editor that reads JSON Schema). It suggests field names and
flags mistakes as you type, because the file points at `schema/site.schema.json`.

| You enter | Where |
| --- | --- |
| Restaurant name, descriptor, tagline | `name`, `descriptor`, `tagline` |
| One or two sentences for Google | `description` (50 to 200 characters) |
| Logo | `logo.image` (a file in `images/`), or `logo.text` for a typeset wordmark |
| Brand colors | `theme.colors.background`, `text`, `accent` (6-digit hex) |
| Typeface style | `theme.fonts`: `editorial`, `modern` or `classic` |
| Corner style, hero layout | `theme.corners`, `theme.hero` (`cinematic` or `split`) |
| Phone, address, parking note | `contact` |
| Opening hours | `hours.regular` (24-hour times; list a day twice for a lunch and dinner split) |
| Holiday hours | `hours.exceptions` (shown automatically for the next six weeks) |
| Online ordering link | `links.order.url` |
| Reservation link | `links.reserve.url` |
| Social links | `links.social` |
| A one-line announcement | `announcement` (hides itself after `until`) |
| Home page text | `hero`, `intro`, `experiences` |
| Catering | `catering` (`form: true` only when the client bought the automation add-on) |
| Story page (Premium) | `about` |
| Common questions | `faq` |

A button appears only when its link exists. No ordering link means no Order button, never a dead one.

### 3. Fill in `menu.json`

Sections, items and prices, typed from the owner's current menu. An item has a `name`, an optional
`description`, and either a `price`, a list of `variants` (sizes) or a `priceText` such as "Market price".
Dietary labels go in `tags`: `v`, `vg`, `gf`, `gfo`, `spicy`, `raw`, `shellfish`, `nuts`, `new`, `house`.
Mark three or four items `"featured": true` to show them on the home page.
Set `"updated"` to the date the owner confirmed the prices.

The menu is always real text, never a PDF: readable on a phone, searchable, and visible to Google.

### 4. Add photos

Put the client's photos in `clients/<slug>/images/` and refer to them by file name, each with
`alt` text that says what the photo shows. Then make them web-ready:

```bash
npm run images -- sakura-house
```

That turns each photo upright, shrinks it, and removes embedded metadata (phone photos often carry
the GPS location where they were taken). Originals are kept in `images/_originals/`, which is never
committed or published.

No photos yet? Leave `image` out and give the slot an `art` motif (`flame`, `nigiri`, `maki`,
`sake`, `bowl`, `grill`, `rings`, `leaf`, `chopsticks`, `fish`, `tongs`, `cup`). The site draws a
designed line-art panel in the brand colors, so it looks finished from day one. Only use photos the
client has the right to use. If a photo needs a credit, list it in `images/credits.json` and a
credits page appears.

### 5. Preview

```bash
CLIENT=sakura-house npm run dev
```

### 6. Check it

```bash
npm run validate -- sakura-house
```

Checks the content against the schema and prints plain-language problems: a photo that is not in
the folder, missing alt text, a malformed time or price, an unknown dietary tag, and color pairs
that fail WCAG AA contrast. Errors stop the build, so unreadable text cannot ship.

Before launch, run the strict version:

```bash
npm run launch-check -- sakura-house
```

It also fails on anything left over from the starter: a placeholder domain, a fictional 555 phone
number, sample wording, or a menu with no confirmed date. A production deployment on Vercel
(`VERCEL_ENV=production`) applies the same strict check automatically; preview deployments do not,
so a client can review a draft before every detail is final.

Then run the browser QA suite for that client (see `../../qa/README.md`), and look at every page
on a real phone. Every client site is tested and approved individually before it goes live.

## What each plan includes

| | Starter | Premium |
| --- | --- | --- |
| Pages | One page: story, full menu, catering, hours and location | Home, Menu, Gallery, Our Story, Catering, Contact |
| Menu | On the home page | Own page with jump-to-section navigation |
| Photo gallery | A strip on the home page (3 or more photos) | Own page with a full-screen viewer |
| Contact form | No (phone, email, directions) | Yes |
| Catering inquiry form | With the automation add-on | With the automation add-on |

Both include the "Open now" badge, holiday hours, the phone-size action bar (Call, Directions,
Order), search-engine details in the format Google reads (schema.org Restaurant and Menu), a
generated link-preview image and icons, a sitemap, and a printable menu.

## Forms and where inquiries go

The contact and catering forms post to `/api/inquiry`. A submission is checked (a signed, timed
token from `/api/form-token`, a honeypot field, a rate limit, then full validation) before anything
is recorded. Where it goes next depends on the environment:

| Driver | When | What happens |
| --- | --- | --- |
| `demo` | Sample sites | Nothing is stored or sent. The page shows what a live site would record and send. |
| `local` | Development | Written to `data/inbox/*.jsonl`, emails saved as text files in `data/outbox/`. |
| `google` | Live clients | Posted to the client's Google Apps Script: a row in their Sheet, an email to the owner, an acknowledgment to the customer. See `../../automation/google-sheets-inbox/`. |

Environment variables for a live client with forms:

```bash
INBOX_GOOGLE_URL=https://script.google.com/macros/s/.../exec
INBOX_GOOGLE_SECRET=the-long-random-secret-from-the-script
```

If a live site has no backend configured, the form says so and shows the phone number. It never
pretends a message was delivered. The site never confirms a booking, a date or a price.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Preview (`CLIENT=<slug>` picks the client) |
| `npm run build` / `npm run start` | Production build and server |
| `npm run new-client -- <slug> --name "..."` | Start a client from the starter |
| `npm run validate -- <slug>` | Check one client (`-- --all` checks every client) |
| `npm run launch-check -- <slug>` | Strict check before going live |
| `npm run images -- <slug>` | Resize photos and strip metadata |
| `npm test` | Unit tests |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm run schemas` | Regenerate `schema/*.json` after changing `src/lib/site/schema.ts` |

To preview two clients side by side, give each build its own output folder:

```bash
CLIENT=hibana NEXT_DIST_DIR=.next-hibana npm run build && NEXT_DIST_DIR=.next-hibana npx next start -p 3001
```

```bash
CLIENT=bulmat NEXT_DIST_DIR=.next-bulmat npm run build && NEXT_DIST_DIR=.next-bulmat npx next start -p 3002
```

## Deploying a client

One hosting project per client, all from this repository. These steps are written for Vercel and
have not been run yet: deployment needs the studio's own hosting account.

1. New project from the repository, Root Directory `restaurant-studio/apps/restaurant`.
2. Environment variables: `CLIENT=<slug>`, `SITE_URL=https://their-domain.com`, and, for clients
   with forms, `INBOX_GOOGLE_URL` and `INBOX_GOOGLE_SECRET`. Optional: `NEXT_PUBLIC_STUDIO_NAME`
   and `NEXT_PUBLIC_STUDIO_URL` for the footer credit, `FORM_SECRET` (32 or more random characters)
   if the site ever runs as more than one build at a time.
3. Deploy, review the preview address with the client, then add their domain.

See `../../docs/launch/02-hosting-and-deployment.md` and `../../docs/operations/06-deploying.md`.

## Updating a live site

Menu or hours changed? Edit the client's JSON, run `npm run validate -- <slug>`, commit, and the
host redeploys. A menu price change is a two-minute job.

## How it is put together

```
clients/<slug>/            a client's content: site.json, menu.json, images/
clients/_starter/          what a new client starts from
schema/                    JSON Schema for editor autocomplete (generated)
scripts/prepare-client.ts  validates a client and points the app at it (runs before dev, build, test)
src/lib/site/              schema, theme and contrast checks, hours logic, SEO data
src/lib/forms/             form definitions and validation, shared by browser and server
src/lib/inbox/             the inquiry pipeline (shared with the agency site, kept identical by ../../scripts/sync-shared.mjs)
src/components/            header, footer, sections, menu, gallery, forms
src/app/                   pages and the two API routes
tests/                     unit tests
```

`scripts/prepare-client.ts` writes `src/generated/client.ts`, which imports the chosen client's
JSON and only the photos that client uses. One client's photos are never published on another
client's site.

Built on Next.js 16 with Cache Components, React 19, Tailwind CSS 4 and TypeScript. Pages are
prerendered and refreshed hourly so that date-dependent details stay current.
