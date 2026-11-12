#!/usr/bin/env node
/**
 * Turns the private research files (one JSON file per city) into the private prospect package:
 *
 *   prospects.csv            every qualified candidate, in the layout of the Prospects tab
 *   README.md                what the package is, how far to trust it, the order to work in
 *   rejected.md              restaurants that were looked at and set aside, with the reason
 *   outreach/<city>-<name>.md   one working file per candidate
 *
 *   node make-prospect-package.mjs
 *   node make-prospect-package.mjs --in <city.json> --in <other.json> --out <folder>
 *
 * With no options it reads every .json file in restaurant-studio/private/prospects/research/
 * and writes to restaurant-studio/private/prospects/. Both are ignored by git.
 *
 * This script holds no restaurant names and no contact details. Everything specific comes from
 * the research files, which never leave the private folder. Running it again keeps whatever
 * you typed under "My notes" in each outreach file.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CONTACT_ROUTES, EVIDENCE, OUTREACH_STATUSES, PAYMENT_STATUSES, PROSPECT_COLUMNS, PROSPECT_HEADERS } from "./lib/columns.mjs";
import { STUDIO_ROOT, isTrackedLocation, loadConfig, matchPackage, money, paymentSplit } from "./lib/config.mjs";
import { stringifyCsv } from "./lib/csv.mjs";
import { checklistItems, cityShortName, slugifyName, splitNameNote, splitSentences, upperFirst, wordCount } from "./lib/text.mjs";

export const NOTES_HEADING = "## My notes";
const EMAIL_WORD_TARGET = 120;

/* --------------------------------------------------------------------------------------------
 * Reading and checking the research files
 * ------------------------------------------------------------------------------------------ */

const REQUIRED_TEXT = [
  "restaurant",
  "cuisine",
  "address",
  "strengths",
  "suggested_improvement",
  "proposed_package",
  "best_contact_route",
  "personal_opening",
  "verify_before_outreach",
];

export function readResearch(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const name = path.basename(file);
  const problems = [];
  if (typeof data.city !== "string" || data.city.trim() === "") problems.push(`${name}: "city" is missing.`);
  if (!Array.isArray(data.qualified)) problems.push(`${name}: "qualified" must be a list.`);
  if (!Array.isArray(data.rejected)) problems.push(`${name}: "rejected" must be a list.`);
  if (problems.length > 0) throw new Error(problems.join("\n"));

  data.qualified.forEach((record, index) => {
    const where = `${name}, qualified #${index + 1}`;
    for (const key of REQUIRED_TEXT) {
      if (typeof record[key] !== "string" || record[key].trim() === "") problems.push(`${where}: "${key}" is missing.`);
    }
    if (!Number.isInteger(record.fit_score) || record.fit_score < 1 || record.fit_score > 5) {
      problems.push(`${where}: "fit_score" must be a whole number from 1 to 5.`);
    }
    if (!Array.isArray(record.observations) || record.observations.length === 0) {
      problems.push(`${where}: "observations" must list at least one observation.`);
    } else {
      record.observations.forEach((observation, position) => {
        if (!observation.issue || !observation.evidence) problems.push(`${where}: observation ${position + 1} needs "issue" and "evidence".`);
        if (!EVIDENCE.includes(observation.confidence)) {
          problems.push(`${where}: observation ${position + 1} has confidence "${observation.confidence}". Use one of: ${EVIDENCE.join(", ")}.`);
        }
      });
    }
  });
  data.rejected.forEach((record, index) => {
    if (!record.restaurant || !record.reason) problems.push(`${name}, rejected #${index + 1}: needs "restaurant" and "reason".`);
  });
  if (problems.length > 0) throw new Error(problems.join("\n"));

  return {
    file: name,
    city: data.city.trim(),
    researchedOn: data.researched_on || "",
    methodNotes: data.method_notes || "",
    qualified: data.qualified,
    rejected: data.rejected,
  };
}

/* --------------------------------------------------------------------------------------------
 * What kind of problem was observed
 * Each kind brings its own subject line and spoken opener. All of them are written in the first
 * person, as something the founder has personally seen, and none of them names a restaurant.
 * ------------------------------------------------------------------------------------------ */

const ISSUE_KINDS = [
  {
    id: "no-site",
    test: /\bno (working )?website of its own\b/i,
    subject: (name) => `A simple website for ${name}`,
    topic: (name) => `a simple website for ${name}`,
    spoken: (name) => `I looked for ${name} on my phone and found your listings, but I couldn't find a website of your own. I may have missed it.`,
    ask: "Would one simple page with your menu, hours and phone number be useful?",
    next: "I have a sample of what one simple page with your menu, hours and phone number could look like.",
  },
  {
    id: "order-dead-end",
    test: /coming soon|not to be live/i,
    subject: (name) => `The order button on the ${name} website`,
    topic: () => "the order button on your website",
    spoken: () => "I tapped the order button on your website, on my phone, and landed on a page that says online ordering is coming soon.",
    ask: "I wanted you to know in case it is news, and I can help sort it out if you would like.",
    next: "I wanted you to know in case it is news. I can help sort it out if you would like, and I have a sample of what I mean.",
  },
  {
    id: "several-sites",
    test: /\b(two|three|four|several|different)\b.*\b(sites|websites|domains)\b/i,
    subject: (name) => `More than one website for ${name}`,
    topic: (name) => `the different websites that come up for ${name}`,
    spoken: (name) => `When I searched for ${name} on my phone, I found more than one website with your name on it, and I couldn't tell which one is current.`,
    ask: "Do you know which one is yours, and would one clear page of your own be useful?",
    next: "I wanted to ask which one is yours. I have a sample of one clear page that points to a single order link.",
  },
  {
    id: "pdf-menu",
    test: /\bpdf/i,
    subject: (name) => `The ${name} menu on a phone`,
    topic: () => "your menu on a phone",
    spoken: () => "I opened your menu on my phone and it came up as a PDF, so I had to zoom in to read it.",
    ask: "Would it be useful to see the same menu as a normal page that reads easily on a phone?",
    next: "I have a sample that shows a menu as a normal page that reads easily on a phone.",
  },
  {
    id: "menu-hard-to-read",
    test: /no readable|menu page/i,
    subject: (name) => `The ${name} menu on a phone`,
    topic: () => "your menu on a phone",
    spoken: () => "I looked for your menu on your website, on my phone, and couldn't find the dishes and prices as text I could read.",
    ask: "Would a menu page that reads easily on a phone be useful?",
    next: "I have a sample of a menu page that reads easily on a phone.",
  },
  {
    id: "hours",
    test: /\bhours\b/i,
    subject: (name) => `The hours shown for ${name} online`,
    topic: (name) => `the hours shown for ${name} online`,
    spoken: () => "I was checking your hours on my phone and found two different sets, so I wasn't sure which is right.",
    ask: "Which hours are right, and would one page that keeps them in one place be useful?",
    next: "I wanted to ask which hours are right. I also have a sample that keeps the hours, menu and phone number on one page.",
  },
  {
    id: "catering",
    test: /catering|private (hibachi|part|event)/i,
    subject: (name) => `Catering requests for ${name}`,
    topic: () => "catering requests",
    spoken: () => "I was reading about your catering on my phone, and the only way I could find to ask was by email, text or phone.",
    ask: "Would a short request form that sends each inquiry straight to you be useful?",
    next: "I have a sample of a short request form that sends each inquiry straight to the owner.",
  },
];

