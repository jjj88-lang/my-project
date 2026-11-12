# 09. Maintenance

The plan: $59 a month, month to month, 30 days' notice to cancel. It covers hosting on the studio's account, up to 60 minutes of small changes a month, software and security updates, and monitoring. Replies within 2 business days, 1 business day if the site is down. Full terms: `legal/maintenance-terms.md`.

## The monthly routine (under an hour per client, first week of the month)

This is your own upkeep. It does not use the client's 60 minutes.

**Once for all clients (about 30 minutes):**

- [ ] Stripe: every maintenance subscription paid. A failed payment: `05-collecting-payment.md`.
- [ ] Vercel: usage on the team is within the plan, no failed production deployments, no warnings.
- [ ] Template updates. In `apps/restaurant`: `npm outdated`. Apply security and patch updates, then `npm test` and `npm run validate -- --all`. Skip major version upgrades during the semester unless there is a security reason; plan them for a break.

**Per client (10 to 20 minutes each):**

- [ ] Open the site on your phone. Home, menu, hours and contact load, with the padlock.
- [ ] Holiday hours for the next six weeks are in `hours.exceptions`. Ask the owner if you don't know them.
- [ ] Announcement: still current, or expired as intended.
- [ ] Order and Reserve buttons still reach the restaurant's real pages (ordering companies change links).
- [ ] Form sites: one test submission labelled TEST reaches the owner's Sheet and email. Tell the owner the day before, or skip it if a real inquiry arrived this month.
- [ ] After any template update: `CLIENT=<slug> npm run qa` in `restaurant-studio/qa` passes.
- [ ] Domain renewal date (ask the owner once a year, note it in `log.md`). Remind them 30 days before. It renews in their account, at their cost.
- [ ] Log the routine in `log.md`: date, "monthly check", anything found.

## Taking change requests

- Requests come by email to the studio address. A text is fine too: reply by email with the request written out, so there is one record.
- Reply within 2 business days with what you will do and when. If it will take you past the client's 60 minutes this month, say so and give an estimate first. Extra time is $60 per hour (minimum 30 minutes), only after they approve.
- Make the change, run `npm run validate -- <slug>`, look at it on your phone, push it. Reply "Done" with a link to the page.

**What the 60 minutes cover:** menu items, prices, hours, photos, announcements and similar small edits. **Not covered:** new pages or sections, a redesign, new features, writing large amounts of text, translation, photography, logo design, the ordering or reservation system itself, advertising, social media, SEO campaigns, email accounts, the domain fee.

Fixing a problem you caused never uses their minutes. Unused minutes do not carry over (owner to confirm, as marked in the maintenance terms).

## The change log

One file per client, `private/clients/<slug>/maintenance-log.csv`, one line per request:

```csv
date,requested_by,request,minutes,billable_extra,done
2026-12-03,Owner by email,"Lunch special price $11 to $12",5,no,2026-12-03
```

Count real minutes. Total the month on the last day. If the owner asks for the log, send it.

## Response times

| Situation | Reply within |
| --- | --- |
| Site down, or a wrong price or wrong hours live | 1 business day (in practice: the same day if you can) |
| Any other request | 2 business days |

A reply means a real answer and a plan, not always the finished change. If you will be unavailable for more than two business days (exams, travel), tell every maintenance client in advance, with dates and how an outage will be handled (`weekly-rhythm.md`).
