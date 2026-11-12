/**
 * The sample sites shown on /work. Both are fictional restaurants built to show what a real
 * client receives, and they are labeled as sample concepts wherever they appear.
 */
import { studio } from "@/lib/studio";

export const DEMO_KEYS = ["hibana", "bulmat"] as const;
export type DemoKey = (typeof DEMO_KEYS)[number];

export const DEMO_URL_VARS: Record<DemoKey, string> = {
  hibana: "NEXT_PUBLIC_DEMO_HIBANA_URL",
  bulmat: "NEXT_PUBLIC_DEMO_BULMAT_URL",
};

/** Where each sample runs on a developer's machine (see the README of apps/restaurant). */
export const DEMO_DEV_URLS: Record<DemoKey, string> = {
  hibana: "http://localhost:3001",
  bulmat: "http://localhost:3002",
};

/**
 * A usable link, or undefined. https is required, except for a site running on this machine.
 * Placeholder addresses (example.com) are not links.
 */
export function cleanDemoUrl(value: string | undefined | null): string | undefined {
  if (!value || !value.trim()) return undefined;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return undefined;
  if (url.username || url.password) return undefined;
  if (/(^|\.)example\.(com|org|net)$/i.test(url.hostname)) return undefined;
  return url.toString().replace(/\/+$/, "");
}

/**
 * The link to a live sample: the environment variable first, then studio.json, then (only while
 * developing) the local address. With none of those there is no link, and the page shows no
 * "open the live sample" button rather than a dead one.
 */
export function resolveDemoUrl(
  key: DemoKey,
  sources: { env?: string; studio?: string; development: boolean },
): string | undefined {
  return (
    cleanDemoUrl(sources.env) ??
    cleanDemoUrl(sources.studio) ??
    (sources.development ? DEMO_DEV_URLS[key] : undefined)
  );
}

// Written out in full so that Next.js can inline each value at build time.
const ENV_URLS: Record<DemoKey, string | undefined> = {
  hibana: process.env.NEXT_PUBLIC_DEMO_HIBANA_URL,
  bulmat: process.env.NEXT_PUBLIC_DEMO_BULMAT_URL,
};

export const demoUrls: Record<DemoKey, string | undefined> = {
  hibana: resolveDemoUrl("hibana", {
    env: ENV_URLS.hibana,
    studio: studio.demos.hibana.url,
    development: process.env.NODE_ENV === "development",
  }),
  bulmat: resolveDemoUrl("bulmat", {
    env: ENV_URLS.bulmat,
    studio: studio.demos.bulmat.url,
    development: process.env.NODE_ENV === "development",
  }),
};
