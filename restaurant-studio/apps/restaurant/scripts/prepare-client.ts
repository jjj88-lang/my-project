/**
 * Validates a client's content and wires it into the app.
 *
 *   CLIENT=hibana npm run client      validate + generate src/generated/* (runs before dev/build/test)
 *   npm run validate                  validate only
 *   npm run validate -- --all         validate every client in clients/
 *
 * It fails loudly, with plain-language messages, when something would ship broken:
 * missing photos, missing alt text, unreadable color contrast, malformed hours or prices.
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodError } from "zod";

import {
  creditsSchema,
  menuSchema,
  siteSchema,
  type Menu,
  type SiteConfig,
} from "../src/lib/site/schema";
import { buildTheme, checkThemeContrast } from "../src/lib/site/theme";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENTS_DIR = path.join(ROOT, "clients");
const GENERATED_DIR = path.join(ROOT, "src", "generated");
export const DEFAULT_CLIENT = "hibana";

type Level = "error" | "warning" | "note";
type Finding = { level: Level; where: string; message: string };

const c = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function issuePath(p: PropertyKey[]): string {
  return p
    .map((seg, i) => (typeof seg === "number" ? `[${seg}]` : i === 0 ? String(seg) : `.${String(seg)}`))
    .join("");
}

function zodFindings(file: string, error: ZodError): Finding[] {
  return error.issues.map((issue) => ({
    level: "error" as const,
    where: `${file} → ${issuePath(issue.path) || "(top level)"}`,
    message: issue.message,
  }));
}

function readJson(file: string, findings: Finding[], label: string): unknown | undefined {
  if (!fs.existsSync(file)) {
    findings.push({ level: "error", where: label, message: `File not found: ${path.relative(ROOT, file)}` });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    findings.push({
      level: "error",
      where: label,
      message: `Not valid JSON (${(err as Error).message}). A missing comma or quote is the usual cause.`,
    });
    return undefined;
  }
}

/** Every image file name the site config and menu refer to, with where it is used. */
export function referencedImages(site: SiteConfig, menu: Menu): Map<string, string[]> {
  const refs = new Map<string, string[]>();
  const add = (name: string | undefined, where: string) => {
    if (!name) return;
    refs.set(name, [...(refs.get(name) ?? []), where]);
  };
  add(site.logo.image, "logo.image");
  add(site.hero.media.image, "hero.media.image");
  add(site.intro.media?.image, "intro.media.image");
  site.experiences.forEach((e, i) => add(e.media.image, `experiences[${i}].media.image`));
  site.gallery.images.forEach((g, i) => add(g.image, `gallery.images[${i}].image`));
  add(site.catering.media?.image, "catering.media.image");
  add(site.about?.media?.image, "about.media.image");
  menu.sections.forEach((s, si) =>
    s.items.forEach((item, ii) => add(item.media?.image, `menu sections[${si}].items[${ii}].media.image`)),
  );
  return refs;
}

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|svg)$/i;
const MAX_IMAGE_BYTES = 1_500_000;

export type Loaded = {
  slug: string;
  dir: string;
  site?: SiteConfig;
  menu?: Menu;
  hasCredits: boolean;
  images: string[];
  findings: Finding[];
};

