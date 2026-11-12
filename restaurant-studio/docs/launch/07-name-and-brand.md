# 07. Name and brand

"Sidework Studio" is a working name. Sidework is the prep restaurant staff do before and after
service, which is the idea: the behind-the-scenes work an owner should not have to think about.
Keep it or replace it, but check it before you buy a domain or print anything.

## How to check a name (about an hour)

Write each result and the date in your notes. Web addresses marked "from memory" were not opened
by the team: if one is wrong, search the agency's name and use its official site.

- [ ] **Say it out loud.** Over the phone, in a noisy kitchen. If you have to spell it twice, it is
      the wrong name.
- [ ] **Kansas business search.** Is another business using it? Kansas Secretary of State business
      entity search, from https://sos.ks.gov/ (from memory).
- [ ] **New York business search.** New York Department of State corporation and business entity
      database, from https://dos.ny.gov/ (from memory). Also ask the Tompkins County Clerk whether
      the name appears in its assumed-name records.
- [ ] **Trademark search.** USPTO trademark search, from https://www.uspto.gov/trademarks/search
      (from memory). Look for the same or a similar name used for web design or marketing
      services. A match in an unrelated field matters less; a match in our field means pick another
      name. This is a first look, not a clearance: an attorney gives you that.
- [ ] **Domain.** Is the .com free at the registrar? Avoid hyphens and odd spellings
      (`03-domain-and-email.md`).
- [ ] **Handles.** Instagram, Facebook and a Google Business Profile name. Matching handles are
      nice, not essential.
- [ ] **Search engines.** Search the name plus "restaurant" and plus "web design". Make sure
      nothing embarrassing or confusing comes up.

## Where to change it

The name lives in one place: `config/studio.json`.

1. Edit `name` (and `url` and `email` if they change). Set `"nameIsTemporary": false` once it is
   final.
2. From `restaurant-studio/`, run `node scripts/sync-shared.mjs`. It copies the file into the agency
   site. `node scripts/sync-shared.mjs --check` confirms the copies match.
3. In `apps/agency`, run `npm run preflight`.
4. On each client's Vercel project, set `NEXT_PUBLIC_STUDIO_NAME` and `NEXT_PUBLIC_STUDIO_URL`
   (the footer credit). Without them the template falls back to "Sidework Studio".

A few files still spell out the working name and need a manual edit (as of 2026-11-12):

- `apps/agency/src/app/about/page.tsx` (a heading that explains the word "sidework")
- `apps/restaurant/src/lib/studio.ts` (the fallback above)
- `tools/invoice/invoice.html`, `sales/print/one-pager.html`, `sales/README.md`,
  `sales/08-proposal-template.md`, `legal/service-agreement.md`, `tools/stripe/README.md`

Find any others with `grep -rn "Sidework" --exclude-dir=node_modules .` from `restaurant-studio/`.

## Brand, kept simple

- No logo is needed to launch. The name set in a clean typeface is enough.
- Describe what you do in plain words: websites for independent restaurants. Do not borrow the
  look of a restaurant brand you admire, and never use a real restaurant's name or photos as an
  example. The samples are fictional and always labeled "sample concept".
