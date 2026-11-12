/**
 * Start a new client site from the starter.
 *
 *   npm run new-client -- sakura-house --name "Sakura House" --plan premium
 *
 * Creates clients/sakura-house/ with site.json, menu.json and an images/ folder.
 * Nothing else in the project changes: the same code serves every client.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENTS = path.join(ROOT, "clients");
const STARTER = path.join(CLIENTS, "_starter");

function fail(message: string): never {
  console.error(`\n${message}\n\nUsage: npm run new-client -- <slug> --name "Restaurant Name" [--plan starter|premium]\n`);
  process.exit(1);
}

function option(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (!value || value.startsWith("--")) fail(`--${name} needs a value.`);
  return value;
}

const args = process.argv.slice(2);
const slug = args.find((a, i) => !a.startsWith("--") && (i === 0 || !args[i - 1].startsWith("--")));
if (!slug) fail("Give the new client a short folder name (a slug), for example: sakura-house");
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  fail(`"${slug}" is not a valid folder name. Use lowercase letters, numbers and dashes, for example: sakura-house`);
}

const name = option(args, "name") ?? fail('Add the restaurant\'s name: --name "Sakura House"');
const plan = option(args, "plan") ?? "starter";
if (plan !== "starter" && plan !== "premium") fail(`--plan must be "starter" or "premium", not "${plan}".`);

const target = path.join(CLIENTS, slug);
if (fs.existsSync(target)) fail(`clients/${slug} already exists. Pick another name or edit that client.`);

fs.cpSync(STARTER, target, { recursive: true });
fs.mkdirSync(path.join(target, "images"), { recursive: true });

const siteFile = path.join(target, "site.json");
const site = JSON.parse(fs.readFileSync(siteFile, "utf8"));
site.name = name;
site.logo = { ...site.logo, text: name };
site.plan = plan;
if (plan === "premium") {
  site.theme.hero = "cinematic";
  site.about = {
    heading: `The story of ${name}`,
    body: ["Two or three short paragraphs in the owner's words: who they are, how the restaurant started, what they care about."],
  };
}
fs.writeFileSync(siteFile, `${JSON.stringify(site, null, 2)}\n`);

console.log(`
Created clients/${slug}/ for "${name}" (${plan} plan).

Next steps
  1. Fill in clients/${slug}/site.json   name, address, phone, hours, colors, links, text
  2. Fill in clients/${slug}/menu.json   sections, items and prices from the owner's current menu
  3. Add photos to clients/${slug}/images/ and run:   npm run images -- ${slug}
  4. Preview it:                                      CLIENT=${slug} npm run dev
  5. Check it before every hand-off:                  npm run validate -- ${slug}
  6. Check it before launch:                          npm run launch-check -- ${slug}

Your editor will suggest and check fields as you type, because both files point at schema/*.schema.json.
`);