const OTHER_KIND = {
  id: "other",
  subject: (name) => `How ${name} shows up online`,
  topic: (name) => `how ${name} shows up online`,
  spoken: null, // the researcher's own sentence is used instead
  ask: "Could I show you what I saw, and one simple way to tidy it up?",
  next: "I have a sample that shows one simple way to tidy that up.",
};

export function issueKind(issueText) {
  return ISSUE_KINDS.find((kind) => kind.test.test(issueText)) || OTHER_KIND;
}

const NO_SITE_CLAIM = ISSUE_KINDS[0].test;

// Phrases the researchers used when a record rests on little evidence.
const THIN_EVIDENCE = /thin evidence|single search|one search only|only one search was run|one dedicated search|could not inspect/i;

/* --------------------------------------------------------------------------------------------
 * From a research record to everything the package needs
 * ------------------------------------------------------------------------------------------ */

export function matchRoute(text) {
  const value = String(text || "").toLowerCase();
  if (/person|visit|walk/.test(value)) return CONTACT_ROUTES[0];
  if (/email/.test(value)) return CONTACT_ROUTES[2];
  if (/form/.test(value)) return CONTACT_ROUTES[3];
  if (/phone|call/.test(value)) return CONTACT_ROUTES[1];
  throw new Error(`Cannot tell which contact route "${text}" means. Use in-person, phone, business email or contact form.`);
}

