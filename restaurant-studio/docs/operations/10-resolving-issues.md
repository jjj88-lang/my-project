# 10. Resolving issues

First rule for everything on this page: reply quickly, say what you know and what you will do next, and write it in `log.md`. Never argue in writing; call instead.

## The site is down

1. **Check from two places:** your phone on mobile data and your laptop. If only one fails, it is probably the network, not the site.
2. **Check the Vercel dashboard:** the project's latest production deployment, and the Vercel status page. A failed or bad deployment: roll back (`06-deploying.md`, Rollback).
3. **Check the domain:** does the `.vercel.app` address work while the domain does not? Then it is DNS or the domain itself. Ask the owner whether the domain renewal went through, or whether anyone changed DNS records recently (a new email provider, a new ordering system).
4. **Tell the owner within 1 business day**, even before it is fixed:

   > Your website isn't loading right now. I'm on it. The cause looks like [plain words]. I'll update you by [time]. Guests can still call you and find you on Google.

5. After the fix: one message with what happened and what you changed so it does not recur. Your fault means no charge and no minutes used.

## A wrong price, wrong hours or a wrong dish on the live site

Treat it like an outage. Guests will hold the owner to the price they saw.

1. Fix it now: edit `menu.json` or `site.json`, `npm run validate -- <slug>`, push, check on your phone.
2. Tell the owner, plainly:

   > I found a mistake on your menu: the [item] showed $[wrong] instead of $[right]. It's fixed as of [time]. I'm sorry about that. I've rechecked the rest of the menu against the copy you sent me.

3. Recheck every price against their confirmed menu. Your mistake is free; their menu change is a normal maintenance request.

## An unhappy client

1. Call, don't type. Ask what is wrong and listen to the end. Take notes.
2. Say back what you heard, in one sentence. Separate what you can fix from what you cannot.
3. Offer something specific with a date: "I'll redo the menu layout by Thursday and send it to you."
4. If the complaint is about results ("the site isn't bringing in customers"): be honest. The studio never promised more customers or sales (section 15 of the agreement). Offer what helps: check that their Google Business Profile links to the site, that the menu and hours are current, and that the Order button works.
5. Follow up in writing with what you agreed.

## A refund request

Follow section 7 of `legal/service-agreement.md`. Decide by the facts, not by how uncomfortable the conversation is.

| When | What happens |
| --- | --- |
| Before work began | Full deposit refund |
| After work began, before the first draft | Deposit minus time spent at $60 per hour, with your written time record (owner to confirm this step, as marked in the agreement) |
| After the first draft was delivered | The deposit is kept |
| The studio cannot deliver the site in the statement of work | Everything paid for the project is refunded |

If the case is close or the relationship matters more than the money, a partial refund is allowed: it is your choice, not the client's right. Issue refunds from Stripe (`tools/stripe/README.md` section 6), to the same card, within the period in the agreement. CRM Payment status **Refunded**, with amount and date. Confirm in writing.

## A chargeback (dispute)

1. Stripe emails you and the payment shows **Disputed**. Note the response deadline Stripe shows.
2. Contact the client directly and kindly. It is often "I didn't recognize the charge". If so, ask them to withdraw it with their bank.
3. If not, respond in the Stripe Dashboard before the deadline with the signed agreement, statement of work, written approval, proof of delivery (the live site, the launch message) and the receipt. Factual, no adjectives. Steps: `tools/stripe/README.md` section 7.
4. Never ignore a dispute: an unanswered one is lost automatically. Stripe also charges a dispute fee; check https://stripe.com/pricing.

## A client who goes silent

| Stage | What to do |
| --- | --- |
| Materials not arriving | `02-collecting-materials.md` (pause after 30 days) |
| No feedback on a draft | Reminders after 5 and 10 business days. After that, one message: "I'll keep the preview ready; send changes or your approval whenever you're ready." Then stop chasing, and free the build slot. |
| Approved, balance unpaid | `05-collecting-payment.md`. The site does not launch until paid. |
| On maintenance, not answering | Keep the site running while the plan is paid. Never change content without their go-ahead, except to remove something wrong. |
