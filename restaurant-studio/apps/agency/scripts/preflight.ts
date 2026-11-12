/**
 * npm run preflight: what still stands between this site and launch.
 *
 * Prints a checklist and exits 1 while anything blocks launch. It reads config/studio.json
 * (through its synced copy), the environment, and .env.production.local / .env.local when they
 * exist, so it can be run on your machine with the values you will give Vercel. On Vercel,
 * variables set in the dashboard are what count.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type CheckGroup,
  countBlockers,
  environmentChecks,
  screenshotChecks,
  studioChecks,
} from "../src/lib/preflight";
import { studio } from "../src/lib/studio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Values already in the environment win; the files only fill gaps.
for (const file of [".env.production.local", ".env.local"]) {
  const full = path.join(ROOT, file);
  if (fs.existsSync(full)) process.loadEnvFile(full);
}

function syncCheck(): CheckGroup {
  const result = spawnSync(process.execPath, [path.join(ROOT, "..", "..", "scripts", "sync-shared.mjs"), "--check"], {
    encoding: "utf8",
  });
  return {
    title: "Shared files (config/ copied into src/content and src/lib/inbox)",
    items: [
      result.status === 0
        ? { level: "ok", text: "In sync with restaurant-studio/config." }
        : {
            level: "block",
            text: `Out of sync. Run: node ../../scripts/sync-shared.mjs${result.stdout ? `\n      ${result.stdout.trim().split("\n").join("\n      ")}` : ""}`,
          },
    ],
  };
}

const workDir = path.join(ROOT, "public", "work");
const shots = fs.existsSync(workDir)
  ? fs.readdirSync(workDir).filter((name) => name.endsWith(".png")).map((name) => name.replace(/\.png$/, ""))
  : [];

const groups: CheckGroup[] = [
  studioChecks(studio),
  ...environmentChecks(process.env, studio),
  screenshotChecks(shots),
  syncCheck(),
];

const MARK = { ok: "  ok   ", block: "  BLOCK", note: "  note " } as const;
console.log("\nLaunch preflight for the agency site\n");
for (const group of groups) {
  console.log(group.title);
  for (const item of group.items) console.log(`${MARK[item.level]} ${item.text}`);
  console.log("");
}

const blockers = countBlockers(groups);
if (blockers > 0) {
  console.log(`${blockers} item(s) still block launch. Fix them, then run npm run preflight again.`);
  process.exit(1);
}
console.log("Nothing blocks launch.");
