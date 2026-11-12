# 04. Review and approval

Goal: the owner never finds a mistake you could have found yourself, and you hold their approval in writing before launch.

## 1. Internal review (before the owner sees anything)

Do this with the source menu open beside the site, on a laptop and on your own phone. Allow 45 minutes.

- [ ] **Every price** against the owner's menu, item by item. Tick each one off on a printout or a copy of the photo. The QA suite proves the page matches `menu.json`; only you can prove `menu.json` matches the restaurant.
- [ ] **Dish names spelled** exactly as the owner spells them, including Japanese and Korean names (nigiri, omakase, galbi, bulgogi, banchan). Use the owner's spelling, not a dictionary's.
- [ ] **Sizes, variants, "Market price"** items and dietary tags match what the owner confirmed.
- [ ] **Hours** for every day, the lunch and dinner split, and the "Open now" label at a time you know is open and one you know is closed.
- [ ] **Phone:** tap it on your phone. It must dial the restaurant. Hang up before it connects if the restaurant is in service.
- [ ] **Directions:** tap it. The map must open on the right building.
- [ ] **Order and Reserve buttons:** tap each. They must land on this restaurant's real page in its own system, not a search page.
- [ ] **Social links** open the right accounts.
- [ ] **Text:** read every sentence once. No claims you cannot back up, no leftover sample wording.
- [ ] **Photos:** each one is the restaurant's own or licensed, and its alt text says what it shows.
- [ ] **Phone and desktop:** every page at phone width and at laptop width. Look for awkward line breaks and cut-off buttons.
- [ ] **Forms** (Premium contact form, catering form): submit once in preview and check the page says what it will do. Live delivery is tested at launch.
- [ ] `npm run validate -- <slug>` passes.

Anything wrong is your fix, and it never counts as a revision round.

## 2. Send the preview link

The owner reviews a preview deployment: a separate web address, not the live site and not listed anywhere. Treat it as unlisted, not secret. How to make one is in `docs/launch/02-hosting-and-deployment.md` (not yet run on the studio's account: check it works the first time with a sample site before you send a client a link).

> Hi [Owner name], your first draft is ready: [preview link]
>
> Please look at it on your phone, the way a guest would. Check every price and your hours especially.
>
> When you're ready, send me **one message** with every change you'd like. That's revision round one of two. A list is perfect, for example: "Menu: Spicy tuna roll is $9 not $8. Home: use the second photo."
>
> Anything that is my mistake, I fix for free and it doesn't count as a round.

- [ ] Before sending, open the link in a private browser window. If it asks for a login, change the project's preview protection setting (confirm where in the Vercel dashboard the first time).
- [ ] Log the date sent. Revision handling is in `08-revisions.md`.

## 3. Get written approval

When the last round is done and the owner is happy, ask for approval in words that leave no doubt:

> Here is the final version: [preview link]. If everything is right, please reply "Approved for launch". Once I have that, I'll send the balance link, and the site goes live after it's paid.

- [ ] An email or text that says so is enough (section 5 of the agreement). "Looks good" is not approval: ask once more, politely.
- [ ] Save a copy or screenshot in `private/clients/<slug>/approvals/` with the date.
- [ ] CRM: note the approval date. Then send the balance link (`05-collecting-payment.md`).

If the owner asks for a change after approving, make it if it is small, then ask for approval of the changed version.