/** The sample concept closest to this restaurant, from config/studio.json. */
export function closestDemo(cuisine, packageId, studio) {
  const demos = Object.values(studio.demos || {});
  if (demos.length === 0) return null;
  const text = String(cuisine || "").toLowerCase();
  const plan = String(packageId || "").split("+")[0];
  const scored = demos.map((demo, index) => {
    const words = String(demo.descriptor || "").toLowerCase().split(/[^a-z]+/).filter((word) => word.length >= 4);
    const cuisineScore = words.filter((word) => text.includes(word)).length * 2;
    return { demo, score: cuisineScore + (demo.plan === plan ? 1 : 0), index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored[0].demo;
}

function isPlaceholderEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return value === "" || /@example\.(com|org|net)$/.test(value);
}

/** The founder's details for signatures. Anything not yet in studio.json stays a marked field. */
export function signatureFields(studio) {
  const founderName = String(studio.founder?.name || "").trim();
  return {
    myName: founderName || "{{my_name}}",
    myFirstName: founderName ? founderName.split(/\s+/)[0] : "{{my_first_name}}",
    studioName: !studio.name || studio.nameIsTemporary ? "{{studio_name}}" : studio.name,
    myPhone: String(studio.phone || "").trim() || "{{my_phone}}",
    myEmail: isPlaceholderEmail(studio.email) ? "{{my_email}}" : studio.email.trim(),
    mailingAddress: String(studio.mailingAddress || "").trim() || "{{mailing_address}}",
  };
}

export function prepareProspect(record, research, context) {
  const { pricing, studio } = context;
  const { name, note: nameNote } = splitNameNote(record.restaurant);
  const cityName = cityShortName(research.city);
  const option = matchPackage(record.proposed_package, pricing);
  if (!option) throw new Error(`${research.file}: cannot match the package "${record.proposed_package}" for one record. It must name starter or premium.`);

  const sentences = splitSentences(record.personal_opening);
  const intro = sentences.length > 1 ? sentences[0] : "I build simple websites for independent restaurants.";
  const ask = sentences.length > 2 ? sentences[sentences.length - 1] : "";
  const observed = sentences.length > 2 ? sentences.slice(1, -1) : sentences.slice(sentences.length > 1 ? 1 : 0);

  const everything = [record.fit_reason, record.verify_before_outreach, ...record.observations.map((o) => `${o.issue} ${o.evidence}`)].join(" ");
  const modest = record.fit_score <= 2 || /more than (is|they) need|small fix|cleanup|may need no more/i.test(`${record.package_reason} ${record.suggested_improvement}`);

  return {
    record,
    research,
    name,
    nameNote,
    cityName,
    slug: `${slugifyName(cityName)}-${slugifyName(name, cityName)}`,
    fit: record.fit_score,
    route: matchRoute(record.best_contact_route),
    option,
    kind: issueKind(record.observations[0].issue),
    evidence: record.observations[0].confidence,
    claimsNoSite: record.observations.some((observation) => NO_SITE_CLAIM.test(observation.issue)),
    thin: THIN_EVIDENCE.test(everything),
    modest,
    opening: { intro, observed: observed.join(" "), ask },
    demo: closestDemo(record.cuisine, option.id, studio),
    hasOwnerName: Boolean(record.owner_name_public && record.owner_name_source),
  };
}

/** Where a city comes in studio.json's list of service areas. Unlisted cities go last. */
function cityRank(city, studio) {
  const areas = (studio.serviceAreas || []).map((area) => cityShortName(area).toLowerCase());
  const index = areas.indexOf(cityShortName(city).toLowerCase());
  return index === -1 ? areas.length : index;
}

/** Research files in the order of studio.json's service areas, then by city name. */
export function sortResearches(researches, studio) {
  return [...researches].sort((a, b) => cityRank(a.city, studio) - cityRank(b.city, studio) || a.city.localeCompare(b.city));
}

/** City by city in the order of studio.json's service areas, strongest fit first. */
export function sortProspects(prospects, studio) {
  return prospects
    .map((prospect, index) => ({ prospect, index }))
    .sort(
      (a, b) =>
        cityRank(a.prospect.research.city, studio) - cityRank(b.prospect.research.city, studio) ||
        a.prospect.research.city.localeCompare(b.prospect.research.city) ||
        b.prospect.fit - a.prospect.fit ||
        a.index - b.index,
    )
    .map((entry) => entry.prospect);
}

function uniqueSlugs(prospects) {
  const seen = new Map();
  for (const prospect of prospects) {
    const count = (seen.get(prospect.slug) || 0) + 1;
    seen.set(prospect.slug, count);
    if (count > 1) prospect.slug = `${prospect.slug}-${count}`;
  }
}

/* --------------------------------------------------------------------------------------------
 * prospects.csv
 * ------------------------------------------------------------------------------------------ */

export function csvRow(prospect) {
  const { record } = prospect;
  const notes = [`Address: ${record.address}`];
  if (prospect.nameNote) notes.push(`Name note: ${prospect.nameNote}`);
  if (record.fit_reason) notes.push(`Why fit ${prospect.fit}: ${record.fit_reason}`);
  if (prospect.thin) notes.push("Thin evidence: the researcher said so. Confirm everything before you rely on this row.");
  notes.push(`Working file: outreach/${prospect.slug}.md`);

  const values = {
    restaurant: prospect.name,
    city: prospect.research.city,
    cuisine: record.cuisine,
    contactName: prospect.hasOwnerName ? record.owner_name_public : "",
    phone: record.phone || "",
    publicEmail: record.public_email || "",
    website: record.website_url || "",
    otherListings: (record.other_listings || []).join("\n"),
    observedIssue: record.observations.map((o, index) => `${index + 1}. ${o.issue} [${o.confidence}]`).join("\n"),
    evidence: prospect.evidence,
    checkedOn: "",
    confirmed: "",
    package: prospect.option.label,
    fit: String(prospect.fit),
    route: prospect.route,
    status: OUTREACH_STATUSES[0],
    lastContact: "",
    response: "",
    nextFollowUp: "",
    dealValue: "",
    paymentStatus: PAYMENT_STATUSES[0],
    notes: notes.join("\n"),
  };
  return PROSPECT_COLUMNS.map((column) => values[column.key] ?? "");
}

/* --------------------------------------------------------------------------------------------
 * One outreach file
 * ------------------------------------------------------------------------------------------ */

const ROUTE_GUIDE = {
  "In person": "Go between 2 and 4 pm on a weekday, between lunch and dinner. See sales/06-in-person.md.",
  Phone: "Call the published business number between 2 and 4 pm, and dial it yourself. See sales/05-phone-script.md.",
  "Business email": "One email, to the address the restaurant publishes itself. See sales/02-cold-email.md.",
  "Contact form on their site": "Use the form on their own site, once, and say plainly who you are.",
};

const NOTE_START = /^(the|a|an|this|that|these|those|it|its|there|no|only (one|two|a))\b/i;

function signatureBlock(fields) {
  return [fields.myName, fields.studioName, `${fields.myPhone} | ${fields.myEmail}`, fields.mailingAddress].join("\n");
}

const OPT_OUT_LINE = 'I am writing to offer my website service. If you would rather not hear from me again, reply "no thanks" and I will not contact you again.';

function emailDraft(subject, paragraphs, fields, signOff = "Thank you,") {
  return [`Subject: ${subject}`, "", "Hello,", "", paragraphs.join("\n\n"), "", signOff, signatureBlock(fields), "", OPT_OUT_LINE].join("\n");
}

/** Marks the words in a draft that are only true once the founder has looked for themselves. */
export function mark(text) {
  return `[CHECK: ${text}]`;
}

function fence(text) {
  return ["```text", text, "```"].join("\n");
}

function quoteBlock(text) {
  return text.split("\n").map((line) => `> ${line}`).join("\n");
}

export function firstEmail(prospect, fields) {
  const { opening, kind, name } = prospect;
  const marked = mark(opening.observed);
  const ask = opening.ask || kind.ask;
  const short = "A one-line reply is plenty.";
  const full = `${short} If you would like, I can send a sample to look at on your phone.`;
  const count = (closing) => wordCount([opening.intro, opening.observed, ask, closing].join(" "));
  const closing = count(full) <= EMAIL_WORD_TARGET ? full : short;
  return {
    subject: kind.subject(name),
    text: emailDraft(kind.subject(name), [opening.intro, marked, ask, closing], fields),
    words: count(closing),
  };
}

function demoPhrase(demo) {
  if (!demo) return { label: "one of the sample concepts", link: "{{demo_link}}" };
  return {
    label: `${demo.name}, the ${demo.descriptor} sample concept (the ${demo.plan} layout)`,
    link: demo.url ? demo.url : "{{demo_link}}",
  };
}

function followUpPlan(prospect) {
  const byRoute = {
    "In person": {
      first: "Walk in between 2 and 4 pm",
      reminder: "I stopped by",
      day4: "Stop by once more between 2 and 4 pm, on a different weekday, or call the business number and ask when a good time would be. Leave the one-pager if you have not yet.",
      day11: "One last visit or call. Say plainly that you will not come by again unless they ask.",
    },
    Phone: {
      first: "Call the published business number between 2 and 4 pm",
      reminder: "I called",
      day4: "Call once more, at a different time between 2 and 4 pm. If you reach voicemail, leave one short message (sales/05-phone-script.md).",
      day11: "One last call, or a short visit with the one-pager. Say that you will not call again unless they ask.",
    },
    "Business email": {
      first: "Send the first email",
      reminder: "I wrote",
      day4: "Send the short follow-up below, as a reply to your first email.",
      day11: "Send the last note below. Say that it is the last one.",
    },
    "Contact form on their site": {
      first: "Send one message through the form on their site",
      reminder: "I wrote",
      day4: "If they answered with an address, send the short follow-up below. If not, call the business number once between 2 and 4 pm.",
      day11: "One last short note or call. Say that it is the last one.",
    },
  };
  return byRoute[prospect.route];
}

export function renderOutreach(prospect, context, existingNotes = null) {
  const { record, research, name, kind, option } = prospect;
  const { pricing, fields, generatedOn } = context;
  const lines = [];
  const add = (...text) => lines.push(...text);

  /* ---- header ---- */
  add(`# ${name}`, "");
  add(`${research.city} | Fit ${prospect.fit} of 5 | Best route: ${prospect.route} | Suggested: ${option.label}`, "");
  add("> Private. This folder is ignored by git. Never copy this file, or any name in it, into the public part of the repository.", "");
  add(
    `**Not verified by looking.** The research${research.researchedOn ? ` on ${research.researchedOn}` : ""} could not open a single restaurant website. ` +
      "Everything below comes from search-result text, and search was wrong at least twice in this batch. " +
      "Read it as a lead to check, not as a finding. Look at the restaurant's site on your own phone before you contact anyone.",
    "",
  );
  if (prospect.thin) add("**Thin evidence.** The researcher flagged this record as resting on little evidence. Confirm every point before you rely on it.", "");

  /* ---- 1. checklist ---- */
  const verify = checklistItems(record.verify_before_outreach);
  const actions = verify.filter((item) => !NOTE_START.test(item));
  const researcherNotes = verify.filter((item) => NOTE_START.test(item));
  const checklist = [];
  const digits = (text) => String(text || "").replace(/\D/g, "");

  // A "no website" claim is checked first, by the founder, before anything else is believed.
  if (prospect.claimsNoSite) {
    checklist.push(
      `Search Google and Google Maps yourself for "${name} ${prospect.cityName}". Look for a Website button on the business profile, then check Facebook and Instagram. ` +
        'Search missed a restaurant\'s real site once during this research, so "no website" is a guess until you have looked.',
    );
  }
  checklist.push(...actions);
  if (record.website_url) {
    checklist.push(
      `Open ${record.website_url} on your phone. Can you read the menu without zooming? Are the hours there, and the same everywhere? Does the order link work? Does the phone number dial when you tap it?`,
      `On your laptop, run the site audit from the restaurant-studio folder and keep the screenshot: \`node tools/site-audit/audit.cjs ${record.website_url}\``,
      "Find out who runs the site: the restaurant, or an ordering company. If a vendor runs it, the owner may not be able to change it, and that changes what you can offer.",
    );
  }
  if (!actions.some((item) => /\b(is|still|it is) open\b/i.test(item))) checklist.push("Make sure the restaurant is open, and note its real hours.");
  if (!record.phone) {
    if (!actions.some((item) => /phone number/i.test(item))) checklist.push("No phone number was recorded. Take it from the door, a printed menu or the business profile on Google.");
  } else if (!actions.some((item) => digits(item).includes(digits(record.phone)))) {
    checklist.push(`Check that ${record.phone} is the restaurant's own number before you call it. It came from the research, not from you.`);
  }
  if (prospect.hasOwnerName) {
    checklist.push(`A name is on record: ${record.owner_name_public}. Read the source yourself before you use it. If you are unsure, ask for the owner or manager.`);
  }
  checklist.push(
    'In the CRM, put today\'s date under "Checked on my phone" and a sentence or two under "What I confirmed". Then set Outreach status to "Checked and ready".',
  );

  add("## 1. Before you contact them", "");
  add("Do this on your own phone, and tick each line as you go.", "");
  add(...checklist.map((item) => `- [ ] ${item}`), "");
  if (researcherNotes.length > 0) add("The researcher also noted:", "", ...researcherNotes.map((item) => `- ${item}`), "");
  add("If what you see is different from what is written here, read section 8 before you do anything else.", "");

  /* ---- 2. contact details ---- */
  add("## 2. Contact details", "");
  add("Public business details only, exactly as the research recorded them.", "");
  add(`- **Restaurant:** ${record.restaurant}`);
  add(`- **Cuisine:** ${record.cuisine}`);
  add(`- **Address:** ${record.address}`);
  add(`- **Phone:** ${record.phone || "none recorded"}`);
  add(`- **Public email:** ${record.public_email || "none found. Do not go looking for a personal address."}`);
  add(`- **Website:** ${record.website_url || "none found by search (not confirmed)"}`);
  add(`- **Contact form:** ${record.contact_form_url || "none found"}`);
  if (prospect.hasOwnerName) add(`- **Name on record:** ${record.owner_name_public}`, `  Source: ${record.owner_name_source}`);
  else add("- **Name on record:** none. Ask for the owner or manager.");
  add(`- **Best route:** ${prospect.route}. ${ROUTE_GUIDE[prospect.route]}`, "");
  if ((record.other_listings || []).length > 0) {
    add("Other listings the search turned up:", "", ...record.other_listings.map((listing) => `- ${listing}`), "");
  }

  /* ---- 3. observations ---- */
  add("## 3. What was observed, and how sure we are", "");
  add("Each point carries the researcher's own label:", "");
  add("- **verified-by-search**: the search results showed it in so many words.");
  add("- **needs-visual-check**: a guess from what the search index did not contain.", "");
  add("Neither label means that anyone opened the site.", "");
  record.observations.forEach((observation, index) => {
    add(`${index + 1}. **${observation.issue}** (${observation.confidence})`, `   ${observation.evidence}`);
  });
  add("");
  if ((record.pages_inspected || []).length > 0) {
    add("Pages whose text came back in search results (none was opened):", "", ...record.pages_inspected.map((page) => `- ${page}`), "");
  }
  if (record.independent_evidence) add(`**Is it independent, and is it open?** ${record.independent_evidence}`, "");
  if (record.fit_reason) add(`**Why the researcher scored it ${prospect.fit} of 5:** ${record.fit_reason}`, "");

  /* ---- 4. strengths ---- */
  add("## 4. What they already do well", "");
  add(record.strengths, "");
  add("Say this first, once you have seen that it is true.", "");

  /* ---- 5. suggestion and package ---- */
  const split = paymentSplit(option.price, pricing);
  add("## 5. What I would suggest", "");
  add(record.suggested_improvement, "");
  add(
    `**Package:** ${option.label}, ${money(option.price)}. That is ${money(split.deposit)} to start and ${money(split.balance)} at approval, before launch.` +
      (record.package_reason ? ` ${record.package_reason}` : ""),
    "",
  );
  if (option.id.includes("catering")) {
    add(
      `The ${pricing.addons.catering.name} add-on (${money(pricing.addons.catering.price)} of that total) records each inquiry in a Google Sheet the restaurant owns, emails the owner, and sends the customer a note that the request arrived. ` +
        "It never confirms a booking, a date, availability or a price.",
      "",
    );
  }
  add(
    `${pricing.maintenance.name} is ${money(pricing.maintenance.pricePerMonth)} a month, month to month, and only if they want it. Do not lead with it. ` +
      "The domain is always registered in the restaurant's own name and account.",
    "",
  );
  if (prospect.modest) {
    add(
      "**The honest answer here may be that they do not need a new site.** If the site does its job, say so. Tell them the one thing you noticed, and offer a small fix at the hourly rate " +
        `(${money(pricing.hourlyRate)} an hour) or nothing at all. See sales/09-objections.md.`,
      "",
    );
  }
  add("Never promise more customers, sales or revenue. What a site does is put the menu, hours and phone number where a guest on a phone can find and read them.", "");

  /* ---- 6. drafts ---- */
  const email = firstEmail(prospect, fields);
  const spoken = kind.spoken ? kind.spoken(name) : prospect.opening.observed;
  const demo = demoPhrase(prospect.demo);

  add("## 6. Drafts", "");
  add(
    "Each draft is written as if you have already done the check in section 1. The words inside `[CHECK: ...]` are the part that depends on it. " +
      "Rewrite them to say exactly what you saw, then delete the brackets and the word CHECK. If you did not see it yourself, do not say it. Change any wording that does not sound like you.",
    "",
  );

  add("### First email", "");
  if (record.public_email) {
    add(`Send to: ${record.public_email} (the address the restaurant publishes). One email, to this restaurant only.`, "");
  } else {
    add(
      "No public business email was found for this restaurant, so this is not the way in. Do not look for a personal address. Keep the draft for the day the owner gives you an address, for example after a visit.",
      "",
    );
  }
  add("Nothing goes out until the signature holds your real name and a mailing address where post reaches you. See sales/02-cold-email.md.", "");
  add(fence(email.text), "");
  add(
    `Body length: ${email.words} words` + (email.words > EMAIL_WORD_TARGET ? `. That is over the ${EMAIL_WORD_TARGET} to aim for: trim it when you rewrite the bracketed part.` : "."),
    "",
  );

  add("### Phone opener", "");
  if (record.phone) add(`Call ${record.phone} once you have confirmed it is the business line. Call between 2 and 4 pm and dial it yourself: no texts, no recordings. More in sales/05-phone-script.md.`, "");
  else add("No phone number is on record. Get the business number first (section 1). Call between 2 and 4 pm and dial it yourself: no texts, no recordings. More in sales/05-phone-script.md.", "");
  add(
    quoteBlock(
      `"Hi, my name is ${fields.myFirstName}. I'm a college student, and I build websites for independent restaurants. Is the owner or a manager free for a minute, or is there a better time to call back?"`,
    ),
    "",
  );
  add("If you reach the owner or a manager:", "");
  add(quoteBlock(`"Thank you, I'll be quick. ${mark(spoken)} ${kind.next} Could I stop by one afternoon this week and show you on my phone? It takes five minutes."`), "");
  add('If it is a bad time: "No problem. When is a better time?" Write the time in the CRM and call then.');
  add('If they say no: "Thanks for telling me. I won\'t call again." Set Outreach status to "Do not contact".', "");

  add("### In person", "");
  add("Go between 2 and 4 pm on a weekday, with the sample open on your phone and one printed one-pager (sales/print/one-pager.html). More in sales/06-in-person.md.", "");
  add(
    quoteBlock(
      `"Hi, I'm ${fields.myFirstName}. I'm a college student, I've worked in restaurants, and I build websites for independent restaurants. Is the owner or a manager around? I only need a minute."`,
    ),
    "",
  );
  add("If they are:", "");
  add(quoteBlock(`"${mark(spoken)} ${kind.next} Can I show you on my phone? It takes a minute."`), "");
  add('If they are busy: "No problem. Is there a better time to come back? I\'ll leave this with you." Hand over the one-pager and go.', "");

  add("Details you can mention once you have seen them yourself:", "", ...record.observations.map((observation) => `- ${observation.issue} (${observation.confidence})`), "");
  add(`Closest sample to show: ${demo.label}. It is a fictional restaurant, so say so.`, "");

  /* ---- 7. follow-up ---- */
  const plan = followUpPlan(prospect);
  add("## 7. Follow-up plan", "");
  add("| When | What to do |", "| --- | --- |");
  add(`| Day 0 | ${plan.first}, after the check in section 1. In the CRM, set Outreach status and Last contact, and put Next follow-up four business days out. |`);
  add(`| Day 4 | ${plan.day4} Then put Next follow-up one week out. |`);
  add(`| Day 11 | ${plan.day11} |`);
  add('| After that | Stop. Clear Next follow-up and set Outreach status to "Lost", with "No reply" under Response. |', "");
  add(
    'If they ask you to stop at any point, stop at once: set "Do not contact" and never contact them again. For email the law allows 10 business days to honor an opt-out. Do it the same day.',
    "",
  );
  add("Wording for both follow-ups is in sales/04-follow-up.md. If you are following up by email, these are ready to adjust.", "");
  add("Day 4:", "");
  add(
    fence(
      emailDraft(
        `A sample to look at: ${name}`,
        [
          `${plan.reminder} a few days ago about ${kind.topic(name)}. Here is a sample site, so you can see what I mean on your phone: ${demo.link}. It is a sample concept, not a real restaurant.`,
          "If this is not something you need, tell me and I will not write again.",
        ],
        fields,
      ),
    ),
    "",
  );
  add("Day 11:", "");
  add(
    fence(
      emailDraft(
        `Last note about ${kind.topic(name)}`,
        [`This is my last note about ${kind.topic(name)}. If it would help at some point, my details are below, and I am glad to talk.`],
        fields,
        "Thank you for reading,",
      ),
    ),
    "",
  );

  /* ---- 8. if the check does not hold ---- */
  add("## 8. If the check does not hold", "");
  add('- They do have a site of their own and it does its job: do not use these drafts. Set Outreach status to "Lost" with "Did not need us" under Response. That is a good outcome.');
  add("- The site exists but something else is off: write down what you saw and rewrite the observation in your own words. Use sales/03-personalized-pitch.md.");
  add('- The restaurant has closed or changed hands: set "Lost" with a note, so nobody researches it twice.');
  add("- You are not sure what you are looking at: do not contact them yet. One more look costs nothing.", "");

  /* ---- notes ---- */
  add(NOTES_HEADING, "");
  if (existingNotes !== null) add(existingNotes.replace(/^\n+/, "").trimEnd(), "");
  else add("Date checked:", "", "What I saw:", "", "Who I spoke with:", "", "Next step:", "");

  add("---", `Generated ${generatedOn} by tools/crm/make-prospect-package.mjs from ${research.file}. Running it again keeps everything under "My notes".`);
  return lines.join("\n") + "\n";
}

/** Whatever the founder typed under "My notes" in an existing file, or null when there is none. */
export function extractNotes(existing) {
  const start = existing.indexOf(`\n${NOTES_HEADING}\n`);
  if (start === -1) return null;
  const body = existing.slice(start + NOTES_HEADING.length + 2);
  const end = body.lastIndexOf("\n---\nGenerated ");
  return end === -1 ? body : body.slice(0, end);
}

/* --------------------------------------------------------------------------------------------
 * README.md and rejected.md
 * ------------------------------------------------------------------------------------------ */

function link(prospect) {
  return `[${prospect.name}](outreach/${prospect.slug}.md)`;
}

export function renderReadme(prospects, researches, context) {
  const { fields, generatedOn, pricing } = context;
  const total = prospects.length;
  const strong = prospects.filter((prospect) => prospect.fit >= 4);
  const open = prospects.filter((prospect) => prospect.fit === 3);
  const narrow = prospects.filter((prospect) => prospect.fit <= 2);
  const thin = prospects.filter((prospect) => prospect.thin);
  const withEmail = prospects.filter((prospect) => prospect.record.public_email);
  const rejectedCount = researches.reduce((sum, research) => sum + research.rejected.length, 0);
  const cities = [...new Set(prospects.map((prospect) => prospect.research.city))];
  const perCity = (list, city) => list.filter((prospect) => prospect.research.city === city).length;
  const breakdown = (list) => cities.map((city) => `${perCity(list, city)} in ${cityShortName(city)}`).join(", ");
  const dates = [...new Set(researches.map((research) => research.researchedOn).filter(Boolean))].join(" and ");

  const lines = [];
  const add = (...text) => lines.push(...text);

  add("# Prospect package (private)", "");
  add("> This folder is ignored by git, and it must stay that way. It holds the names and public contact details of real businesses. Nothing in it belongs in the public repository.", "");

  add("## What this is", "");
  add(`${total} restaurants that might be worth a conversation: ${breakdown(prospects)}. They came out of desk research${dates ? ` done on ${dates}` : ""}. ${rejectedCount} more were looked at and set aside (see rejected.md).`, "");
  add("- `prospects.csv`: all of them in the layout of the CRM's Prospects tab. Every row starts at \"Not checked yet\".");
  add("- `outreach/`: one working file per restaurant, with the checklist to do first, the contact details, what was observed, and drafts.");
  add("- `rejected.md`: the ones set aside, with the reason, so you do not research them twice.");
  add("- `research/`: the researchers' original files. The other files are built from these.");
  add("- `../crm/sidework-crm.xlsx`: the CRM workbook with these rows loaded. See tools/crm/README.md for how to put it in Google Sheets.", "");

  add("## How far to trust it", "");
  add("Not far, yet. Please read this part twice.", "");
  add("- The researchers could not open a single restaurant website. The network they worked on blocked it.");
  add("- Every observation comes from the text of search results. Each one is labeled **verified-by-search** (the results showed it in so many words) or **needs-visual-check** (a guess from what search did not show).");
  add("- Neither label means that anyone looked at the site. Nothing here is verified by inspection.");
  add("- Search was wrong at least twice in this batch: it once pinned a namesake's website on the wrong restaurant, and it once missed a restaurant's real site.");
  add("- Hours, phone numbers and whether a place is still open often come from directories, which go out of date.", "");
  add("So these are leads to check, not findings. **Before you contact anyone, look at their site on your own phone.** If what you see is different, believe your phone.", "");

  add("## How many are strong", "");
  add(`- **Scored 4 or 5: ${strong.length}** (${breakdown(strong)}). Start here. These are the researchers' highest scores, and each file says what the score rests on. Still unverified.`);
  add(`- **Scored 3: ${open.length}** (${breakdown(open)}). Each one has a real question still open: a single search, a detail nobody could confirm, or a gap that may be small. The file says which. Settle it first.`);
  add(`- **Scored 2: ${narrow.length}** (${breakdown(narrow)}). The restaurant already has a working site and the issue is narrow, or the evidence is thin. Some of these will turn out not to need us, and the right move is to say so.`, "");
  if (thin.length > 0) {
    add(`The researchers said in so many words that ${thin.length} of the ${total} rest on thin evidence (one search only, or pages they could not inspect):`, "");
    add(...thin.map((prospect) => `- ${link(prospect)} (${cityShortName(prospect.research.city)}, fit ${prospect.fit})`), "");
    add("Each of those says so at the top of its file and in the Notes column of the CSV.", "");
  }
  add(`Only ${withEmail.length} of the ${total} have a public business email on record. For the rest the way in is a visit or a call to the published business number. No personal addresses were looked for, and none should be.`, "");

  add("## The order to work them in", "");
  add("Work in the city you are in. Go down the list one restaurant at a time: check it on your phone, decide, make contact, log it, then move to the next. Do not prepare a batch and send it.", "");
  for (const city of cities) {
    add(`### ${city}`, "");
    prospects
      .filter((prospect) => prospect.research.city === city)
      .forEach((prospect, index) => {
        const flags = [prospect.thin ? "thin evidence" : "", prospect.modest ? "may not need us" : ""].filter(Boolean).join(", ");
        add(`${index + 1}. ${link(prospect)} | fit ${prospect.fit} | ${prospect.route} | ${prospect.option.label}${flags ? ` | ${flags}` : ""}`);
      });
    add("");
  }
  add("Leave the ones scored 2 until last. If the site turns out fine, mark the row \"Lost\" with \"Did not need us\" and move on.", "");

  add("## Using one file", "");
  add("1. Open the restaurant's file in `outreach/` and do section 1 on your phone.");
  add("2. In the CRM, fill in \"Checked on my phone\" and \"What I confirmed\", then set \"Checked and ready\".");
  add("3. Rewrite the words inside `[CHECK: ...]` in the draft to say exactly what you saw, then delete the brackets and the word CHECK.");
  add("4. Make contact by the route in the file. Log it the same day.");
  add("5. Follow the plan in section 7: day 0, day 4, day 11, then stop.", "");

  add("## Rules", "");
  add("- Look first. No contact before the phone check.");
  add("- One restaurant at a time. No bulk email, ever.");
  add("- Published business contact details only. No scraped or guessed personal addresses.");
  add("- Stop the moment someone asks you to, and mark them \"Do not contact\".");
  add("- Do not insult anyone's current site, do not exaggerate, and never promise more customers, sales or revenue.");
  add("- The playbook is in the repository's `sales/` folder. It is generic on purpose: real names stay here.", "");

  const unfilled = Object.values(fields).filter((value) => value.startsWith("{{"));
  add("## Before any email goes out", "");
  if (unfilled.length > 0) {
    add(`The drafts still carry these fields: ${unfilled.map((value) => `\`${value}\``).join(", ")}, plus \`{{demo_link}}\` until the sample sites have addresses.`, "");
    add("Fill in `config/studio.json` (your name, phone, email and mailing address) and run the script again, or replace the fields by hand as you go.", "");
  }
  add("Each email is a commercial message, and the FTC's CAN-SPAM rules apply to it even though it goes to a business. The drafts are laid out to cover the points in the FTC's guide:", "");
  add("- an honest From name and an honest subject line;");
  add("- a plain statement that you are offering a service;");
  add("- a valid postal address where mail reaches you;");
  add("- a clear way to say \"no more\", honored within 10 business days (do it the same day).", "");
  add("So you need a mailing address before the first email. A PO box, or a private mailbox at a registered mail-receiving service, is understood to be acceptable. That point was not re-checked for this package, so confirm it on the FTC's page before you rent one: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business", "");
  add("This is a summary to work from, not legal advice.", "");

  add("## What the researchers said about their own method", "");
  for (const research of researches) {
    add(`### ${research.city}${research.researchedOn ? ` (${research.researchedOn})` : ""}`, "");
    add(research.methodNotes || "No method notes were recorded.", "");
  }

  add("## Building this package again", "");
  add("```", "cd restaurant-studio/tools/crm", "npm run prospects        # rewrites prospects.csv, README.md, rejected.md and outreach/", "npm run build:private    # rebuilds ../../private/crm/sidework-crm.xlsx from prospects.csv", "```", "");
  add("Running it again keeps whatever you typed under \"My notes\" in each outreach file. It does overwrite `prospects.csv` and the workbook file, so once you are working in Google Sheets, treat the sheet as the record and do not upload a rebuilt workbook over it.", "");
  add(`Prices in the files come from config/pricing.json (${pricing.packages.starter.name} ${money(pricing.packages.starter.price)}, ${pricing.packages.premium.name} ${money(pricing.packages.premium.price)}, ${pricing.addons.catering.name} ${money(pricing.addons.catering.price)}).`, "");
  add("---", `Generated ${generatedOn} by tools/crm/make-prospect-package.mjs.`);
  return lines.join("\n") + "\n";
}

