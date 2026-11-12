# 03. Building the site

Goal: a first draft that passes validation, on time (5 business days for Starter, 7 for Premium, counted from the day you have the menu, hours, address and phone). Plan on roughly 4 to 8 hours of work per site (an estimate: log your real times and adjust).

All commands run in `restaurant-studio/apps/restaurant`. The template's own README (`apps/restaurant/README.md`) has the full field table; this page is the order of work. Keep `clients/hibana/` (Premium sample) and `clients/bulmat/` (Starter sample) open beside you: copying a pattern from them is faster than starting blank.

## 1. Create the client

```bash
npm run new-client -- <slug> --name "Restaurant Name" --plan starter
```

`--plan premium` for the Premium Website. This creates `clients/<slug>/` with `site.json`, `menu.json` and an empty `images/` folder. Open the folder in VS Code: it suggests field names and flags mistakes as you type.

## 2. Fill in `site.json` (top to bottom)

- [ ] `plan`: `starter` or `premium`, matching the signed statement of work. `sample` stays `false` for every real client (it adds the "Sample concept" label and hides the site from search engines).
- [ ] `name`, `descriptor` (for example "Hibachi & Sushi"), `tagline`, `cuisines`, `priceRange`.
- [ ] `description`: one or two plain sentences for Google, 50 to 200 characters.
- [ ] `logo`: `image` (a file in `images/`) with `imageAlt`, or `text` for a typeset wordmark, optionally with a line-art `mark`.
- [ ] `theme.colors`: `background`, `text`, `accent` as 6-digit hex. `theme.fonts`: `editorial`, `modern` or `classic`. `theme.corners`: `sharp`, `soft` or `round`.
- [ ] `contact`: `phone` exactly as guests should see it, `address` (street, city, two-letter state, ZIP), optional public `email`, `neighborhood`, `parking`.
- [ ] `hours.regular`: 24-hour times. List a day twice for a lunch and dinner split. Holiday closures go in `hours.exceptions`; extra lines in `hours.notes`.
- [ ] `links.order.url` and `links.reserve.url`: the systems the restaurant already uses. No link means no button, never a dead one. `links.social` for Instagram, Facebook, TikTok, Yelp, Google.
- [ ] `announcement` (optional): one line, up to 140 characters, with an `until` date so it hides itself.
- [ ] `hero`, `intro`, `experiences`: the owner's words where possible. Plain and specific. No claims you cannot check ("best sushi in town").
- [ ] `catering`: set `form: true` only when the client bought the Catering Inquiry Automation.
- [ ] Premium only: `about` (the story page), `gallery`.
- [ ] `faq`: questions the owner told you guests ask.

## 3. Fill in `menu.json`

- [ ] One section per menu heading, in the owner's order. Use `availability` for "Lunch, Monday to Friday" and `note` for small print.
- [ ] Each item: `name`, optional `description`, and one of `price` (a number, such as `12.5`), `variants` (sizes) or `priceText` (such as "Market price").
- [ ] Dietary `tags` only when the owner confirmed them: `v`, `vg`, `gf`, `gfo`, `spicy`, `raw`, `shellfish`, `nuts`, `new`, `house`.
- [ ] Three or four items `"featured": true` for the home page.
- [ ] `notes` for the advisory and allergen wording the owner gave you, word for word.
- [ ] `updated`: the date the owner confirmed the prices (`02-collecting-materials.md`).

## 4. Photos

- [ ] Copy usable photos into `clients/<slug>/images/`, then run `npm run images -- <slug>`. It turns them upright, shrinks them and strips location metadata. Originals stay in `images/_originals/`, which is never committed.
- [ ] Every photo gets `alt` text that says what it shows ("Salmon nigiri on a slate plate"), not "image" or the file name.
- [ ] No photo for a slot: leave `image` out and set `art` to a motif (`flame`, `nigiri`, `maki`, `sake`, `bowl`, `grill`, `rings`, `leaf`, `chopsticks`, `fish`, `tongs`, `cup`).
- [ ] A licensed photo that needs a credit goes in `images/credits.json`.

## 5. Colors and contrast

The validator fails any text and background pair below WCAG AA contrast. If the brand color fails:

1. Keep the owner's color as `accent` and set `accentText` to black or white, whichever passes.
2. If it still fails, use a darker or lighter shade of the same color and tell the owner why in the draft message.

## 6. Preview and validate

```bash
CLIENT=<slug> npm run dev          # preview at http://localhost:3001
npm run validate -- <slug>         # content, photos, alt text, contrast
npm test                           # unit tests, after any change to the template itself
```

Fix every error the validator prints. It explains each one in plain words.

## 7. Before you call it a draft

- [ ] `npm run validate -- <slug>` passes.
- [ ] You looked at every page at phone width in the browser's device view.
- [ ] Move on to `04-review-and-approval.md`. The strict `npm run launch-check -- <slug>` and the QA suite come before launch; a draft may still contain placeholders.
