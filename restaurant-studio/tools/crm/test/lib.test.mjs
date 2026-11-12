/**
 * The small helpers: CSV reading and writing, sentence splitting, checklists, file names and
 * the price helpers.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { columnLetter, letterOf, PROSPECT_COLUMNS } from "../lib/columns.mjs";
import { loadConfig, matchPackage, money, packageOptions, paymentSplit } from "../lib/config.mjs";
import { guardCell, parseCsv, stringifyCsv, unguardCell } from "../lib/csv.mjs";
import { checklistItems, cityShortName, slugifyName, splitNameNote, splitSentences, wordCount } from "../lib/text.mjs";

describe("CSV", () => {
  it("round-trips commas, quotes and line breaks", () => {
    const rows = [
      ["Restaurant", "Notes"],
      ['Sample "Best" Cafe', "Line one\nLine two, with a comma"],
      ["", "trailing empty cell before"],
    ];
    assert.deepEqual(parseCsv(stringifyCsv(rows)), rows);
  });

  it("reads files from other programs", () => {
    assert.deepEqual(parseCsv("﻿a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
    assert.deepEqual(parseCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
    assert.deepEqual(parseCsv('a\n"x ""quoted"" y"\n\n'), [["a"], ['x "quoted" y']]);
    assert.throws(() => parseCsv('a\n"never closed'), /closing quote mark is missing/);
  });

  it("guards cells a spreadsheet would run as a formula, and restores them exactly", () => {
    for (const risky of ["=SUM(A1:A9)", "+1 785 555 0100", "-5 degrees", "@handle", "\tindented"]) {
      assert.equal(guardCell(risky), `'${risky}`);
      assert.equal(unguardCell(guardCell(risky)), risky);
    }
    for (const safe of ["(785) 555-0100", "785-555-0100", "https://example.com", "Sample's Cafe", "'quoted start", ""]) {
      assert.equal(guardCell(safe), safe);
      assert.equal(unguardCell(guardCell(safe)), safe);
    }
    assert.equal(unguardCell(guardCell("'=already had an apostrophe")), "'=already had an apostrophe");
    assert.match(stringifyCsv([["=1+1"]]), /^'=1\+1\r\n$/);
  });
});

describe("text helpers", () => {
  it("splits a paragraph into sentences without breaking web addresses or street names", () => {
    assert.deepEqual(splitSentences("Open sample.example.com on your phone. Confirm the menu is a PDF. If not, drop it."), [
      "Open sample.example.com on your phone.",
      "Confirm the menu is a PDF.",
      "If not, drop it.",
    ]);
    assert.deepEqual(splitSentences("It is at 12 N. Example St. in Anytown. Call first."), ["It is at 12 N. Example St. in Anytown.", "Call first."]);
    assert.deepEqual(splitSentences("The page says 'Coming Soon'. Is that right? Yes."), ["The page says 'Coming Soon'.", "Is that right?", "Yes."]);
    assert.deepEqual(splitSentences("  "), []);
    assert.deepEqual(splitSentences("One sentence with no full stop"), ["One sentence with no full stop"]);
  });

  it("turns instructions into checklist items", () => {
    assert.deepEqual(checklistItems("Open the site on your phone. Confirm the hours; check the order link works; and compare two prices."), [
      "Open the site on your phone.",
      "Confirm the hours.",
      "Check the order link works.",
      "Compare two prices.",
    ]);
    assert.deepEqual(checklistItems("The number comes from a directory; confirm it."), ["The number comes from a directory; confirm it."], "a two-word step is not split off");
    assert.deepEqual(checklistItems("Confirm: (a) there is no site; (b) the hours are current."), ["Confirm: (a) there is no site; (b) the hours are current."], "a lettered list stays whole");
  });

  it("makes short file names", () => {
    assert.equal(slugifyName("The Example Noodle House of Anytown", "Anytown"), "example-noodle-house");
    assert.equal(slugifyName("Anytown Sample Grill & Bar", "Anytown"), "sample-grill-bar");
    assert.equal(slugifyName("Jo's Café", "Anytown"), "jos-cafe");
    assert.equal(slugifyName("The", ""), "the");
    assert.equal(slugifyName("!!!", ""), "restaurant");
    assert.equal(slugifyName("New Example"), "new-example");
  });

  it("separates a name from the note after it", () => {
    assert.deepEqual(splitNameNote("Sample Sushi House (also listed as Sample Sushi)"), { name: "Sample Sushi House", note: "also listed as Sample Sushi" });
    assert.deepEqual(splitNameNote("Sample Diner"), { name: "Sample Diner", note: "" });
    assert.deepEqual(splitNameNote("(odd) Name"), { name: "(odd) Name", note: "" });
    assert.equal(cityShortName("Anytown, KS"), "Anytown");
    assert.equal(wordCount("One, two; three: 4 - five."), 5);
  });
});

describe("columns and prices", () => {
  const { pricing } = loadConfig();

  it("works out spreadsheet column letters", () => {
    assert.deepEqual([1, 26, 27, 52, 53, 702, 703].map(columnLetter), ["A", "Z", "AA", "AZ", "BA", "ZZ", "AAA"]);
    assert.equal(letterOf(PROSPECT_COLUMNS, "restaurant"), "A");
    assert.equal(letterOf(PROSPECT_COLUMNS, "notes"), columnLetter(PROSPECT_COLUMNS.length));
    assert.throws(() => letterOf(PROSPECT_COLUMNS, "nope"), /No column/);
  });

  it("takes prices from config/pricing.json and never from a typed-in number", () => {
    const options = packageOptions(pricing);
    assert.deepEqual(options.map((option) => option.id), ["starter", "premium", "starter+catering", "premium+catering", "small-fix", "no-need"]);
    assert.equal(options[0].price, pricing.packages.starter.price);
    assert.equal(options[3].price, pricing.packages.premium.price + pricing.addons.catering.price);
    assert.equal(matchPackage("starter ($699 one-page site)", pricing).id, "starter");
    assert.equal(matchPackage("premium + catering inquiry automation ($349 add-on)", pricing).id, "premium+catering");
    assert.equal(matchPackage("something else", pricing), null);
    const split = paymentSplit(pricing.packages.starter.price, pricing);
    assert.equal(split.deposit + split.balance, pricing.packages.starter.price);
    assert.equal(split.deposit, (pricing.packages.starter.price * pricing.depositPercent) / 100);
  });

  it("formats money plainly", () => {
    assert.equal(money(699), "$699");
    assert.equal(money(349.5), "$349.50");
    assert.equal(money(1348), "$1,348");
  });
});
