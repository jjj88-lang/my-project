/**
 * Runs the prospect-package builder on two made-up research files and checks what it writes:
 * the CSV, the README, the list of restaurants set aside, and one working file per prospect.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { buildWorkbook, readProspectsCsv } from "../build-crm.mjs";
import { PROSPECT_HEADERS } from "../lib/columns.mjs";
import { loadConfig, money, paymentSplit } from "../lib/config.mjs";
import { parseCsv } from "../lib/csv.mjs";
import {
  NOTES_HEADING,
  buildPackage,
  closestDemo,
  extractNotes,
  issueKind,
  matchRoute,
  parseArgs,
  readResearch,
  signatureFields,
} from "../make-prospect-package.mjs";
import { tempDir } from "./helpers.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const toolDir = path.resolve(here, "..");
const fixture = (name) => path.join(here, "fixtures", name);
const { pricing } = loadConfig();

// A studio whose details are still empty, with the service areas in a deliberate order:
// Otherton comes first even though Anytown sorts first alphabetically.
const studio = {
  name: "Placeholder Studio",
  nameIsTemporary: true,
  email: "hello@example.com",
  phone: "",
  mailingAddress: "",
  serviceAreas: ["Otherton, New York", "Anytown, Kansas"],
  founder: { name: "" },
  demos: {
    one: { name: "Demo One", descriptor: "Hibachi & Sushi", plan: "premium", url: "" },
    two: { name: "Demo Two", descriptor: "Korean BBQ", plan: "starter", url: "" },
  },
};

const researches = [readResearch(fixture("research-anytown.json")), readResearch(fixture("research-otherton.json"))];
const build = (existing, studioOverride = studio) => buildPackage(researches, { pricing, studio: studioOverride }, existing, "2026-01-20");

/** The text inside the fenced blocks of a markdown file. */
function fencedBlocks(markdown) {
  return [...markdown.matchAll(/```text\n([\s\S]*?)\n```/g)].map((match) => match[1]);
}

function section(markdown, heading) {
  const start = markdown.indexOf(`\n${heading}`);
  assert.notEqual(start, -1, `no section "${heading}"`);
  const next = markdown.indexOf("\n## ", start + heading.length);
  return markdown.slice(start, next === -1 ? undefined : next);
}

