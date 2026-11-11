import { todayIn, validate } from "@/lib/forms/definitions";
import { buildSubmission, business, formSecret, getFormDef, inboxSettings } from "@/lib/forms/server";
import { deliver } from "@/lib/inbox";
import { rateLimit } from "@/lib/inbox/ratelimit";
import { verifyToken } from "@/lib/inbox/token";
import { site } from "@/lib/site";

const MAX_BODY_CHARS = 20_000;

function reply(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * Receives contact and catering forms.
 *
 * Order matters: cheap checks first, and nothing is recorded or emailed until the
 * submission has passed every one of them. Nothing here ever confirms a booking.
 */
export async function POST(request: Request) {
  // Browsers label cross-site requests. Forms on other websites may not post here.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return reply(403, { ok: false, error: "forbidden" });
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return reply(415, { ok: false, error: "unsupported_media_type" });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return reply(413, { ok: false, error: "too_large" });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400, { ok: false, error: "bad_request" });
  }

  const def = getFormDef(body.kind);
  if (!def) return reply(404, { ok: false, error: "unknown_form" });

  // Honeypot: a field people cannot see. Anything in it means a bot. Answer as if it worked.
  if (typeof body.company_website === "string" && body.company_website.trim() !== "") {
    return reply(200, { ok: true, id: "received" });
  }

  const limit = rateLimit(`${def.kind}:${clientIp(request)}`, 8, 10 * 60 * 1000);
  if (!limit.ok) {
    return reply(429, { ok: false, error: "rate_limited" }, { "Retry-After": String(limit.retryAfterSeconds) });
  }

  const token = verifyToken(formSecret, body.token);
  if (!token.ok) return reply(400, { ok: false, error: "token", reason: token.reason });

  const rawValues =
    typeof body.values === "object" && body.values !== null ? (body.values as Record<string, unknown>) : {};
  const result = validate(def, rawValues, { today: todayIn(site.timezone), phone: site.contact.phone });
  if (!result.ok) return reply(422, { ok: false, error: "validation", fieldErrors: result.errors });

  // Spend the token only once everything else is in order, so a typo does not cost the visitor a retry.
  const spend = verifyToken(formSecret, body.token, { consume: true });
  if (!spend.ok) return reply(400, { ok: false, error: "token", reason: spend.reason });

  const submission = buildSubmission(def, result.values, new Date());
  const delivery = await deliver(submission, business, inboxSettings);

  if (!delivery.ok) {
    // Log the reference and the cause, never the customer's details.
    console.error(`[inbox] ${submission.id} (${def.kind}) was not delivered via ${delivery.driver}: ${delivery.error}`);
    return reply(502, { ok: false, error: "delivery" });
  }

  console.info(`[inbox] ${submission.id} (${def.kind}) delivered via ${delivery.driver}`);
  return reply(200, { ok: true, id: submission.id, ...(delivery.preview ? { preview: delivery.preview } : {}) });
}
