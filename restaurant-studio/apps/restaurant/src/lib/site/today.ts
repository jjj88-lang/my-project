import "server-only";

import { cacheLife } from "next/cache";

import { localNow } from "./hours";
import { site } from "./index";

/**
 * Today's date in the restaurant's time zone. Cached for a few hours so pages stay
 * static while date-dependent details (announcements, holiday hours, the footer year) stay current.
 */
export async function getToday(): Promise<{ date: string; year: number }> {
  "use cache";
  cacheLife("hours");
  const local = localNow(new Date(), site.timezone);
  return { date: local.date, year: Number(local.date.slice(0, 4)) };
}
