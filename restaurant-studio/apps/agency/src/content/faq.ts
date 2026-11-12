/**
 * Questions owners ask, with straight answers. Prices and terms are read from pricing.json;
 * nothing here promises more customers, sales or revenue.
 */
import type { Route } from "next";

import { INQUIRY_REPLY_TIME, SELF_HOSTING_COST } from "@/content/facts";
import { catering, domainFeeDetail, inWords, maintenance, money, premium, pricing, starter } from "@/lib/pricing";
import { serviceAreaText, studio } from "@/lib/studio";

export type FaqItem = {
  id: string;
  group: "Money" | "Your site" | "Working together";
  q: string;
  /** One string per paragraph. Plain text, so the same words can go into structured data. */
  a: string[];
  link?: { label: string; href: Route };
};

const balancePercent = 100 - pricing.depositPercent;
const replyDays = inWords(maintenance.responseBusinessDays);
const outageDays = inWords(maintenance.outageResponseBusinessDays);

export const FAQ: FaqItem[] = [
  {
    id: "cost",
    group: "Money",
    q: "How much does a website cost?",
    a: [
      `The ${starter.name} is ${money(starter.price)} and the ${premium.name} is ${money(premium.price)}. ${catering.name} is a ${money(catering.price)} add-on, and ${maintenance.name} is ${money(maintenance.pricePerMonth)} a month if you want it.`,
      `You pay ${pricing.depositPercent}% to start and ${balancePercent}% when you approve the site, before it goes live. Those are the prices. There is no separate quote to wait for.`,
    ],
    link: { label: "See what each package includes", href: "/services" },
  },
  {
    id: "timeline",
    group: "Working together",
    q: "How long does it take?",
    a: [
      `A first draft takes ${starter.firstDraftBusinessDays} business days for the ${starter.name} and ${premium.firstDraftBusinessDays} for the ${premium.name}, counted from the day I have your materials.`,
      "After that, the calendar is mostly yours: how soon you can look at the draft and send your changes.",
    ],
    link: { label: "See the whole process", href: "/process" },
  },
  {
    id: "materials",
    group: "Working together",
    q: "What do you need from me?",
    a: [
      "Your menu with prices in any form (a photo of the printed menu is fine), your hours, your address and phone number, your logo if you have one, and the links you use for online ordering or reservations.",
      "Photos help, but they are not required.",
    ],
    link: { label: "See the full checklist", href: "/process#materials" },
  },
  {
    id: "ownership",
    group: "Your site",
    q: "Who owns the site and the domain?",
    a: [
      "The domain name is yours. It is registered in your own name, in your own account, and you pay the registrar directly. Your menu, photos, words and business listings are yours too.",
      "You are never locked in. If you skip the maintenance plan, or cancel it later, I hand over the site files and help you move them to hosting in your own account.",
    ],
  },
  {
    id: "hosting",
    group: "Money",
    q: "What does hosting cost?",
    a: [
      `On the maintenance plan, hosting is included in the ${money(maintenance.pricePerMonth)} a month.`,
      `Without the plan, the site moves to a hosting account in your own name and you pay that company directly. Depending on the host, that runs ${SELF_HOSTING_COST}. I will go through the options with you before you choose.`,
      domainFeeDetail
        ? `The domain name is a separate yearly fee either way: ${domainFeeDetail}.`
        : "The domain name is a separate yearly fee either way, paid by you to the registrar.",
    ],
  },
  {
    id: "updates",
    group: "Your site",
    q: "How do I update the menu or the hours?",
    a: [
      `On the maintenance plan, you send me the change and I make it: menu items, prices, hours, photos, announcements. Up to ${maintenance.includedEditMinutes} minutes of small changes are included each month, and I reply within ${replyDays} business days.`,
      `Without the plan, changes are billed at ${money(pricing.hourlyRate)} an hour, with a ${pricing.hourlyMinimumMinutes}-minute minimum.`,
    ],
  },
  {
    id: "ordering",
    group: "Your site",
    q: "Do you set up online ordering or reservations?",
    a: [
      "No. I do not build or resell ordering or reservation systems.",
      "If you already take orders or bookings online, the site gets clear buttons that open the system you use. If you do not, those buttons are left off, and your phone number is one tap away.",
    ],
  },
  {
    id: "existing",
    group: "Your site",
    q: "I already have a website or a domain. Can you work with that?",
    a: [
      "Yes. If you own a domain, it stays in your name and I point it at the new site, so your address does not change. If someone else registered it for you, I help you move it into an account of your own.",
      "Menus, photos and text from the old site can be reused.",
    ],
  },
  {
    id: "photos",
    group: "Your site",
    q: "I do not have good photos. Is that a problem?",
    a: [
      "No. Professional photography is not part of the package, so I work with what you have, and phone photos are fine.",
      "The site is designed to look finished without photos, and you can add them later.",
    ],
  },
  {
    id: "customers",
    group: "Money",
    q: "Will a new website bring me more customers?",
    a: [
      "I cannot promise that, and I would be careful with anyone who does.",
      "What a good site does is serve the people who are already looking for you. It shows them the menu, the hours and the way to your door, quickly, on a phone. What happens after that is down to your food and your service.",
    ],
  },
  {
    id: "catering",
    group: "Your site",
    q: "What does the catering form do, exactly?",
    a: [
      "It takes the request, records it in a Google Sheet that belongs to you, emails you the details at once, and sends the customer a short note saying the request arrived.",
      "It never confirms a booking, a date, availability or a price. That conversation stays between you and your customer.",
    ],
    link: { label: "See it step by step", href: "/work#behind-the-scenes" },
  },
  {
    id: "payment",
    group: "Money",
    q: "How do I pay?",
    a: [
      "By card, through a Stripe payment link that comes with your agreement. You enter your card on Stripe's page, never on this site, and there is no card surcharge.",
    ],
    link: { label: "How payments work", href: "/pay" },
  },
  {
    id: "refunds",
    group: "Money",
    q: "Can I get a refund?",
    a: [
      `The payments are split so that you never pay in full for something you have not seen: ${pricing.depositPercent}% starts the work, and the other ${balancePercent}% is due only when you approve the finished site.`,
      `The exact terms, including what happens if a project stops partway, are in the agreement you sign before paying anything. Read that part, and ask me about it on the call. The maintenance plan is month to month and ends with ${maintenance.cancelNoticeDays} days' notice.`,
    ],
  },
  {
    id: "solo",
    group: "Working together",
    q: "Are you an agency or one person?",
    a: [
      `One person. I build every site myself, and I am the one who answers when you write. I run ${studio.name} part-time, so I do not promise instant replies.`,
      `New inquiries usually get an answer ${INQUIRY_REPLY_TIME}. Maintenance requests get one within ${replyDays} business days, or ${outageDays} business day if your site is down.`,
    ],
    link: { label: "About the studio", href: "/about" },
  },
  {
    id: "area",
    group: "Working together",
    q: `Do you only work with restaurants in ${serviceAreaText}?`,
    a: [
      "Those are the first places I am working in. Everything can be done by phone, email and a shared link, so I also work with independent restaurants anywhere in the United States.",
    ],
  },
  {
    id: "accessibility",
    group: "Your site",
    q: "Will the site be accessible?",
    a: [
      "Sites are built with the WCAG AA guidelines as the target: readable contrast, real text instead of pictures of text, labeled buttons and forms, and everything reachable by keyboard. I test each site with an automated checker and by hand before launch.",
      "No builder can honestly guarantee legal compliance, and photos or text added later can undo good work. If you need a legal opinion, ask a lawyer.",
    ],
  },
  {
    id: "leaving",
    group: "Working together",
    q: "What if I want to leave?",
    a: [
      `Then you leave, with everything. The maintenance plan is month to month and ends with ${maintenance.cancelNoticeDays} days' notice. Your domain is already in your name.`,
      "I hand over the site files and help you move them to hosting in your own account.",
    ],
  },
];

export const FAQ_GROUPS: Array<FaqItem["group"]> = ["Money", "Your site", "Working together"];

/** The four shown on the home page. */
export const HOME_FAQ_IDS = ["cost", "timeline", "ownership", "customers"];

export function faqById(id: string): FaqItem {
  const item = FAQ.find((entry) => entry.id === id);
  if (!item) throw new Error(`No FAQ entry with id "${id}"`);
  return item;
}