export function loadClient(slug: string): Loaded {
  const dir = path.join(CLIENTS_DIR, slug);
  const findings: Finding[] = [];
  const result: Loaded = { slug, dir, hasCredits: false, images: [], findings };

  if (!fs.existsSync(dir)) {
    findings.push({
      level: "error",
      where: "clients/",
      message: `No client folder named "${slug}". Available: ${listClients().join(", ") || "(none)"}`,
    });
    return result;
  }

  const rawSite = readJson(path.join(dir, "site.json"), findings, "site.json");
  const rawMenu = readJson(path.join(dir, "menu.json"), findings, "menu.json");

  if (rawSite !== undefined) {
    const parsed = siteSchema.safeParse(rawSite);
    if (parsed.success) result.site = parsed.data;
    else findings.push(...zodFindings("site.json", parsed.error));
  }
  if (rawMenu !== undefined) {
    const parsed = menuSchema.safeParse(rawMenu);
    if (parsed.success) result.menu = parsed.data;
    else findings.push(...zodFindings("menu.json", parsed.error));
  }

  const imagesDir = path.join(dir, "images");
  const onDisk = fs.existsSync(imagesDir)
    ? fs.readdirSync(imagesDir).filter((f) => IMAGE_EXT.test(f))
    : [];

  const creditsFile = path.join(imagesDir, "credits.json");
  if (fs.existsSync(creditsFile)) {
    const rawCredits = readJson(creditsFile, findings, "images/credits.json");
    const parsed = creditsSchema.safeParse(rawCredits);
    if (parsed.success) {
      result.hasCredits = true;
      for (const credit of parsed.data) {
        if (!onDisk.includes(credit.file)) {
          findings.push({
            level: "warning",
            where: "images/credits.json",
            message: `Credit listed for "${credit.file}", but that file is not in images/.`,
          });
        }
      }
    } else findings.push(...zodFindings("images/credits.json", parsed.error));
  }

  const { site, menu } = result;
  if (!site || !menu) return result;

  // --- Images -------------------------------------------------------------
  const refs = referencedImages(site, menu);
  for (const [name, where] of refs) {
    if (!onDisk.includes(name)) {
      findings.push({
        level: "error",
        where: `site.json → ${where[0]}`,
        message: `Image "${name}" is not in clients/${slug}/images/. Add the file or remove the reference.`,
      });
    }
  }
  result.images = [...refs.keys()].filter((name) => onDisk.includes(name)).sort();
  for (const file of onDisk) {
    if (!refs.has(file)) {
      findings.push({
        level: "note",
        where: `images/${file}`,
        message: "Not used anywhere on the site (it will not be published).",
      });
      continue;
    }
    const bytes = fs.statSync(path.join(imagesDir, file)).size;
    if (bytes > MAX_IMAGE_BYTES && !/\.svg$/i.test(file)) {
      findings.push({
        level: "warning",
        where: `images/${file}`,
        message: `${(bytes / 1_000_000).toFixed(1)} MB is large for a web photo. Run "npm run images -- ${slug}" to resize it.`,
      });
    }
  }

  // --- Theme --------------------------------------------------------------
  for (const issue of checkThemeContrast(buildTheme(site.theme))) {
    findings.push({ level: issue.level, where: "site.json → theme.colors", message: issue.message });
  }

  // --- Cross-field checks ---------------------------------------------------
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: site.timezone });
  } catch {
    findings.push({
      level: "error",
      where: "site.json → timezone",
      message: `"${site.timezone}" is not a valid time zone. Examples: America/Chicago, America/New_York, America/Los_Angeles.`,
    });
  }
  if (site.catering.form && !site.catering.enabled) {
    findings.push({
      level: "error",
      where: "site.json → catering",
      message: '"form" is true but "enabled" is false. Enable the catering section or turn the form off.',
    });
  }
  if (site.catering.minGuests > site.catering.maxGuests) {
    findings.push({
      level: "error",
      where: "site.json → catering.minGuests",
      message: "minGuests is larger than maxGuests.",
    });
  }
  const today = new Date().toISOString().slice(0, 10);
  site.hours.exceptions.forEach((e, i) => {
    if (e.date < today) {
      findings.push({
        level: "note",
        where: `site.json → hours.exceptions[${i}]`,
        message: `${e.date}${e.label ? ` (${e.label})` : ""} is in the past and can be removed.`,
      });
    }
  });
  if (site.announcement?.until && site.announcement.until < today) {
    findings.push({
      level: "warning",
      where: "site.json → announcement.until",
      message: "The announcement has expired and is no longer shown. Remove or update it.",
    });
  }
  if (!menu.sections.some((s) => s.items.some((i) => i.featured))) {
    findings.push({
      level: "note",
      where: "menu.json",
      message: 'No items are marked "featured": true, so the home page shows the first few items instead.',
    });
  }

  // --- Launch-readiness checks for real (non-sample) clients ---------------
  if (!site.sample) {
    const placeholder = (v: string | undefined) => !!v && /example\.(com|org)|your-?domain|TODO|lorem/i.test(v);
    if (placeholder(site.url)) {
      findings.push({ level: "error", where: "site.json → url", message: "Still a placeholder. Set the real domain." });
    }
    if (/555-01\d\d/.test(site.contact.phone)) {
      findings.push({
        level: "error",
        where: "site.json → contact.phone",
        message: "This is a fictional 555 number. Enter the restaurant's real phone number.",
      });
    }
    if (!site.links.order?.url) {
      findings.push({
        level: "note",
        where: "site.json → links.order",
        message: "No online-ordering link, so the Order button is hidden. Confirm the client does not take online orders.",
      });
    }
    if (!menu.updated) {
      findings.push({
        level: "warning",
        where: "menu.json → updated",
        message: "Record the date the owner last confirmed these prices.",
      });
    }
  }

  return result;
}

