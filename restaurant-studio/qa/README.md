# QA suite

The checks every client site must pass before it goes live, and again after any change.
It drives a real browser (Playwright with Chromium) at desktop and phone size, and it reads the
client's own `site.json` and `menu.json`, so it tests the built site against its source of truth:
if the phone number on the page ever differs from the one in the file, a test fails.

## Run it

```bash
npm install
```

```bash
npx playwright install chromium
```

Then, for one client:

```bash
CLIENT=hibana npm run qa
```

That builds the client into its own folder (`apps/restaurant/.next-qa-<client>`), starts it on port
3210, runs everything, and stops it. Expect about two minutes. Results land in `reports/<client>/`:

| File | What it is |
| --- | --- |
| `html/index.html` | The full report. Open it in a browser, or run `npm run qa:report`. |
| `screens/desktop/*.png`, `screens/phone/*.png` | A full-page picture of every page, as tested. Keep these with the client's approval. |
| `results.json` | The same results for scripts. |

To test a site that is already running, such as a preview deployment, give its address:

```bash
CLIENT=hibana QA_BASE_URL=https://preview-address.example npm run qa
```

A QA run can never touch a restaurant's real spreadsheet or email its customers: sample sites use
the preview-only "demo" driver, and real clients are built with the "local" driver, which writes to
files in `apps/restaurant/data/`.

## What it checks

| Area | Checks |
| --- | --- |
| Every page | Loads with status 200, one main heading, a title and description of sensible length, no script errors, no console errors, no failed requests, no sideways scrolling at 360, 390, 768 and 1440 px, every image loads and has alt text |
| The facts | Phone number and every tap-to-call link, address, directions link, opening hours, holiday hours, the "Open now" badge, the sample-concept label, the announcement and its end date |
| The menu | Every section, item, description and price from `menu.json` is on the page; the small print; no PDF |
| Buttons | Order and Reserve open the client's real link, or (sample sites) an explanation, or are absent. Never a dead button |
| Search engines | robots.txt, noindex on sample sites, sitemap, canonical addresses, schema.org Restaurant and Menu data, link-preview image, icons, manifest |
| Security | Protective response headers, and no page loads anything from another site |
| Accessibility | axe-core (WCAG 2.1 A and AA) with no serious or critical findings on any page, with the phone menu open, and with form errors showing; heading order; skip link; named links and buttons; tap-target size; keyboard use of the menu and the questions |
| Navigation | Every menu link, the phone menu, the menu's section links, the printed menu, the photo viewer, and every link on every page |
| Forms | Error messages before anything is sent, a successful request, and the endpoint's defenses: required token, forged and reused tokens, the hidden trap field, the notice period and party size, malformed, oversized and cross-site requests, the rate limit |

Current results: Hibana (Premium) 97 passed, Bulmat (Starter) 66 passed, none failed. Tests that do
not apply to a client's plan are skipped, which is why the counts differ.

## What it cannot check

A passing run is necessary, not sufficient. Before a launch a person still has to:

1. Read every menu item and price against the owner's current menu. The suite proves the page
   matches the file, not that the file matches the restaurant.
2. Open the site on a real phone: call the number, open the directions, tap Order and Reserve and
   confirm they reach the restaurant's real accounts.
3. Look at every page. Tests do not notice an unflattering photo or an awkward line break.
4. Send one real catering request on the live site and confirm the row, the owner's email and the
   customer's acknowledgment (see `../automation/google-sheets-inbox/README.md`).
5. Get the owner's approval in writing.

## Layout

```
playwright.config.ts   two browsers (desktop, phone), the build-and-serve step, report locations
lib/client.ts          reads the client's files and works out what the site should contain
lib/fixtures.ts        fails any test that produces console errors or failed requests; axe helper
tests/*.spec.ts        pages, content, seo, a11y, navigation, forms
```

The suite pins Playwright 1.63.0. If a check fails, the report shows the page, the expectation and
a screenshot taken at the moment of failure.
