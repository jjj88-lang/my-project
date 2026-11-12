#!/usr/bin/env node
/**
 * Checks that nothing from the private research has leaked into folders that git tracks.
 *
 *   node check-no-real-names.mjs                    scans tools/crm and sales
 *   node check-no-real-names.mjs <folder> [...]     scans the folders you name
 *   node check-no-real-names.mjs --research <dir>   reads the research files from another folder
 *
 * It reads every restaurant in the research files (qualified and set aside) and looks for its
 * name, other names it goes by, its own web addresses, phone numbers, email addresses and
 * street address. Exit code 1 means something was found. Run it before every commit that
 * touches the sales material.
 *
 * This script holds no names itself. It learns them from the private files each time it runs,
 * and it never prints more than the file, the line number and the matched words.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { STUDIO_ROOT } from "./lib/config.mjs";
import { splitNameNote } from "./lib/text.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SKIP_FOLDERS = new Set(["node_modules", ".git", ".next", "private"]);
const SKIP_EXTENSIONS = new Set([".xlsx", ".xls", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".zip", ".ico", ".woff", ".woff2"]);

// General platforms. A mention of one of these says nothing about any particular restaurant,
// so they are never treated as a leak, however rarely the research happens to cite them.
const PLATFORM_HOSTS = [
  "gmail.com", "google.com", "facebook.com", "instagram.com", "yelp.com", "doordash.com", "ubereats.com",
  "grubhub.com", "opentable.com", "opentable.ca", "opentable.ae", "mapquest.com", "tripadvisor.com",
  "restaurant.com", "toasttab.com", "order.online", "squareup.com", "apple.com", "yellowpages.com", "foursquare.com",
];
const isPlatform = (host) => PLATFORM_HOSTS.some((platform) => host === platform || host.endsWith(`.${platform}`));

const STREET_WORD = /\b(st|street|ave|avenue|rd|road|blvd|dr|drive|pl|place|ln|lane|ct|way|hwy|commons|cir)\b/i;

const PLURALS = {
  name: "names",
  "other name": "other names",
  "web address": "web addresses",
  phone: "phone numbers",
  email: "email addresses",
  address: "street addresses",
};

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A pattern that finds the words with any spacing or apostrophe style, but not inside a longer word. */
function phrasePattern(text, caseSensitive) {
  const words = text.trim().split(/\s+/).map((word) => escape(word).replace(/['’]/g, "['’]?"));
  return new RegExp(`(?<![A-Za-z0-9])${words.join("\\s+")}(?![A-Za-z0-9])`, caseSensitive ? "" : "i");
}

function phonePattern(digits) {
  const [area, exchange, line] = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)];
  return new RegExp(`(?<!\\d)${area}\\D{0,3}${exchange}\\D{0,2}${line}(?!\\d)`);
}

function hostsIn(text) {
  const hosts = new Set();
  for (const match of text.matchAll(/\b(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})\b/gi)) {
    const host = match[1].toLowerCase().replace(/^www\./, "");
    if (/^\d+(\.\d+)*$/.test(host)) continue;
    if (/\.(com|net|org|shop|site|app|guide|online|ae|ca|us|co|biz|info)$/.test(host)) hosts.add(host);
  }
  return hosts;
}

/**
 * Everything that would identify a business from the research files.
 * Returns a list of { label, kind, pattern }.
 */