const REJECT_GROUPS = [
  { test: /^site already good/i, heading: "Already has a site that does the job", note: "Nothing to offer on the evidence seen. Leave them be." },
  { test: /^could not inspect/i, heading: "Not inspected", note: "The search budget ran out, or search showed too little. These were not judged. Look at them yourself if you want more candidates." },
  { test: /^closed/i, heading: "Appears to be closed", note: "From listings, not confirmed first-hand." },
  { test: /^chain/i, heading: "Chain or franchise", note: "Not independent, so outside what the studio does." },
  // Everything else, whatever label the researcher gave it.
  { test: /./, heading: "Other reasons", note: "A mix: status unclear, not in this city, or no problem found. Read the reason, and re-check before considering any of them." },
];

// Only these exact labels are removed from the front of a reason. Anything longer, such as
// "site already good, as far as search shows", is kept, because the extra words matter.
const REJECT_PREFIX = /^(site already good|could not inspect|closed|chain|other):\s*/i;

export function renderRejected(researches, context) {
  const lines = [];
  const add = (...text) => lines.push(...text);
  const total = researches.reduce((sum, research) => sum + research.rejected.length, 0);

  add("# Looked at and set aside (private)", "");
  add("> This folder is ignored by git. Keep these names out of the public repository.", "");
  add(`${total} restaurants were looked at during the research and not put on the prospect list. They are kept here with the reason, so you do not research them twice.`, "");
  add("The same caveat applies as everywhere else: no site was opened, so each reason is what search results suggested. A \"good site\" here may still have a problem, and a \"closed\" one may be open.", "");

  for (const research of researches) {
    if (research.rejected.length === 0) continue;
    add(`## ${research.city}`, "");
    const remaining = [...research.rejected];
    for (const group of REJECT_GROUPS) {
      const members = remaining.filter((record) => group.test.test(record.reason.trim()));
      if (members.length === 0) continue;
      for (const member of members) remaining.splice(remaining.indexOf(member), 1);
      add(`### ${group.heading} (${members.length})`, "");
      if (group.note) add(group.note, "");
      for (const member of members) {
        const stripped = member.reason.trim().replace(REJECT_PREFIX, "");
        const reason = stripped === "" || /^chain$/i.test(stripped) ? "Recorded as a chain." : upperFirst(stripped);
        add(`- **${member.restaurant}**${member.website_url ? ` (${member.website_url})` : ""}: ${reason}`);
      }
      add("");
    }
  }
  add("---", `Generated ${context.generatedOn} by tools/crm/make-prospect-package.mjs.`);
  return lines.join("\n") + "\n";
}