export function listClients(): string[] {
  if (!fs.existsSync(CLIENTS_DIR)) return [];
  return fs
    .readdirSync(CLIENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

function report(loaded: Loaded): boolean {
  const errors = loaded.findings.filter((f) => f.level === "error");
  const warnings = loaded.findings.filter((f) => f.level === "warning");
  const notes = loaded.findings.filter((f) => f.level === "note");
  const title = loaded.site ? `${loaded.site.name} (${loaded.slug})` : loaded.slug;
  console.log(`\n${c.bold(title)}`);
  for (const f of errors) console.log(`  ${c.red("✗ error")}   ${f.where}\n            ${f.message}`);
  for (const f of warnings) console.log(`  ${c.yellow("! warning")} ${f.where}\n            ${f.message}`);
  for (const f of notes) console.log(`  ${c.dim(`· note    ${f.where}`)}\n            ${c.dim(f.message)}`);
  if (errors.length === 0) {
    const s = loaded.site!;
    const m = loaded.menu!;
    const items = m.sections.reduce((n, sec) => n + sec.items.length, 0);
    console.log(
      `  ${c.green("✓ valid")}   ${s.plan} plan${s.sample ? ", sample concept" : ""} · ${m.sections.length} menu sections, ${items} items · ${loaded.images.length} photos`,
    );
  } else {
    console.log(`  ${c.red(`${errors.length} error${errors.length === 1 ? "" : "s"} must be fixed before this site can build.`)}`);
  }
  return errors.length === 0;
}

function generate(loaded: Loaded, freshSecret: boolean) {
  const { slug, site } = loaded;
  if (!site) throw new Error("generate() called without a valid site");
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const rel = `../../clients/${slug}`;
  const imageImports = loaded.images.map((name, i) => `import img${i} from "${rel}/images/${name}";`);
  const imageEntries = loaded.images.map((name, i) => `  ${JSON.stringify(name)}: img${i},`);

  const lines = [
    `// AUTO-GENERATED by scripts/prepare-client.ts for client "${slug}". Do not edit; edit clients/${slug}/ instead.`,
    `import type { StaticImageData } from "next/image";`,
    `import siteJson from "${rel}/site.json";`,
    `import menuJson from "${rel}/menu.json";`,
    loaded.hasCredits ? `import creditsJson from "${rel}/images/credits.json";` : null,
    ...imageImports,
    ``,
    `export { bodyFont, displayFont } from "../lib/fonts/${site.theme.fonts}";`,
    ``,
    `export const clientSlug = ${JSON.stringify(slug)};`,
    `export const rawSite: unknown = siteJson;`,
    `export const rawMenu: unknown = menuJson;`,
    `export const rawCredits: unknown = ${loaded.hasCredits ? "creditsJson" : "[]"};`,
    `export const images: Record<string, StaticImageData> = {`,
    ...imageEntries,
    `};`,
    ``,
  ].filter((l): l is string => l !== null);

  writeIfChanged(path.join(GENERATED_DIR, "client.ts"), lines.join("\n"));

  // A per-build secret for signing form tokens. Never sent to the browser. FORM_SECRET overrides it.
  const secretFile = path.join(GENERATED_DIR, "secret.ts");
  if (freshSecret || !fs.existsSync(secretFile)) {
    fs.writeFileSync(
      secretFile,
      `// AUTO-GENERATED. Server-only. Regenerated on every production build.\nexport const BUILD_SECRET = "${randomBytes(32).toString("hex")}";\n`,
    );
  }
}

function writeIfChanged(file: string, content: string) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return;
  fs.writeFileSync(file, content);
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const all = args.includes("--all");
  const freshSecret = args.includes("--fresh-secret");
  const positional = args.filter((a) => !a.startsWith("--"));
  const slug = positional[0] ?? process.env.CLIENT ?? DEFAULT_CLIENT;

  if (all) {
    const results = listClients().map((s) => report(loadClient(s)));
    console.log("");
    process.exit(results.every(Boolean) ? 0 : 1);
  }

  const loaded = loadClient(slug);
  const ok = report(loaded);
  if (!ok) {
    console.log("");
    process.exit(1);
  }
  if (!checkOnly) {
    generate(loaded, freshSecret);
    console.log(c.dim(`  → src/generated/ now points at clients/${slug}\n`));
  } else {
    console.log("");
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