describe("the prospect package", () => {
  const { files, prospects, warnings } = build();
  const file = (name) => {
    assert.ok(files.has(name), `missing ${name}; have ${[...files.keys()].join(", ")}`);
    return files.get(name);
  };

  it("writes the CSV, the README, the set-aside list and one file per prospect", () => {
    assert.deepEqual([...files.keys()].sort(), [
      "README.md",
      "outreach/anytown-sample-hibachi-grill.md",
      "outreach/anytown-sample-noodle-bar.md",
      "outreach/anytown-sample-sushi-house.md",
      "outreach/otherton-sample-ramen.md",
      "prospects.csv",
      "rejected.md",
    ]);
    assert.deepEqual(warnings, []);
  });

  it("sorts by city in service-area order, then by fit", () => {
    assert.deepEqual(
      prospects.map((prospect) => [prospect.research.city, prospect.fit]),
      [["Otherton, NY", 3], ["Anytown, KS", 5], ["Anytown, KS", 4], ["Anytown, KS", 2]],
    );
  });

  it("writes a CSV in the Prospects layout that the workbook builder accepts", () => {
    const table = parseCsv(file("prospects.csv"));
    assert.deepEqual(table[0], PROSPECT_HEADERS);
    assert.equal(table.length, 5);
    const column = (heading) => table.slice(1).map((row) => row[PROSPECT_HEADERS.indexOf(heading)]);

    assert.deepEqual(column("Restaurant"), ["Otherton Sample Ramen", "Sample Hibachi Grill", "Sample Sushi House", "Sample Noodle Bar"]);
    assert.deepEqual(column("Outreach status"), Array(4).fill("Not checked yet"));
    assert.deepEqual(column("Payment status"), Array(4).fill("None yet"));
    assert.deepEqual(column("Checked on my phone"), Array(4).fill(""));
    assert.deepEqual(column("Deal value"), Array(4).fill(""), "no deal value until a proposal exists");
    assert.deepEqual(column("Fit (1 to 5)"), ["3", "5", "4", "2"]);
    assert.deepEqual(column("Best contact route"), ["Phone", "Business email", "In person", "In person"]);
    assert.deepEqual(column("Evidence"), ["verified-by-search", "verified-by-search", "verified-by-search", "needs-visual-check"]);
    assert.deepEqual(column("Suggested package"), [
      pricing.packages.starter.name,
      `${pricing.packages.premium.name} + ${pricing.addons.catering.name}`,
      pricing.packages.starter.name,
      pricing.packages.starter.name,
    ]);
    assert.deepEqual(column("Phone"), ["", "785-555-0122", "(785) 555-0111", "(785) 555-0133"], "phone numbers exactly as recorded");
    assert.deepEqual(column("Public email"), ["", "hello@sample-hibachi.example.com", "", ""]);

    const typed = readProspectsCsv(file("prospects.csv"), pricing);
    assert.equal(typed.rows.length, 4);
    assert.deepEqual(typed.missing, []);
    assert.doesNotThrow(() => buildWorkbook({ prospects: typed.rows, pricing }));
  });

  it("fills Contact name only when the research gives a name and its source", () => {
    const table = parseCsv(file("prospects.csv"));
    const names = table.slice(1).map((row) => row[PROSPECT_HEADERS.indexOf("Contact name")]);
    assert.deepEqual(names, ["", "Pat Example", "", ""], "a name with no source is left out");
  });

  it("carries the address, the name note and the thin-evidence flag into Notes", () => {
    const table = parseCsv(file("prospects.csv"));
    const notes = table.slice(1).map((row) => row[PROSPECT_HEADERS.indexOf("Notes")]);
    assert.match(notes[2], /^Address: 12 Example St, Anytown, KS 66000\nName note: also listed as Sample Sushi\n/);
    assert.match(notes[2], /Working file: outreach\/anytown-sample-sushi-house\.md$/);
    assert.match(notes[3], /Thin evidence/);
    assert.doesNotMatch(notes[2], /Thin evidence/);
    const issues = table.slice(1).map((row) => row[PROSPECT_HEADERS.indexOf("Observed issue")]);
    assert.equal(issues[2], "1. No website of its own [verified-by-search]\n2. Hours differ across listings [needs-visual-check]");
  });

  it("starts each working file with the evidence warning and a checklist", () => {
    const sushi = file("outreach/anytown-sample-sushi-house.md");
    assert.match(sushi, /^# Sample Sushi House\n/);
    assert.match(sushi, /\*\*Not verified by looking\.\*\* The research on 2026-01-15 could not open a single restaurant website\./);
    const checklist = section(sushi, "## 1. Before you contact them");
    const items = checklist.split("\n").filter((line) => line.startsWith("- [ ] "));
    assert.match(items[0], /Search Google and Google Maps yourself for "Sample Sushi House Anytown"/, "a no-website claim is checked first");
    assert.match(items[0], /Search missed a restaurant's real site once/);
    assert.ok(items.some((item) => item.includes("On your own phone, search for the restaurant")), "the researcher's own steps are there");
    assert.ok(items.at(-1).includes('"Checked on my phone"'));
    assert.equal(items.filter((item) => item.includes("(785) 555-0111")).length, 1, "the phone check is not repeated");
    assert.match(checklist, /The researcher also noted:\n\n- The phone number comes from a directory\./);
  });

  it("adds the site checks and the audit command when there is a website", () => {
    const hibachi = section(file("outreach/anytown-sample-hibachi-grill.md"), "## 1. Before you contact them");
    assert.match(hibachi, /- \[ \] Open https:\/\/sample-hibachi\.example\.com\/ on your phone\. Can you read the menu without zooming\?/);
    assert.match(hibachi, /`node tools\/site-audit\/audit\.cjs https:\/\/sample-hibachi\.example\.com\/`/);
    assert.match(hibachi, /Find out who runs the site/);
    assert.doesNotMatch(hibachi, /Google Maps/, "no no-website step when a site is on record");
    assert.match(hibachi, /A name is on record: Pat Example\. Read the source yourself/);
    assert.match(hibachi, /- \[ \] Confirm the menus still open as PDFs\.\n- \[ \] Check whether the site has a catering form\.\n- \[ \] Compare the hours on each page\./);
  });

  it("lists public contact details exactly as recorded", () => {
    const contact = section(file("outreach/anytown-sample-hibachi-grill.md"), "## 2. Contact details");
    assert.match(contact, /- \*\*Phone:\*\* 785-555-0122\n/);
    assert.match(contact, /- \*\*Public email:\*\* hello@sample-hibachi\.example\.com\n/);
    assert.match(contact, /- \*\*Name on record:\*\* Pat Example\n {2}Source: https:\/\/news\.example\.org\/profile-of-sample-hibachi/);
    assert.match(contact, /- \*\*Best route:\*\* Business email\./);
    const noodle = section(file("outreach/anytown-sample-noodle-bar.md"), "## 2. Contact details");
    assert.match(noodle, /- \*\*Name on record:\*\* none\. Ask for the owner or manager\./, "an unsourced name is not shown");
    assert.match(noodle, /- \*\*Public email:\*\* none found\. Do not go looking for a personal address\./);
  });

  it("shows each observation with its label and explains the labels", () => {
    const observed = section(file("outreach/anytown-sample-sushi-house.md"), "## 3. What was observed, and how sure we are");
    assert.match(observed, /1\. \*\*No website of its own\*\* \(verified-by-search\)\n {3}Two searches returned only directory pages\./);
    assert.match(observed, /2\. \*\*Hours differ across listings\*\* \(needs-visual-check\)/);
    assert.match(observed, /Neither label means that anyone opened the site\./);
    assert.match(observed, /\*\*Why the researcher scored it 4 of 5:\*\*/);
  });

  it("states the package and its price from pricing.json", () => {
    const starter = pricing.packages.starter;
    const starterSplit = paymentSplit(starter.price, pricing);
    const sushi = section(file("outreach/anytown-sample-sushi-house.md"), "## 5. What I would suggest");
    assert.ok(sushi.includes(`**Package:** ${starter.name}, ${money(starter.price)}. That is ${money(starterSplit.deposit)} to start and ${money(starterSplit.balance)} at approval, before launch.`));
    assert.match(sushi, /Never promise more customers, sales or revenue\./);
    assert.doesNotMatch(sushi, /they do not need a new site/);

    const total = pricing.packages.premium.price + pricing.addons.catering.price;
    const hibachi = section(file("outreach/anytown-sample-hibachi-grill.md"), "## 5. What I would suggest");
    assert.ok(hibachi.includes(`${pricing.packages.premium.name} + ${pricing.addons.catering.name}, ${money(total)}.`));
    assert.match(hibachi, /It never confirms a booking, a date, availability or a price\./);

    const noodle = file("outreach/anytown-sample-noodle-bar.md");
    assert.match(noodle, /\*\*Thin evidence\.\*\* The researcher flagged this record/);
    assert.match(section(noodle, "## 5. What I would suggest"), /\*\*The honest answer here may be that they do not need a new site\.\*\*/);
    assert.ok(section(noodle, "## 5. What I would suggest").includes(`${money(pricing.hourlyRate)} an hour`));
  });

  it("marks the sentence in every draft that depends on the founder's own check", () => {
    const sushi = file("outreach/anytown-sample-sushi-house.md");
    const drafts = section(sushi, "## 6. Drafts");
    const [email] = fencedBlocks(drafts);
    assert.match(email, /^Subject: A simple website for Sample Sushi House\n\nHello,\n\nI'm a college student who has worked in restaurants/);
    assert.ok(
      email.includes("\n\n[CHECK: When I looked up Sample Sushi House I found your listings on a delivery app, but I couldn't find a website of your own.]\n\n"),
      "the observation, and only the observation, is marked",
    );
    assert.ok(email.includes("\n\nWould it help to have one page you control with your hours and menu?\n\n"));
    const spoken = drafts.split("\n").filter((line) => line.startsWith("> "));
    assert.equal(spoken.length, 4, "two lines for the phone and two for the visit");
    assert.equal(spoken.filter((line) => line.includes("[CHECK: I looked for Sample Sushi House on my phone")).length, 2);
    assert.match(spoken[1], /I may have missed it\.\]/, "the spoken claim allows for being wrong");
    assert.match(drafts, /If you did not see it yourself, do not say it\./);
    assert.match(drafts, /No public business email was found for this restaurant/);

    const hibachi = section(file("outreach/anytown-sample-hibachi-grill.md"), "## 6. Drafts");
    assert.match(hibachi, /Send to: hello@sample-hibachi\.example\.com \(the address the restaurant publishes\)\. One email, to this restaurant only\./);
    assert.match(fencedBlocks(hibachi)[0], /^Subject: The Sample Hibachi Grill menu on a phone\n/);

    const ramen = section(file("outreach/otherton-sample-ramen.md"), "## 6. Drafts");
    assert.match(ramen, /No phone number is on record\. Get the business number first/);
  });

  it("ends every draft email with the signature fields and a plain way to opt out", () => {
    for (const name of [...files.keys()].filter((key) => key.startsWith("outreach/"))) {
      const emails = fencedBlocks(file(name));
      assert.equal(emails.length, 3, `${name}: first email, day 4 and day 11`);
      for (const email of emails) {
        assert.match(email, /^Subject: \S/);
        assert.ok(
          email.endsWith(
            '{{my_name}}\n{{studio_name}}\n{{my_phone}} | {{my_email}}\n{{mailing_address}}\n\nI am writing to offer my website service. If you would rather not hear from me again, reply "no thanks" and I will not contact you again.',
          ),
          `${name}: an email does not end with the footer`,
        );
        assert.doesNotMatch(email, /^Subject: (re|fwd?):/im, "no fake reply or forward in a subject line");
      }
    }
  });

  it("keeps the first email short and free of pressure, hype and promises", () => {
    const banned = /[!–—]|\b(unlock|elevate|seamless|leverage|guarantee|skyrocket|boost|act now|limited time|last chance|more customers|more sales|more revenue|increase your)\b/i;
    for (const name of [...files.keys()].filter((key) => key.startsWith("outreach/"))) {
      const drafts = section(file(name), "## 6. Drafts") + section(file(name), "## 7. Follow-up plan");
      for (const block of [...fencedBlocks(drafts), ...drafts.split("\n").filter((line) => line.startsWith("> "))]) {
        assert.doesNotMatch(block, banned, `${name}: ${block.slice(0, 80)}`);
      }
      const words = Number(/Body length: (\d+) words/.exec(drafts)[1]);
      assert.ok(words > 30 && words <= 120, `${name}: first email is ${words} words`);
    }
  });

  it("lays out day 0, day 4, day 11 and then stops", () => {
    const plan = section(file("outreach/otherton-sample-ramen.md"), "## 7. Follow-up plan");
    assert.match(plan, /\| Day 0 \| Call the published business number between 2 and 4 pm, after the check in section 1\./);
    assert.match(plan, /\| Day 4 \| Call once more/);
    assert.match(plan, /\| Day 11 \| One last call/);
    assert.match(plan, /\| After that \| Stop\. Clear Next follow-up and set Outreach status to "Lost"/);
    assert.match(plan, /If they ask you to stop at any point, stop at once/);
    assert.match(fencedBlocks(plan)[0], /I called a few days ago about the hours shown for Otherton Sample Ramen online\./);
    assert.match(fencedBlocks(plan)[0], /\{\{demo_link\}\}\. It is a sample concept, not a real restaurant\./);
    assert.match(fencedBlocks(plan)[1], /^Subject: Last note about the hours shown for Otherton Sample Ramen online\n/);
    assert.match(section(file("outreach/anytown-sample-sushi-house.md"), "## 7. Follow-up plan"), /I stopped by a few days ago about a simple website for Sample Sushi House\./);
  });

  it("names the closest sample concept and says it is fictional", () => {
    assert.match(file("outreach/anytown-sample-sushi-house.md"), /Closest sample to show: Demo One, the Hibachi & Sushi sample concept \(the premium layout\)\. It is a fictional restaurant, so say so\./);
    assert.match(file("outreach/otherton-sample-ramen.md"), /Closest sample to show: Demo Two, the Korean BBQ sample concept/);
    assert.equal(closestDemo("Indian", "premium+catering", studio).name, "Demo One", "with no cuisine match, the layout decides");
    assert.equal(closestDemo("Indian", "starter", studio).name, "Demo Two");
    assert.equal(closestDemo("Indian", "starter", { demos: {} }), null);
  });

  it("explains what to do when the check does not hold, and leaves room for notes", () => {
    const sushi = file("outreach/anytown-sample-sushi-house.md");
    assert.match(section(sushi, "## 8. If the check does not hold"), /do not use these drafts\. Set Outreach status to "Lost" with "Did not need us"/);
    assert.match(sushi, /\n## My notes\n\nDate checked:\n\nWhat I saw:\n\nWho I spoke with:\n\nNext step:\n\n---\nGenerated 2026-01-20 by /);
  });

  it("writes a README with the caveat, the counts and the working order", () => {
    const readme = file("README.md");
    assert.match(readme, /4 restaurants that might be worth a conversation: 1 in Otherton, 3 in Anytown\./);
    assert.match(readme, /5 more were looked at and set aside/);
    assert.match(readme, /The researchers could not open a single restaurant website\./);
    assert.match(readme, /Search was wrong at least twice in this batch/);
    assert.match(readme, /\*\*Before you contact anyone, look at their site on your own phone\.\*\*/);
    assert.match(readme, /\*\*Scored 4 or 5: 2\*\* \(0 in Otherton, 2 in Anytown\)/);
    assert.match(readme, /\*\*Scored 3: 1\*\*/);
    assert.match(readme, /\*\*Scored 2: 1\*\*/);
    assert.match(readme, /1 of the 4 rest on thin evidence[\s\S]*- \[Sample Noodle Bar\]\(outreach\/anytown-sample-noodle-bar\.md\) \(Anytown, fit 2\)/);
    assert.match(readme, /Only 1 of the 4 have a public business email on record\./);
    const order = readme.slice(readme.indexOf("## The order to work them in"), readme.indexOf("## Using one file"));
    assert.ok(order.indexOf("### Otherton, NY") < order.indexOf("### Anytown, KS"));
    assert.match(order, /1\. \[Sample Hibachi Grill\]\(outreach\/anytown-sample-hibachi-grill\.md\) \| fit 5 \| Business email \|/);
    assert.match(order, /3\. \[Sample Noodle Bar\]\(outreach\/anytown-sample-noodle-bar\.md\) \| fit 2 \| In person \| .* \| thin evidence, may not need us/);
    assert.match(readme, /`\{\{my_name\}\}`.*`\{\{mailing_address\}\}`/);
    assert.match(readme, /FIXTURE FOR TESTS\. Every business in this file is made up\. No page was opened\./, "the researchers' method notes are quoted in full");
  });

  it("groups the restaurants that were set aside by reason", () => {
    const rejected = file("rejected.md");
    assert.match(rejected, /5 restaurants were looked at during the research and not put on the prospect list\./);
    assert.match(rejected, /### Already has a site that does the job \(1\)[\s\S]*- \*\*Sample Good Site Thai\*\* \(https:\/\/sample-good\.example\.com\/\): Site already good, as far as search shows: hours and a menu were visible\./);
    assert.match(rejected, /### Not inspected \(1\)[\s\S]*- \*\*Sample Mystery Diner\*\*: The search budget ran out\./);
    assert.match(rejected, /### Appears to be closed \(1\)[\s\S]*- \*\*Sample Closed Cafe \(12 Fixture Rd\)\*\*: A listing showed it as permanently closed\./);
    assert.match(rejected, /### Chain or franchise \(1\)[\s\S]*- \*\*Sample Chain Buffet\*\* \(https:\/\/chain\.example\.com\/\): Recorded as a chain\./);
    assert.match(rejected, /### Other reasons \(1\)[\s\S]*- \*\*Sample Unusual Case\*\*: Moved away: an article says it left town\./);
    assert.doesNotMatch(rejected, /## Otherton/, "a city with nothing set aside gets no empty heading");
  });
});

describe("building the package again", () => {
  it("keeps what was typed under My notes", () => {
    const first = build();
    const name = "outreach/anytown-sample-sushi-house.md";
    const typed = "Date checked: 2026-02-01\n\nWhat I saw: no website button on the map listing.\n\n---\nA line of my own after a rule.";
    const edited = first.files.get(name).replace(/## My notes\n[\s\S]*?\n---\nGenerated /, `## My notes\n\n${typed}\n\n---\nGenerated `);
    assert.ok(edited.includes(typed));

    const second = build((relative) => (relative === name ? edited : null));
    assert.ok(second.files.get(name).includes(`${NOTES_HEADING}\n\n${typed}\n\n---\nGenerated 2026-01-20`), "the notes came through unchanged");
    assert.equal(extractNotes(second.files.get(name)).trim(), typed);
    assert.deepEqual(second.warnings, []);
  });

  it("leaves a file alone when its notes heading has been removed", () => {
    const name = "outreach/otherton-sample-ramen.md";
    const second = build((relative) => (relative === name ? "# My own rewritten file\n\nNo notes heading here.\n" : null));
    assert.equal(second.files.has(name), false);
    assert.equal(second.warnings.length, 1);
    assert.match(second.warnings[0], /otherton-sample-ramen\.md: the "## My notes" heading is gone, so the file was left as it is/);
    assert.equal(second.files.size, 6);
  });

  it("uses the founder's real details once studio.json has them", () => {
    const filled = {
      ...studio,
      name: "Fixture Web Studio",
      nameIsTemporary: false,
      email: "pat@fixture-studio.test",
      phone: "(785) 555-0199",
      mailingAddress: "PO Box 1, Anytown, KS 66000",
      founder: { name: "Pat Fixture" },
      demos: { one: { name: "Demo One", descriptor: "Hibachi & Sushi", plan: "premium", url: "https://demo.example.com/one" } },
    };
    assert.deepEqual(signatureFields(filled), {
      myName: "Pat Fixture",
      myFirstName: "Pat",
      studioName: "Fixture Web Studio",
      myPhone: "(785) 555-0199",
      myEmail: "pat@fixture-studio.test",
      mailingAddress: "PO Box 1, Anytown, KS 66000",
    });
    const text = build(undefined, filled).files.get("outreach/anytown-sample-sushi-house.md");
    assert.doesNotMatch(text, /\{\{/, "no field is left unfilled");
    assert.match(text, /Thank you,\nPat Fixture\nFixture Web Studio\n\(785\) 555-0199 \| pat@fixture-studio\.test\nPO Box 1, Anytown, KS 66000\n/);
    assert.match(text, /"Hi, I'm Pat\. /);
    assert.match(text, /on your phone: https:\/\/demo\.example\.com\/one\. It is a sample concept/);
    assert.deepEqual(signatureFields(studio).studioName, "{{studio_name}}", "a temporary studio name stays a field");
  });
});

describe("reading research files", () => {
  let dir;
  before(() => {
    dir = tempDir("research");
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const write = (name, data) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, JSON.stringify(data));
    return file;
  };
  const good = JSON.parse(fs.readFileSync(fixture("research-otherton.json"), "utf8"));

  it("says what is wrong with a broken file", () => {
    assert.throws(() => readResearch(write("no-city.json", { ...good, city: "" })), /no-city\.json: "city" is missing/);
    const record = { ...good.qualified[0], fit_score: 7, observations: [{ issue: "x", evidence: "y", confidence: "sure" }], personal_opening: "" };
    assert.throws(
      () => readResearch(write("bad-record.json", { ...good, qualified: [record] })),
      (error) => {
        assert.match(error.message, /qualified #1: "personal_opening" is missing/);
        assert.match(error.message, /"fit_score" must be a whole number from 1 to 5/);
        assert.match(error.message, /confidence "sure"\. Use one of: verified-by-search, needs-visual-check/);
        return true;
      },
    );
  });

  it("recognises the kinds of problem and the contact routes", () => {
    assert.equal(issueKind("No website of its own").id, "no-site");
    assert.equal(issueKind("No working website of its own was found").id, "no-site");
    assert.equal(issueKind("Order page says 'Online Ordering Coming Soon' while the home page invites orders").id, "order-dead-end");
    assert.equal(issueKind("Two restaurant-branded sites show different hours").id, "several-sites");
    assert.equal(issueKind("Menus appear to be offered only as PDF downloads").id, "pdf-menu");
    assert.equal(issueKind("Menu page on its own site shows no readable dishes or prices").id, "menu-hard-to-read");
    assert.equal(issueKind("Hours conflict within its own site").id, "hours");
    assert.equal(issueKind("Private parties and catering are booked by email; no request form found").id, "catering");
    assert.equal(issueKind("Name and menu differ between its own site and its ordering pages").id, "other");
    assert.equal(matchRoute("in-person"), "In person");
    assert.equal(matchRoute("phone"), "Phone");
    assert.equal(matchRoute("business email"), "Business email");
    assert.throws(() => matchRoute("carrier pigeon"), /Cannot tell which contact route/);
  });
});

describe("the command line", () => {
  let dir;
  before(() => {
    dir = tempDir("package-cli");
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const run = (...args) => spawnSync(process.execPath, [path.join(toolDir, "make-prospect-package.mjs"), ...args], { encoding: "utf8" });

  it("writes the package to the folder it is given, and keeps notes on a second run", () => {
    const out = path.join(dir, "package");
    const args = ["--in", fixture("research-anytown.json"), "--in", fixture("research-otherton.json"), "--out", out];
    const first = run(...args);
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /Wrote 7 files/);
    assert.match(first.stdout, /4 prospects from 2 research file\(s\); 5 set aside\./);

    const notesFile = path.join(out, "outreach", "anytown-sample-noodle-bar.md");
    fs.writeFileSync(notesFile, fs.readFileSync(notesFile, "utf8").replace("Date checked:", "Date checked: the order page works, dropped."));
    const second = run(...args);
    assert.equal(second.status, 0, second.stderr);
    assert.match(fs.readFileSync(notesFile, "utf8"), /Date checked: the order page works, dropped\./);
  });

  it("will not write the package into a tracked folder of the public repository", () => {
    const tracked = path.join(toolDir, "should-not-exist");
    const result = run("--in", fixture("research-anytown.json"), "--out", tracked);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /public repository/);
    assert.equal(fs.existsSync(tracked), false);
  });

  it("explains a bad option", () => {
    assert.throws(() => parseArgs(["--in"]), /needs a path/);
    assert.throws(() => parseArgs(["--everything"]), /Unknown option/);
    assert.deepEqual(parseArgs(["--in", "a.json", "--in", "b.json", "--out", "c"]), { inputs: ["a.json", "b.json"], out: "c", force: false, help: false });
  });
});
