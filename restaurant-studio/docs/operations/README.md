# Operations

How to run a project from the first call to monthly maintenance. Each procedure fits on a page. Prices and terms always come from `config/pricing.json`; the signed terms are in `legal/`.

| # | Procedure | Use it when |
| --- | --- | --- |
| 01 | [Onboarding a customer](01-onboarding-a-customer.md) | An owner says yes |
| 02 | [Collecting materials](02-collecting-materials.md) | The deposit is in and you need the menu, hours and photos |
| 03 | [Building the site](03-building-the-site.md) | You have the menu, hours, address and phone |
| 04 | [Review and approval](04-review-and-approval.md) | Before the owner sees anything, and to get approval |
| 05 | [Collecting payment](05-collecting-payment.md) | Deposit, balance, maintenance, late payment |
| 06 | [Deploying](06-deploying.md) | Launch day, domain connection, rollback |
| 07 | [Ownership and handoff](07-ownership-and-handoff.md) | A client declines or leaves maintenance |
| 08 | [Revisions](08-revisions.md) | Changes come in, or something is out of scope |
| 09 | [Maintenance](09-maintenance.md) | Every month, and for every change request |
| 10 | [Resolving issues](10-resolving-issues.md) | Outage, wrong price, unhappy client, refund, chargeback, silence |
| | [Weekly rhythm](weekly-rhythm.md) | Planning your week and exam periods |

Related: `docs/payments.md` (money mechanics), `docs/launch/` (setting up the studio itself), `sales/` (finding clients), `tools/stripe/README.md`, `tools/invoice/invoice.html`, `qa/README.md`.

## The life of a project

| Step | What happens | Who acts | Typical time | Procedure |
| --- | --- | --- | --- | --- |
| 1. First call | Discovery call or visit. Recommend Starter ($699) or Premium ($999), catering add-on ($349) only if they take catering requests. | You | 20 to 30 minutes | `sales/07-discovery-call.md` |
| 2. Yes | Confirm the package and total in writing. CRM: **Won**. | Owner, you | Same day | 01 |
| 3. Agreement | Agreement plus statement of work (plus maintenance and catering terms if chosen). Signed copy back. | Owner | 1 to 3 days | 01, `legal/README.md` |
| 4. Deposit | 50% through a Stripe link. Work starts when it shows Succeeded. | Owner | 1 to 7 days | 05 |
| 5. Kickoff | Kickoff message with the materials request. Folders and site scaffold created. | You | Same day | 01, 02 |
| 6. Materials | Menu, hours, address, phone, logo, photos, links, domain details. Due in 10 days. | Owner | Up to 10 days | 02 |
| 7. Build | `site.json`, `menu.json`, photos, validation. | You | 5 business days (Starter), 7 (Premium) | 03 |
| 8. Internal review | Every price, hours, phone, directions, links, phone and desktop. | You | 45 minutes | 04 |
| 9. Draft and revisions | Preview link. Up to two rounds, one list each. | Owner, you | 1 to 2 weeks | 04, 08 |
| 10. Approval | "Approved for launch" in writing, saved. | Owner | | 04 |
| 11. Balance | Remaining 50% through a Stripe link. No launch before it is paid. | Owner | 1 to 7 days | 05 |
| 12. Launch | Launch check, QA suite, deploy, connect domain, checks on a phone. 14-day fix window starts. | You, owner for DNS | 1 to 2 hours | 06 |
| 13. Maintenance or handoff | $59 a month on the studio's hosting, or the site files handed over and moved to the owner's own hosting. | Owner chooses | Monthly, or once | 09, 07 |

Typical launch: about one to two weeks (Starter) or about two weeks (Premium) after you have all the materials, depending on how fast the owner reviews.

## Records for every client

- `private/clients/<slug>/`: signed agreement, statement of work, materials as received, approvals, `log.md`, `maintenance-log.csv`. Gitignored; back it up.
- `private/crm/`: Outreach status, Payment status, Deal value, dates.
- The client's site content: `apps/restaurant/clients/<slug>/` (see the open decision about the public repository in `01-onboarding-a-customer.md`).
