import { safeCell } from "../messages";
import type { Delivery, Submission } from "../types";

const TIMEOUT_MS = 12_000;

/**
 * Google driver. Posts the inquiry to the client's Google Apps Script web app, which appends a
 * row to their Google Sheet, emails the owner, and sends the customer an acknowledgment from the
 * restaurant's own Google account. See automation/google-sheets-inbox/.
 *
 * The script ignores a submission whose reference it has already recorded, so retrying is safe.
 */
export async function deliverGoogle(
  submission: Submission,
  url: string,
  secret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Delivery> {
  const body = JSON.stringify({
    version: 1,
    secret,
    ...submission,
    fields: submission.fields.map((f) => ({ label: f.label, value: safeCell(f.value) })),
  });

  let lastError = "unknown error";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        // Apps Script web apps answer a POST with a redirect to the result; fetch follows it.
        redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const text = await response.text();
      let result: { ok?: boolean; error?: string } | undefined;
      try {
        result = JSON.parse(text) as { ok?: boolean; error?: string };
      } catch {
        // An HTML page here usually means the script is not deployed as a web app open to "Anyone".
        lastError = `The script answered with something that is not JSON (HTTP ${response.status}).`;
        continue;
      }
      if (result?.ok === true) return { ok: true, driver: "google" };
      lastError = result?.error ?? `The script reported a failure (HTTP ${response.status}).`;
      // The script understood the request and refused it (bad secret, invalid data): do not retry.
      return { ok: false, driver: "google", error: lastError };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, driver: "google", error: lastError };
}
