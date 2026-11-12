# 03. Domain and email

Settle the name first (`07-name-and-brand.md`). A domain bought for a name you then drop is $11 to
$20 wasted, and a year of renewals you forget to cancel.

## Register the studio domain

1. Pick a short .com you can say over the phone without spelling it. Check it is free at the
   registrar, and check the social handles at the same time (`07-name-and-brand.md`).
2. Register it at a registrar that does not raise the price at renewal. As of November 2026:
   Cloudflare Registrar $11.17/year (https://pricing.registrar.cloudflare.com/), Porkbun
   $11.81/year (https://porkbun.com/tld/com). Namecheap renews at $20.18 (source in `01`).
3. Register it in your own legal name, with your own email. Turn on auto-renew and two-factor login.
4. Decline extras: privacy protection is usually included free at these two; skip paid email,
   website builders and SSL bundles (Vercel provides the certificate). Owner to confirm what each
   checkout offers.

To confirm: Cloudflare Registrar may require the domain's DNS to be managed by Cloudflare. That
suits the plan below, since Email Routing also runs there.

## DNS basics you will use on every client launch

DNS is the address book that sends a domain to a server. A registrar holds the domain; its DNS
settings hold the records.

| Record | What it does | When you touch it |
|---|---|---|
| A | Points the bare domain (`their-domain.com`) to an IP address | Connecting a site |
| CNAME | Points a name (`www.their-domain.com`) to another name | Connecting a site |
| MX | Says where the domain's email goes | Never on a client domain, unless that is the job |
| TXT | Proof of ownership, email authentication | When Vercel or an email service asks |

Rules for client domains:

- Never type record values from memory. Vercel shows the exact records under Project > Settings >
  Domains. Copy them from there.
- Add records; do not change nameservers. Changing nameservers moves all of the client's DNS,
  including their email, and can break it.
- Before you change anything, screenshot the existing records and save the image in the client's
  private folder. That screenshot is your undo.
- Best: the owner logs in and you enter the records together on a call, or they add you as a
  delegate if the registrar offers it. Never ask for their password.
- Changes can take from minutes to hours to show everywhere. Launch early in the day.

## A professional email address

You need one address on the studio domain, for example `hello@yourdomain.com`.

**Start: Cloudflare Email Routing (free).** Mail to `hello@` forwards to an inbox you already
have. Free on all Cloudflare plans, 200 forwarding rules per domain
(https://developers.cloudflare.com/email-service/platform/limits/, as of November 2026).
The catch: it only receives. Replies go out from your personal address unless you set up sending
separately. To confirm: whether Gmail's "Send mail as" works for your setup without a paid
sending service.

**When clients sign: Google Workspace Business Starter.** $7/user/month on an annual plan, $8.40
monthly (https://workspace.google.com/pricing, as of November 2026). You send and receive as
`hello@`, and the setup wizard adds the records that help your mail avoid spam folders.

Either way:

1. Put the address in `config/studio.json` (`email`), then run `node scripts/sync-shared.mjs`.
2. Send a test from a different account and reply to it. Check the reply arrives and shows the
   studio address.
3. Use this address for Vercel, Stripe and the registrar too, so the business does not depend on
   a school account you will lose at graduation.

## The lead inbox Google account

The agency contact form saves each inquiry to a Google Sheet through Apps Script. Use a Google
account that belongs to the studio, not your school account. A free account can send email to 100
recipients a day from a script (https://developers.google.com/apps-script/guides/services/quotas,
as of November 2026), plenty for one person. Setup: `../../automation/google-sheets-inbox/README.md`.