/* --------------------------------------------------------------------------------------------
 * Building the whole package
 * ------------------------------------------------------------------------------------------ */

function today() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Builds every file of the package in memory.
 * Returns { files: Map<relative path, text>, prospects, warnings }.
 * `existing(relativePath)` returns the current text of a file, or null.
 */
export function buildPackage(inputResearches, config, existing = () => null, generatedOn = today()) {
  const researches = sortResearches(inputResearches, config.studio);
  const context = { pricing: config.pricing, studio: config.studio, fields: signatureFields(config.studio), generatedOn };
  const prepared = researches.flatMap((research) => research.qualified.map((record) => prepareProspect(record, research, context)));
  const prospects = sortProspects(prepared, config.studio);
  uniqueSlugs(prospects);

  const files = new Map();
  const warnings = [];
  files.set("prospects.csv", stringifyCsv([PROSPECT_HEADERS, ...prospects.map(csvRow)]));
  files.set("README.md", renderReadme(prospects, researches, context));
  files.set("rejected.md", renderRejected(researches, context));

  for (const prospect of prospects) {
    const relative = `outreach/${prospect.slug}.md`;
    const current = existing(relative);
    let notes = null;
    if (current !== null) {
      notes = extractNotes(current);
      if (notes === null) {
        warnings.push(`${relative}: the "${NOTES_HEADING}" heading is gone, so the file was left as it is. Rename or delete it to get a fresh copy.`);
        continue;
      }
    }
    files.set(relative, renderOutreach(prospect, context, notes));

    const email = firstEmail(prospect, context.fields);
    if (email.words > EMAIL_WORD_TARGET) warnings.push(`${relative}: the first email runs to ${email.words} words. Trim it when you rewrite the bracketed part.`);
    const drafts = [email.text, prospect.kind.spoken ? prospect.kind.spoken(prospect.name) : prospect.opening.observed, prospect.kind.ask, prospect.kind.next].join("\n");
    if (/[!–—]/.test(drafts)) warnings.push(`${relative}: a draft contains an exclamation mark or a long dash that came from the research text. Reword it.`);
  }
  return { files, prospects, warnings };
}

