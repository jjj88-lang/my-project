import { formSecret } from "@/lib/forms/server";
import { rateLimit } from "@/lib/inbox/ratelimit";
import { issueToken } from "@/lib/inbox/token";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Hands the browser a signed token to send back with a form submission. */
export async function POST(request: Request) {
  const limit = rateLimit(`token:${clientIp(request)}`, 40, 10 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }
  return Response.json({ ok: true, token: issueToken(formSecret) }, { headers: { "Cache-Control": "no-store" } });
}
