import { clientIp, formSecret } from "@/lib/forms/server";
import { rateLimit } from "@/lib/inbox/ratelimit";
import { issueToken } from "@/lib/inbox/token";

/**
 * Hands the browser a signed token to send back with a form submission.
 * The limit is generous because a token is requested on every visit to a page with a form,
 * and many guests can share one address (restaurant Wi-Fi, an office, a campus).
 */
export async function POST(request: Request) {
  const limit = rateLimit(`token:${clientIp(request)}`, 120, 10 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }
  return Response.json({ ok: true, token: issueToken(formSecret) }, { headers: { "Cache-Control": "no-store" } });
}
