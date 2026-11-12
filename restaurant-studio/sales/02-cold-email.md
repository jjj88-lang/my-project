# 02. The first email

Use email when a visit or call is not practical. Send it only to the email address the restaurant publishes, and only after you have done the phone check in [01](01-prospect-research.md).

## Before you send any email (one-time setup)

You need a physical mailing address for the footer. A registered PO box or a private mailbox (virtual mailbox) is widely understood to be acceptable to the FTC, but confirm it on the FTC guide before relying on it: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business. Put it in `config/studio.json` as `mailingAddress`.

## The rules (CAN-SPAM, short version)

The FTC guide says the law makes no exception for business-to-business email. Every email must:

- Use accurate From, To and Reply-To information (your real name and address).
- Have a subject line that matches the message. No "Re:" on a first email, no fake urgency.
- Make clear it is a sales message. Saying plainly what you offer does this.
- Include your valid physical postal address.
- Give a clear way to opt out, keep it working for at least 30 days, and honor it within 10 business days. Do it the same day. Asking for a reply is enough; never charge or ask for more than their email address.

Penalties are per email and large. One email at a time, written by you, keeps you far from trouble.

## Shape of a good first email

- Under about 120 words.
- One specific thing you saw on your phone.
- One modest suggestion.
- One easy next step.
- The footer below.

## Variation A: menu hard to read

**Subject:** Your menu on a phone, and a small idea

Hi {{restaurant}} team,

I'm {{your_name}}. I build simple websites for independent restaurants in {{city}}. Last week I looked up your menu on my phone and {{observation}}.

A menu written as real text, with prices, reads easily on any phone and is easy to update. I put together a sample restaurant site so you can see what I mean: {{demo_url}}

If it's useful, I'm happy to stop by between lunch and dinner and show you on my phone. Five minutes, no obligation.

Thanks for reading,
{{your_name}}

## Variation B: no website, only a Facebook page

**Subject:** A simple website for {{restaurant}}

Hi {{restaurant}} team,

I'm {{your_name}}, a local student who builds websites for independent restaurants. When I searched for {{restaurant}} on my phone, {{observation}}.

A one-page site with your menu, hours, a tap-to-call button and directions gives guests one place to check before they come in. It costs {{starter_price}}, you own the domain, and you can see a sample here: {{demo_url}}

Would a quick look in person be helpful? Reply with a good afternoon and I'll come by.

{{your_name}}

## Variation C: catering by phone only

**Subject:** Catering requests on your website

Hi {{restaurant}} team,

I'm {{your_name}}. I noticed on my phone that {{observation}}.

I set up a simple catering form that saves each request to a Google Sheet you own, emails you the details, and tells the customer the request arrived. It never confirms a date or price for you. That stays your call.

If you'd like to see how it works, I can show you in five minutes.

{{your_name}}

## Footer (paste under every email)

```
{{your_name}}, {{studio_name}}
{{studio_email}} · {{studio_phone}}
{{mailing_address}}

You're getting this because {{restaurant}}'s email is listed publicly. I'm writing to you only, not to a list. If you'd rather not hear from me, reply "no thanks" and I won't contact you again.
```

After sending: set Outreach status to "Emailed", Last contact to today, Next follow-up to four business days out. If they opt out, set "Do not contact" the same day.
