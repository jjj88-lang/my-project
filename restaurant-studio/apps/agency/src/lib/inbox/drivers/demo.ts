import { buildPreview } from "../messages";
import type { Business, Delivery, Submission } from "../types";

/**
 * Demo driver, used on fictional sample sites. Nothing is stored and no email is sent:
 * it only returns what a live site would have recorded and sent, so the page can show it.
 */
export async function deliverDemo(submission: Submission, business: Business): Promise<Delivery> {
  return { ok: true, driver: "demo", preview: buildPreview(submission, business) };
}
