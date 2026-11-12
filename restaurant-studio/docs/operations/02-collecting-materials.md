# 02. Collecting materials

Goal: everything needed to build, in one place, by the materials due date in the statement of work (kickoff plus 10 days). The schedule starts when you have everything.

## The materials request (ready to send)

Paste this into the kickoff message. The same list, formatted for the owner, is in `sales/11-onboarding-checklist.md`.

> **What I need from you**
> Reply to this email or text me photos, whichever is easier. Send what you have; we can fill gaps together.
>
> 1. **Your current menu with prices.** A Word file, a spreadsheet, a PDF or clear photos of the printed menu. Tell me anything seasonal or that changes often.
> 2. **Hours,** including lunch and dinner splits, days you close early, and holiday closures you already know about.
> 3. **The address and the phone number guests should call.**
> 4. **Your logo,** the original file if you have one. A straight-on photo of your sign works too.
> 5. **Photos you have the right to use:** your own, or ones a staff member or photographer took for you. Please don't send photos from Yelp, Google reviews or other people's social media. No photos is fine: the site is designed to look finished without them.
> 6. **Your ordering and reservation links,** exactly as you use them now.
> 7. **Your domain name,** if you have one, and which company it is registered with. If you don't have one, we'll register it together in your name.
> 8. **Catering add-on only:** a Google account that belongs to the restaurant.
> 9. **Anything guests ask you often:** parking, private parties, dietary questions, your story.
> 10. **One person** who answers my questions and approves the site.
>
> Please don't send passwords by email or text. If I need something changed in an account, we'll do it together on a short call.

## Handling what arrives

- [ ] Save every file, unchanged, in `private/clients/<slug>/materials/`. Name photos of the menu `menu-01.jpg`, `menu-02.jpg` and so on.
- [ ] Log what arrived and what is missing in `private/clients/<slug>/log.md`.

**Menus that arrive as photos or a PDF**

1. Type the menu into `menu.json` by hand, section by section. If the PDF has selectable text, copy it, then fix spacing and prices by hand.
2. Keep a list of anything you cannot read or that looks inconsistent (a price that differs between two pages, an item with no price). Never guess a price.
3. Send the owner a plain "menu proof": every section, item and price as a list in the message body, with your questions at the top. Ask them to reply "correct" or send fixes.
4. When they confirm, set `"updated"` in `menu.json` to that date. The launch check fails without it.
5. Ask whether any raw or undercooked items need the advisory their health department requires. You copy their wording; you do not write it for them (section 11 of the agreement).

**Photo rights**

- Fine: photos the owner or their staff took, photos a photographer took for the restaurant with permission to use them online, licensed images listed in `images/credits.json`.
- Not fine: photos from review sites, Google Maps, other people's social media, other restaurants, or search results.
- When you are not sure, leave the photo out and use a line-art motif instead (`03-building-the-site.md`). Ask in writing and save the answer in `log.md`.

**Logo**

- A vector or large PNG is best. A photo of the sign can be used as a reference, but do not trace or redraw a logo; that is logo design, which is not included. Use the typeset wordmark (`logo.text`) instead.

## When materials stall

| When | What you do |
| --- | --- |
| 5 days before the due date | Friendly reminder listing only what is still missing. |
| Due date | Short call or visit at a quiet time (mid-afternoon). Offer to collect the menu as photos on the spot. |
| Due date plus 7 days | Offer to start with what you have. The first-draft clock starts when the menu, hours, address and phone are in. Missing photos and logo never block a draft. |
| 30 days late | Under section 2 of the agreement you may pause. Send the message below and log it. |

> Hi [Owner name], I know how busy service gets. I've paused your project for now so it isn't hanging over you. Whenever you send the menu and hours, I'll restart and give you a new first-draft date. Your deposit stays on account for the project.

Do not keep chasing after the pause message. Put a reminder in your calendar to check in once, a month later.