export function collectNeedles(researchFiles) {
  const records = [];
  for (const file of researchFiles) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const record of [...(data.qualified || []), ...(data.rejected || [])]) records.push(record);
  }

  // A host that turns up in many records is a platform or a directory, not a restaurant's own.
  const hostCounts = new Map();
  const recordHosts = records.map((record) => hostsIn(JSON.stringify(record)));
  for (const hosts of recordHosts) for (const host of hosts) hostCounts.set(host, (hostCounts.get(host) || 0) + 1);

  const needles = new Map();
  const add = (label, kind, pattern) => {
    const key = `${kind}:${label.toLowerCase()}`;
    if (!needles.has(key)) needles.set(key, { label, kind, pattern });
  };
  const addName = (text, kind) => {
    const name = text.trim().replace(/^[\s"'“‘]+|[\s"'”’.,;:]+$/g, "");
    if (name.length < 4 || !/[A-Za-z]/.test(name)) return;
    const oneWord = !/\s/.test(name);
    add(name, kind, phrasePattern(name, oneWord));
  };

  records.forEach((record, index) => {
    const { name, note } = splitNameNote(record.restaurant || "");
    addName(name, "name");
    if (note) {
      for (const quoted of note.matchAll(/['‘"“]([^'’"”]{4,})['’"”]/g)) addName(quoted[1], "other name");
      for (const part of note.split(/[,;]/)) {
        const cleaned = part.trim().replace(/^(also listed as|formerly|now|aka|its ordering pages use the name)\s+/i, "");
        if (/^\d/.test(cleaned) && STREET_WORD.test(cleaned)) add(cleaned, "address", phrasePattern(cleaned, false));
        else if (/^[A-Z0-9]/.test(cleaned) && !/['‘"“]/.test(cleaned)) addName(cleaned, "other name");
      }
    }

    for (const host of recordHosts[index]) {
      if (hostCounts.get(host) <= 2 && !isPlatform(host)) add(host, "web address", new RegExp(`(?<![a-z0-9-])${escape(host)}(?![a-z0-9-])`, "i"));
    }

    const text = JSON.stringify(record);
    for (const match of text.matchAll(/\(?\b(\d{3})\)?[-.\s]{1,2}(\d{3})[-.\s](\d{4})\b/g)) {
      const digits = `${match[1]}${match[2]}${match[3]}`;
      add(`${match[1]}-${match[2]}-${match[3]}`, "phone", phonePattern(digits));
    }
    for (const match of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
      add(match[0], "email", new RegExp(escape(match[0]), "i"));
    }

    // "12 Example St #4 (also written 12 Example Street)" gives three things to look for.
    const streetField = String(record.address || "").split(",")[0].trim();
    const [mainStreet, ...asides] = streetField.split(/\s*[()]\s*/).filter(Boolean);
    const streets = [mainStreet, String(mainStreet || "").replace(/\s+#\S+$/, ""), ...asides.map((aside) => aside.replace(/^also written\s+/i, ""))];
    for (const street of streets) {
      if (street && /^\d/.test(street) && STREET_WORD.test(street) && street.split(/\s+/).length >= 3) add(street, "address", phrasePattern(street, false));
    }
  });

  return [...needles.values()];
}

/** Every match in one piece of text, as { line, label, kind }. */
export function scanText(text, needles) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const needle of needles) {
      if (needle.pattern.test(line)) hits.push({ line: index + 1, label: needle.label, kind: needle.kind });
    }
  });
  return hits;
}

function listFiles(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP_FOLDERS.has(entry.name)) return [];
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return SKIP_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [] : [full];
  });
}

/** Scans folders and returns { files, hits: [{ file, line, label, kind }] }. */
export function scanFolders(folders, needles) {
  const hits = [];
  let files = 0;
  for (const folder of folders) {
    if (!fs.existsSync(folder)) continue;
    for (const file of listFiles(folder)) {
      files++;
      for (const hit of scanText(fs.readFileSync(file, "utf8"), needles)) hits.push({ file, ...hit });
    }
  }
  return { files, hits };
}

export function researchFilesIn(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder).filter((name) => name.endsWith(".json")).sort().map((name) => path.join(folder, name));
}

export const DEFAULT_RESEARCH = path.join(STUDIO_ROOT, "private", "prospects", "research");
export const DEFAULT_FOLDERS = [here, path.join(STUDIO_ROOT, "sales")];

function main() {
  const args = process.argv.slice(2);
  let research = DEFAULT_RESEARCH;
  const folders = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--research") research = path.resolve(args[++i] || "");
    else if (args[i] === "--help" || args[i] === "-h") {
      console.log("node check-no-real-names.mjs [--research <dir>] [folder ...]\nScans tracked folders for names and contact details from the private research. Exit code 1 if any are found.");
      return;
    } else folders.push(path.resolve(args[i]));
  }

  const researchFiles = researchFilesIn(research);
  if (researchFiles.length === 0) {
    console.error(`No research files in ${research}. Nothing to compare against, so nothing was checked.`);
    process.exitCode = 2;
    return;
  }

  const needles = collectNeedles(researchFiles);
  const targets = folders.length > 0 ? folders : DEFAULT_FOLDERS;
  const scanned = targets.filter((folder) => fs.existsSync(folder));
  const missing = targets.filter((folder) => !fs.existsSync(folder));
  const { files, hits } = scanFolders(scanned, needles);

  const counts = needles.reduce((totals, needle) => ({ ...totals, [needle.kind]: (totals[needle.kind] || 0) + 1 }), {});
  const summary = Object.entries(counts).map(([kind, count]) => `${count} ${count === 1 ? kind : PLURALS[kind] || `${kind}s`}`).join(", ");
  console.log(`Looked for ${needles.length} things from ${researchFiles.length} research file(s): ${summary}.`);
  console.log(`Scanned ${files} file(s) in: ${scanned.map((folder) => path.relative(STUDIO_ROOT, folder) || ".").join(", ") || "(nothing)"}`);
  for (const folder of missing) console.log(`Not there yet, so not scanned: ${path.relative(STUDIO_ROOT, folder)}`);

  if (hits.length === 0) {
    console.log("Clean: nothing from the private research appears in those folders.");
    return;
  }
  console.error(`\nFound ${hits.length} match(es). Remove them before committing:`);
  for (const hit of hits) console.error(`  ${path.relative(STUDIO_ROOT, hit.file)}:${hit.line}  ${hit.kind}: ${hit.label}`);
  process.exitCode = 1;
}

const runDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (runDirectly) main();