const HELP = `Builds the private prospect package from the research files.

  node make-prospect-package.mjs
  node make-prospect-package.mjs --in <city.json> [--in <other.json>] [--out <folder>]

Options
  --in <file.json>   a research file (repeat for each city). Default: every .json file in
                     restaurant-studio/private/prospects/research/
  --out <folder>     where to write. Default: restaurant-studio/private/prospects/
  --force            allow writing inside the repository but outside private/ (do not do this
                     with real research: this repository is public)
  --help             show this text
`;

export function parseArgs(argv) {
  const options = { inputs: [], out: null, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--in" || arg === "--out") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a path after it.`);
      if (arg === "--in") options.inputs.push(value);
      else options.out = value;
    } else throw new Error(`Unknown option: ${arg}\n\n${HELP}`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

  const privateProspects = path.join(STUDIO_ROOT, "private", "prospects");
  const out = path.resolve(options.out || privateProspects);
  if (isTrackedLocation(out) && !options.force) {
    throw new Error(
      `Not written: ${out}\nThe package holds the names of real businesses, and that folder is part of a public repository.\n` +
        "Leave --out off to write under restaurant-studio/private/prospects/ (which git ignores), or choose a folder outside the repository.",
    );
  }

  let inputs = options.inputs.map((input) => path.resolve(input));
  if (inputs.length === 0) {
    const researchDir = path.join(privateProspects, "research");
    if (!fs.existsSync(researchDir)) throw new Error(`No research files found. Put one .json file per city in ${researchDir}, or pass --in.`);
    inputs = fs.readdirSync(researchDir).filter((name) => name.endsWith(".json")).sort().map((name) => path.join(researchDir, name));
    if (inputs.length === 0) throw new Error(`No .json files in ${researchDir}.`);
  }

  const researches = inputs.map(readResearch);
  const existing = (relative) => {
    const file = path.join(out, relative);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  };
  const { files, prospects, warnings } = buildPackage(researches, loadConfig(), existing);

  for (const [relative, text] of files) {
    const file = path.join(out, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }

  const rejected = researches.reduce((sum, research) => sum + research.rejected.length, 0);
  console.log(`Wrote ${files.size} files to ${out}`);
  console.log(`${prospects.length} prospects from ${researches.length} research file(s); ${rejected} set aside.`);
  for (const warning of warnings) console.warn(`Note: ${warning}`);
  console.log("Next: npm run build:private   (loads prospects.csv into the CRM workbook)");
}

const runDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (runDirectly) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
