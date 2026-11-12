# Agency site: notes for the next engineer

State on 2026-11-12: lint, typecheck, 119 unit tests and the production build pass. Only the home page exists.

## Design system (src/app/globals.css; colors mirrored in src/lib/design/palette.ts)
- Colors: paper `#f6f0e4`, paper-deep `#ece3d0`, card `#fcf8ef`, ink `#1b1814`, ink-soft `#58544e`, ink-faint `#67625b`, accent `#b5350f`, accent-deep `#96290a`, band `#17231c`, band-raised `#27312a`, on-band `#f6f0e4`, on-band-soft `#b8b7ac`, accent-on-band `#f2946b`, field `#757068`, danger `#9b1c1c`, success `#1f5c43`. Hairlines: `rule` (ink 15%), `rule-strong` (32%), `rule-on-band`.
- Tailwind's default palette is off: only these exist (`bg-paper-deep`, `text-ink-soft`, `border-rule`). A new text and background pair goes into `PAIRS` in palette.ts; test/contrast.test.ts checks AA and that the two files agree.
- Type: Fraunces for headlines (`.display` plus `.display-xl|lg|md|sm`; an `<em>` inside is italic and accent), Instrument Sans for body (17px, `.lead` for intros), IBM Plex Mono for labels and figures (`.eyebrow`, `.mono-note`, `font-mono`, `.nums`).
- Layout: `.shell` (container and gutter), `lg:grid-cols-12 lg:gap-x-8`, sections `py-20 md:py-28`, alternate with `bg-paper-deep`. Dark band: `on-band bg-band text-on-band`. Accent band: `on-accent bg-accent text-card`. Those two classes switch eyebrow, link and focus colors.
- Controls: `.btn` with `.btn-primary|ghost|on-band|ghost-on-band|on-accent|ghost-on-accent` and `.btn-sm`; `.link`, `.link-arrow`; forms `.field-label|input|help|error`, `.choice`.
- Motion: `.enter` (first paint, stagger with `style={{ "--i": n }}`) and `.reveal` (CSS scroll reveal). Both do nothing under reduced motion.
- Write custom classes inside `@layer components`, or they beat utilities such as `hidden`.

## Components (src/components)
- `layout/Header`, `Footer`, `Wordmark`: in the root layout already. Navigation lives in src/lib/nav.ts.
- `ui/PageIntro eyebrow title [aside]`: the opening of an inner page. `ui/Icon name=arrow|arrowUpRight|check|menu|close|phone|mail|lock`. `ui/JsonLd data`.
- `pricing/PriceMenu`: `MenuLine name price [unit unitShort]` (dotted leader), `MenuSectionTitle`, `IncludesList items [columns]`, `PriceMenuBrief` (home). `pricing/GuestCheck [check]`: totals from `guestCheck([...])` in src/lib/pricing.ts.
- `process/Tickets steps={PROCESS_STEPS}`; steps and the materials checklist are in src/content/process.ts.
- `sections/FaqList items` (src/content/faq.ts, 17 answers with ids for `/faq#id`), `sections/ClosingCta [title] [showWorkLink]`.
- `work/Devices`: `BrowserFrame image alt address sizes`, `PhoneFrame image alt sizes`, `SampleTag`. Images come from `shot(demo, page, device)` in src/lib/work/shots.ts and may be undefined: leave the frame out. `work/BehindTheScenes`: the catering flow, built for a dark band.
- `forms/LeadForm email phone phoneHref replyTime`: the whole contact form. Give it `contactEmail`, `contactPhone` (src/lib/studio.ts, undefined while placeholders) and `INQUIRY_REPLY_TIME` (src/content/facts.ts).
- Helpers: `money`, `depositOf`, `exampleCheck` (pricing.ts); `pageMetadata({ title, description, path, noindex })` (seo.ts); `demoUrls` (demos.ts); `resolveStripeLinks()` (stripe-links.ts); `smart()` for curly quotes in JSON text (text.ts).

## Finished
- Home page, checked at 360 to 1920 px: no overflow, no console errors, axe clean, mobile menu and keyboard order tested.
- Lead capture: POST /api/form-token and /api/lead (src/lib/lead/server.ts), tested with the local driver over HTTP in dev and in a production build, and `LeadForm` tested in a browser on a throwaway page (errors, focus, success with reference, keyboard only, unconfigured).
- Tests in test/: lead-definition, lead-route, contrast, content (pricing math, FAQ, helpers). `.env.example` lists every variable.

## Left to do
- Pages: /services /work /process /about /faq /contact /pay /thanks /privacy /terms, then not-found, error, robots, sitemap, manifest, icons, Open Graph image.
- scripts/preflight.ts and scripts/capture-work.cjs (their npm scripts exist), tests for stripe-links, demos and shots, README.md (still the scaffold's).

## Things that will bite
- `typedRoutes` switches itself on in next.config.ts once all ten pages exist. From then on a mistyped `href` fails `npm run typecheck`.
- `import.meta.glob` in shots.ts: never add `import: "default"`. It works in dev and silently drops every screenshot from a production build.
- `next start` is production: the form reports "not connected" unless `INBOX_DRIVER=local` (writes to data/) or the Google variables are set.
- `npm run review -- --axe / /services` screenshots pages into .review/ at 1440 and 390 px and reports overflow, console errors, small tap targets and axe findings. Full-page shots need reduced motion (the script sets it), or everything below the first screen is blank.
- Never edit src/content/*.json or src/lib/inbox: they are copies (node ../../scripts/sync-shared.mjs).
