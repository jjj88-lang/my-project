#!/usr/bin/env node
/**
 * Keeps the copies of shared files identical.
 *
 * Each app must be deployable from its own folder, so a few files exist in more than one place:
 *   - config/pricing.json and config/studio.json  ->  apps/agency/src/content/
 *   - apps/restaurant/src/lib/inbox/               ->  apps/agency/src/lib/inbox/
 *
 * The left-hand side is the original. Never edit the copies.
 *
 *   node scripts/sync-shared.mjs           copy originals over the copies
 *   node scripts/sync-shared.mjs --check   exit 1 if any copy differs (used in tests and CI)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const PAIRS = [
  ["config/pricing.json", "apps/agency/src/content/pricing.json"],
  ["config/studio.json", "apps/agency/src/content/studio.json"],
  ["apps/restaurant/src/lib/inbox", "apps/agency/src/lib/inbox"],
];

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

let drift = 0;
let copied = 0;

function syncFile(from, to) {
  const source = fs.readFileSync(from);
  const same = fs.existsSync(to) && Buffer.compare(source, fs.readFileSync(to)) === 0;
  if (same) return;
  if (check) {
    drift++;
    console.error(`differs: ${path.relative(root, to)}  (original: ${path.relative(root, from)})`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, source);
  copied++;
  console.log(`copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

for (const [fromRel, toRel] of PAIRS) {
  const from = path.join(root, fromRel);
  const to = path.join(root, toRel);
  if (!fs.existsSync(from)) {
    console.error(`missing original: ${fromRel}`);
    process.exitCode = 1;
    continue;
  }
  // Skip targets whose app does not exist yet.
  if (!fs.existsSync(path.join(root, toRel.split("/").slice(0, 2).join("/")))) continue;

  if (fs.statSync(from).isDirectory()) {
    const sources = listFiles(from);
    for (const file of sources) syncFile(file, path.join(to, path.relative(from, file)));
    // A file that exists only in the copy is drift too.
    if (fs.existsSync(to)) {
      for (const file of listFiles(to)) {
        if (!fs.existsSync(path.join(from, path.relative(to, file)))) {
          if (check) {
            drift++;
            console.error(`extra file in copy: ${path.relative(root, file)}`);
          } else {
            fs.rmSync(file);
            console.log(`removed ${path.relative(root, file)} (not in the original)`);
          }
        }
      }
    }
  } else {
    syncFile(from, to);
  }
}

if (check) {
  if (drift > 0) {
    console.error(`\n${drift} shared file(s) out of sync. Run: node scripts/sync-shared.mjs`);
    process.exit(1);
  }
  console.log("Shared files are in sync.");
} else {
  console.log(copied === 0 ? "Already in sync." : `Synced ${copied} file(s).`);
}
