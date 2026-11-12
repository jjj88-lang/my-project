import "server-only";

import { cacheLife } from "next/cache";

/**
 * The current year, for the footer. Reading the clock is not allowed while a page is being
 * prerendered, so the value is cached and refreshed in the background about once a day.
 */
export async function getYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
