import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPresets, readConfig, readEmbedded, embed, HTML_PATH } from "../build.mjs";

const { pricing, studio } = readConfig();
const html = readFileSync(HTML_PATH, "utf8");

test("embedded presets match config/pricing.json and config/studio.json", () => {
  assert.deepEqual(readEmbedded(html), buildPresets(pricing, studio));
});

test("preset amounts come from pricing.json, in cents", () => {
  const byKey = Object.fromEntries(buildPresets(pricing, studio).items.map((i) => [i.key, i]));
  assert.equal(byKey.starter.unitCents, Math.round(pricing.packages.starter.price * 100));
  assert.equal(byKey.premium.unitCents, Math.round(pricing.packages.premium.price * 100));
  assert.equal(byKey.catering.unitCents, Math.round(pricing.addons.catering.price * 100));
  assert.equal(byKey.maintenance.unitCents, Math.round(pricing.maintenance.pricePerMonth * 100));
  assert.equal(byKey.maintenance.recurring, true);
  assert.equal(byKey.hourly.unitCents, Math.round(pricing.hourlyRate * 100));
  for (const k of ["starter", "premium", "catering", "hourly"]) assert.equal(byKey[k].recurring, false);
});

test("example.com placeholders are not printed as real studio details", () => {
  const p = buildPresets(pricing, { ...studio, email: "hello@example.com", url: "https://example.com", phone: " " });
  assert.equal(p.studio.email, "");
  assert.equal(p.studio.url, "");
  assert.equal(p.studio.phone, "");
});

test("embedding is stable and escapes '<'", () => {
  const p = buildPresets(pricing, { ...studio, name: "A</script>B" });
  const out = embed(html, p);
  assert.ok(!out.includes("A</script>B"));
  assert.deepEqual(readEmbedded(out), p);
  assert.equal(embed(out, p), out);
});

test("a changed price is picked up by the next build", () => {
  const changed = structuredClone(pricing);
  changed.packages.starter.price = 749;
  const p = buildPresets(changed, studio);
  assert.equal(p.items.find((i) => i.key === "starter").unitCents, 74900);
  assert.notDeepEqual(readEmbedded(html), p);
});
