/**
 * Writes schema/site.schema.json and schema/menu.schema.json from the zod schemas, so editors
 * (VS Code and others) autocomplete and check clients/<slug>/site.json and menu.json as you type.
 * Run "npm run schemas" after changing src/lib/site/schema.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { menuSchema, siteSchema } from "../src/lib/site/schema";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "schema");
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "site.schema.json", schema: siteSchema, title: "Restaurant site settings (site.json)" },
  { file: "menu.schema.json", schema: menuSchema, title: "Restaurant menu (menu.json)" },
] as const;

for (const target of targets) {
  // "input" describes what a person types: fields with defaults are optional.
  const json = z.toJSONSchema(target.schema, { io: "input", unrepresentable: "any" });
  const content = `${JSON.stringify({ title: target.title, ...json }, null, 2)}\n`;
  const file = path.join(outDir, target.file);
  const changed = !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content;
  if (changed) fs.writeFileSync(file, content);
  console.log(`${changed ? "wrote" : "unchanged"} schema/${target.file}`);
}
