/**
 * Make a client's photos web-ready.
 *
 *   npm run images -- <slug> [--max 2400] [--quality 82]
 *
 * For every photo in clients/<slug>/images/ it turns the picture upright, shrinks it to fit
 * inside --max pixels, re-compresses it, and removes embedded metadata (phone photos often carry
 * the GPS location where they were taken). The untouched original is kept in images/_originals/,
 * which is never committed or published.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const slug = args.find((a, i) => !a.startsWith("--") && (i === 0 || !args[i - 1].startsWith("--")));
const numberOption = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  const value = i === -1 ? fallback : Number(args[i + 1]);
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`--${name} needs a positive number.`);
    process.exit(1);
  }
  return value;
};

if (!slug) {
  console.error("Usage: npm run images -- <slug> [--max 2400] [--quality 82]");
  process.exit(1);
}

const max = numberOption("max", 2400);
const quality = numberOption("quality", 82);
const dir = path.join(ROOT, "clients", slug, "images");
if (!fs.existsSync(dir)) {
  console.error(`clients/${slug}/images does not exist.`);
  process.exit(1);
}

const originals = path.join(dir, "_originals");
const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

async function main() {
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  if (files.length === 0) {
    console.log(`No photos in clients/${slug}/images yet.`);
    return;
  }

  let changed = 0;
  for (const file of files) {
    const full = path.join(dir, file);
    const before = fs.readFileSync(full);
    const meta = await sharp(before).metadata();
    const ext = path.extname(file).toLowerCase();

    // rotate() with no arguments applies the camera's orientation tag, then drops it.
    let pipeline = sharp(before).rotate().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true });
    if (ext === ".png") pipeline = pipeline.png({ compressionLevel: 9 });
    else if (ext === ".webp") pipeline = pipeline.webp({ quality });
    else pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    // sharp writes no EXIF, GPS or other metadata unless asked to, which is what we want.
    const after = await pipeline.toBuffer();
    const afterMeta = await sharp(after).metadata();

    const hadMetadata = Boolean(meta.exif || meta.xmp || meta.iptc);
    const resized = afterMeta.width !== meta.width || afterMeta.height !== meta.height;
    const smaller = after.length < before.length * 0.95;

    if (!resized && !smaller && !hadMetadata) {
      console.log(`  ok        ${file}  ${meta.width}x${meta.height}, ${kb(before.length)}`);
      continue;
    }

    fs.mkdirSync(originals, { recursive: true });
    const backup = path.join(originals, file);
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, before);
    fs.writeFileSync(full, after);
    changed++;
    console.log(
      `  optimized ${file}  ${meta.width}x${meta.height} ${kb(before.length)} -> ${afterMeta.width}x${afterMeta.height} ${kb(after.length)}${
        hadMetadata ? "  (metadata removed)" : ""
      }`,
    );
  }

  console.log(
    changed === 0
      ? "\nAll photos were already web-ready."
      : `\n${changed} photo${changed === 1 ? "" : "s"} optimized. Originals are in clients/${slug}/images/_originals/ (not published).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
