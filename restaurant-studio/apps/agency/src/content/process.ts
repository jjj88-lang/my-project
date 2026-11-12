/**
 * How a project runs, from the first call to launch. Every number comes from pricing.json.
 */
import { FIRST_CALL_MINUTES } from "@/content/facts";
import { capitalize, catering, draftDaysRange, inWords, maintenance, money, premium, pricing, starter } from "@/lib/pricing";

export type ProcessStep = {
  /** Short label printed on the ticket, in capitals. */
  station: string;
  title: string;
  text: string;
  /** The line at the foot of the ticket: a time or an amount. */
  meta: string;
};

const balancePercent = 100 - pricing.depositPercent;
const rounds = inWords(starter.revisionRounds);

/** The five tickets shown on the home page and at the top of the process page. */
export const PROCESS_STEPS: ProcessStep[] = [
  {
    station: "Call",
    title: `A ${FIRST_CALL_MINUTES}-minute call`,
    text: "You tell me about the restaurant and what is not working on the site today. I tell you plainly which package fits, or that you do not need one.",
    meta: `Free · ${FIRST_CALL_MINUTES} minutes`,
  },
  {
    station: "Start",
    title: "Agreement and deposit",
    text: `A short written agreement, then ${pricing.depositPercent}% to start. You send the menu, hours, logo and any photos you have.`,
    meta: `${pricing.depositPercent}% deposit`,
  },
  {
    station: "Draft",
    title: "First draft",
    text: "A working site on a private link, so you can open it on your own phone and tap through it like a guest would.",
    meta: `${draftDaysRange()} business days`,
  },
  {
    station: "Revise",
    title: `${capitalize(rounds)} rounds of changes`,
    text: "You send one list of changes per round. I make them and send the link back for another look.",
    meta: `${starter.revisionRounds} rounds included`,
  },
  {
    station: "Launch",
    title: "Approval and launch",
    text: `When you approve the site, the other ${balancePercent}% is due. Then I connect your domain and the site goes live, with ${pricing.bugFixWindowDays} days to fix anything that turns up.`,
    meta: `${balancePercent}% at approval`,
  },
];

export type MaterialItem = { item: string; note: string; when?: string };

/** What the owner sends before work starts: a prep list. */
export const MATERIALS: MaterialItem[] = [
  {
    item: "Your current menu, with prices",
    note: "Any form is fine: a photo of the printed menu, a PDF, a Word file. I type it out.",
  },
  {
    item: "Hours, including holidays",
    note: "Regular hours, any split shifts, and the days you already know you will be closed.",
  },
  {
    item: "Address and phone number",
    note: "Exactly as you want guests to see them, plus anything useful about parking.",
  },
  {
    item: "Logo and colors",
    note: "The best file you have. If there is no logo file, your name set in good type works well.",
  },
  {
    item: "Links to ordering and reservations",
    note: "The pages guests use today to order online or book a table. If you take neither online, the buttons are left off.",
  },
  {
    item: "Photos, if you have them",
    note: "Phone photos are welcome. If there are none, the site is designed to look finished without them.",
  },
  {
    item: "Your domain name, or a wish for one",
    note: "If you have one, I will need access to point it at the new site. If not, I help you register it in your own name.",
  },
  {
    item: "A few sentences about the restaurant",
    note: "Who cooks, what you are known for, how long you have been open. I can help shape the words.",
    when: `${premium.name}`,
  },
  {
    item: "A Google account that belongs to the restaurant",
    note: "The spreadsheet of inquiries lives there, so the records are yours.",
    when: `${catering.name}`,
  },
];

export const processFacts = {
  depositPercent: pricing.depositPercent,
  balancePercent,
  rounds,
  roundsCount: starter.revisionRounds,
  hourly: money(pricing.hourlyRate),
  hourlyMinimumMinutes: pricing.hourlyMinimumMinutes,
  fixWindowDays: pricing.bugFixWindowDays,
  starterDraftDays: starter.firstDraftBusinessDays,
  premiumDraftDays: premium.firstDraftBusinessDays,
  starterLaunch: starter.typicalLaunch,
  premiumLaunch: premium.typicalLaunch,
  maintenancePrice: money(maintenance.pricePerMonth),
  cancelNoticeDays: maintenance.cancelNoticeDays,
  editMinutes: maintenance.includedEditMinutes,
};
