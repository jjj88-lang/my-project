import { deliverDemo } from "./drivers/demo";
import { deliverGoogle } from "./drivers/google";
import { deliverLocal } from "./drivers/local";
import type { Business, Delivery, InboxSettings, Submission } from "./types";

export * from "./types";

/**
 * Decide where inquiries go from environment variables.
 *
 *   INBOX_DRIVER         demo | local | google   (optional: normally worked out automatically)
 *   INBOX_GOOGLE_URL     the Apps Script web app URL ending in /exec
 *   INBOX_GOOGLE_SECRET  the shared secret saved in the script's properties
 *
 * Sample sites default to "demo". A real site with no backend configured refuses submissions
 * and tells the visitor to call, rather than pretending a message was delivered.
 */
export function resolveInboxSettings(opts: {
  sample: boolean;
  env?: Record<string, string | undefined>;
  dataDir: string;
}): InboxSettings {
  const env = opts.env ?? process.env;
  const url = env.INBOX_GOOGLE_URL?.trim();
  const secret = env.INBOX_GOOGLE_SECRET?.trim();
  const explicit = env.INBOX_DRIVER?.trim().toLowerCase();
  const production = env.NODE_ENV === "production";

  const google = (): InboxSettings => {
    if (!url || !secret) {
      return { driver: "unconfigured", reason: "INBOX_GOOGLE_URL and INBOX_GOOGLE_SECRET must both be set." };
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
      return {
        driver: "unconfigured",
        reason: "INBOX_GOOGLE_URL must look like https://script.google.com/macros/s/.../exec",
      };
    }
    if (secret.length < 24) {
      return { driver: "unconfigured", reason: "INBOX_GOOGLE_SECRET is too short. Use at least 24 random characters." };
    }
    return { driver: "google", url, secret };
  };

  if (explicit === "demo") return { driver: "demo" };
  if (explicit === "local") return { driver: "local", dir: opts.dataDir };
  if (explicit === "google") return google();
  if (explicit) return { driver: "unconfigured", reason: `Unknown INBOX_DRIVER "${explicit}".` };

  if (opts.sample) return { driver: "demo" };
  if (url || secret) return google();
  if (!production) return { driver: "local", dir: opts.dataDir };
  return { driver: "unconfigured", reason: "No inbox backend is configured for this site." };
}

export async function deliver(submission: Submission, business: Business, settings: InboxSettings): Promise<Delivery> {
  switch (settings.driver) {
    case "demo":
      return deliverDemo(submission, business);
    case "local":
      return deliverLocal(submission, business, settings.dir);
    case "google":
      return deliverGoogle(submission, settings.url, settings.secret);
    case "unconfigured":
      return { ok: false, driver: "unconfigured", error: settings.reason };
  }
}

const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O or 1/I, so it can be read over the phone

/** e.g. makeReference("CAT", "2026-12-12") -> "CAT-20261212-7F3K" */
export function makeReference(prefix: string, isoDate: string, random: () => number = Math.random): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)];
  return `${prefix}-${isoDate.replace(/-/g, "")}-${suffix}`;
}

/** "Wed, Nov 11, 2026 at 2:05 PM" in the given time zone, built from parts so it is identical everywhere. */
export function formatLocalTimestamp(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")}, ${get("month")} ${get("day")}, ${get("year")} at ${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
}
