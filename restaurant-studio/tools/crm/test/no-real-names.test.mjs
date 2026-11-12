/**
 * The repository is public. Names and contact details of real restaurants live only in the
 * ignored private folder. This test checks the checker (with made-up data) and then, when the
 * private research files are on this machine, scans the tracked CRM folder for anything from
 * them.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { DEFAULT_RESEARCH, collectNeedles, researchFilesIn, scanFolders, scanText } from "../check-no-real-names.mjs";
import { tempDir } from "./helpers.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const toolDir = path.resolve(here, "..");

describe("the leak checker", () => {
  let dir;
  let needles;
  before(() => {
    dir = tempDir("names");
    needles = collectNeedles([path.join(here, "fixtures", "research-anytown.json"), path.join(here, "fixtures", "research-otherton.json")]);
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const found = (text) => scanText(text, needles).map((hit) => `${hit.kind}: ${hit.label}`);

  it("learns names, other names, web addresses, phone numbers, emails and street addresses", () => {
    const labels = needles.map((needle) => `${needle.kind}: ${needle.label}`);
    for (const expected of [
      "name: Sample Sushi House",
      "other name: Sample Sushi",
      "name: Sample Closed Cafe",
      "web address: sample-hibachi.example.com",
      "phone: 785-555-0111",
      "email: hello@sample-hibachi.example.com",
      "address: 12 Example St",
      "address: 400 Sample Ave #2",
      "address: 400 Sample Ave",
      "address: 12 Fixture Rd",
    ]) {
      assert.ok(labels.includes(expected), `did not learn "${expected}" (have: ${labels.join(" | ")})`);
    }
  });

  it("finds them however they are written", () => {
    assert.deepEqual(found("We visited sample  sushi HOUSE last week."), ["name: Sample Sushi House", "other name: Sample Sushi"]);
    assert.deepEqual(found("Call 785.555.0111 or (785) 555-0111."), ["phone: 785-555-0111"]);
    assert.deepEqual(found("see https://www.sample-hibachi.example.com/menu"), ["web address: sample-hibachi.example.com"]);
    assert.deepEqual(found("at 12 example st, second floor"), ["address: 12 Example St"]);
  });

  it("does not cry wolf", () => {
    assert.deepEqual(found("A sample of sushi houses in general."), []);
    assert.deepEqual(found("Call 785-555-0112."), [], "a different number");
    assert.deepEqual(found("Ask at listings.example.org."), [], "a directory that three or more records cite is not a restaurant's own address");
    assert.deepEqual(found("Write to someone@gmail.com or see facebook.com/yourpage."), [], "general platforms are never a leak");
    assert.deepEqual(found("The 2026 price list has 785 lines and 555 words and 0111 codes."), []);
  });

  it("scans folders, skipping node_modules and binary files", () => {
    fs.mkdirSync(path.join(dir, "docs", "node_modules", "pkg"), { recursive: true });
    fs.writeFileSync(path.join(dir, "docs", "clean.md"), "Nothing to see here.\n");
    fs.writeFileSync(path.join(dir, "docs", "leak.md"), "line one\nWe pitched Sample Hibachi Grill today.\n");
    fs.writeFileSync(path.join(dir, "docs", "node_modules", "pkg", "x.md"), "Sample Hibachi Grill\n");
    fs.writeFileSync(path.join(dir, "docs", "book.xlsx"), "Sample Hibachi Grill\n");
    const { files, hits } = scanFolders([path.join(dir, "docs"), path.join(dir, "not-there")], needles);
    assert.equal(files, 2);
    assert.deepEqual(hits.map((hit) => [path.basename(hit.file), hit.line, hit.label]), [["leak.md", 2, "Sample Hibachi Grill"]]);
  });
});

describe("the tracked CRM folder", () => {
  const researchFiles = researchFilesIn(DEFAULT_RESEARCH);

  it("holds nothing from the private research", { skip: researchFiles.length > 0 ? false : "no private research files on this machine" }, () => {
    const needles = collectNeedles(researchFiles);
    assert.ok(needles.length > 20, "the research files gave too few things to look for");
    const { files, hits } = scanFolders([toolDir], needles);
    assert.ok(files >= 10, "expected to scan the tool's own files");
    // Report where, not what: the matched words are themselves private.
    assert.deepEqual(hits.map((hit) => `${path.relative(toolDir, hit.file)}:${hit.line} (${hit.kind})`), []);
  });
});
