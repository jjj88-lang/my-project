import "server-only";

import path from "node:path";

import { BUILD_SECRET } from "@/generated/secret";
import {
  deliver,
  formatLocalTimestamp,
  makeReference,
  resolveInboxSettings,
  type Business,
  type InboxSettings,
  type Submission,
} from "@/lib/inbox";
import { rateLimit } from "@/lib/inbox/ratelimit";
import { issueToken, verifyToken } from "@/lib/inbox/token";
import { siteUrl, studio } from "@/lib/studio";

import {
  HONEYPOT_FIELD,
  LEAD_FIELDS,
  LEAD_KIND,
  LEAD_KIND_LABEL,
  LEAD_REFERENCE_PREFIX,
  validateLead,
  type LeadValues,
} from "./definition";

const MAX_BODY_BYTES = 20_000;
const DEFAULT_TIME_ZONE = "America/Chicago";

/** Everything the handlers read from the outside world, so tests can replace each piece. */
export type LeadDeps = {
  env: Record<string, string | undefined>;
  /** Where the "local" inbox driver writes during development. */
  dataDir: string;
  now: () => Date;
};

function resolveDeps(overrides: Partial<LeadDeps>): LeadDeps {
  return {
    env: overrides.env ?? process.env,
    dataDir: overrides.dataDir ?? path.join(process.cwd(), "data"),
    now: overrides.now ?? (() => new Date()),
  };
}

/** Signs form tokens. FORM_SECRET (32 or more characters) overrides the per-build secret. */
export function formSecret(env: Record<string, string | undefined> = process.env): string {
  const fromEnv = env.FORM_SECRET?.trim();
  return fromEnv && fromEnv.length >= 32 ? fromEnv : BUILD_SECRET;
}

/**
 * Where leads go. In development with nothing set they are written under data/. In production
 * the Google Sheets backend must be configured; otherwise the form refuses to send.
 */
export function leadInbox(env: Record<string, string | undefined>, dataDir: string): InboxSettings {
  const settings = resolveInboxSettings({ sample: false, env, dataDir });
  // The demo driver keeps nothing and emails nobody: it exists for the fictional sample sites.
  // Here it would report a request as received and then drop it, so it counts as not set up.
  if (settings.driver === "demo") {
    return {
      driver: "unconfigured",
      reason: 'INBOX_DRIVER "demo" keeps nothing, so it cannot take real requests. Use "google", or "local" on your own machine.',
    };
  }
  return settings;
}

function timeZoneFrom(env: Record<string, string | undefined>): string {
  const zone = env.STUDIO_TIMEZONE?.trim();
  if (!zone) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Today's date ("YYYY-MM-DD") in a given IANA time zone. */
export function todayIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The studio as the inbox library sees it. Placeholders are passed through as they are. */
export const studioBusiness: Business = {
  name: studio.name,
  phone: studio.phone,
  address: studio.mailingAddress,
  ownerEmail: studio.email,
};

export function buildLeadSubmission(values: LeadValues, now: Date, timeZone: string): Submission {
  return {
    id: makeReference(LEAD_REFERENCE_PREFIX, todayIn(timeZone, now)),
    kind: LEAD_KIND,
    kindLabel: LEAD_KIND_LABEL,
    submittedAt: now.toISOString(),
    submittedAtLocal: formatLocalTimestamp(now, timeZone),
    source: new URL(siteUrl).host,
    customer: { name: values.name, email: values.email },
    // The subject line gets the chosen option only, never free text the visitor typed.
    summary: values.need,
    ackSummary: "",
    fields: LEAD_FIELDS.map((field) => ({ label: field.label, value: values[field.name] ?? "" })),
  };
}

function reply(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * True when a browser says the request came from another website. Current browsers label every
 * request with Sec-Fetch-Site; for older ones the Origin header is compared with the host.
 */
function fromAnotherSite(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite !== "same-origin" && fetchSite !== "none";

  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/** Read the request body as text, giving up as soon as it grows past `maxBytes`. */
async function readBody(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/**
 * Receives the consultation request form.
 *
 * Cheap checks come first, and nothing is recorded or emailed until a submission has passed
 * every one of them. When the inbox is not configured the answer says so: the form never
 * reports a message as sent unless the inbox accepted it.
 */
export async function handleLead(request: Request, overrides: Partial<LeadDeps> = {}): Promise<Response> {
  const deps = resolveDeps(overrides);
  const secret = formSecret(deps.env);

  if (fromAnotherSite(request)) return reply(403, { ok: false, error: "forbidden" });
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return reply(415, { ok: false, error: "unsupported_media_type" });
  }

  const text = await readBody(request, MAX_BODY_BYTES);
  if (text === null) return reply(413, { ok: false, error: "too_large" });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400, { ok: false, error: "bad_request" });
  }

  // Honeypot: a field people cannot see. Anything in it means a script filled the form in.
  // The answer is an honest refusal, so a person who somehow tripped it is told to email instead.
  const trap = body[HONEYPOT_FIELD];
  if (typeof trap === "string" ? trap.trim() !== "" : trap !== undefined && trap !== null) {
    return reply(400, { ok: false, error: "rejected" });
  }

  const limit = rateLimit(`${LEAD_KIND}:${clientIp(request)}`, 8, 10 * 60 * 1000, deps.now().getTime());
  if (!limit.ok) {
    return reply(429, { ok: false, error: "rate_limited" }, { "Retry-After": String(limit.retryAfterSeconds) });
  }

  const token = verifyToken(secret, body.token, { now: deps.now().getTime() });
  if (!token.ok) return reply(400, { ok: false, error: "token", reason: token.reason });

  const settings = leadInbox(deps.env, deps.dataDir);
  if (settings.driver === "unconfigured") {
    console.error(`[lead] A request could not be accepted because the inbox is not configured: ${settings.reason}`);
    return reply(503, { ok: false, error: "unconfigured" });
  }

  const rawValues =
    typeof body.values === "object" && body.values !== null && !Array.isArray(body.values)
      ? (body.values as Record<string, unknown>)
      : {};
  const result = validateLead(rawValues);
  if (!result.ok) return reply(422, { ok: false, error: "validation", fieldErrors: result.errors });

  // Spend the token only once everything else is in order, so a typo does not cost the visitor a retry.
  const spend = verifyToken(secret, body.token, { now: deps.now().getTime(), consume: true });
  if (!spend.ok) return reply(400, { ok: false, error: "token", reason: spend.reason });

  const now = deps.now();
  const submission = buildLeadSubmission(result.values, now, timeZoneFrom(deps.env));
  const delivery = await deliver(submission, studioBusiness, settings);

  if (!delivery.ok) {
    // Log the reference and the cause, never the person's details.
    console.error(`[lead] ${submission.id} was not delivered via ${delivery.driver}: ${delivery.error}`);
    return reply(502, { ok: false, error: "delivery" });
  }

  console.info(`[lead] ${submission.id} delivered via ${delivery.driver}`);
  return reply(200, { ok: true, id: submission.id });
}

/**
 * Hands the browser a signed token to send back with the form. Also says whether the form can
 * accept requests at all, so the page can point people to email before they start typing.
 */
export function handleFormToken(request: Request, overrides: Partial<LeadDeps> = {}): Response {
  const deps = resolveDeps(overrides);

  if (fromAnotherSite(request)) return reply(403, { ok: false, error: "forbidden" });

  const limit = rateLimit(`token:${clientIp(request)}`, 40, 10 * 60 * 1000, deps.now().getTime());
  if (!limit.ok) {
    return reply(429, { ok: false, error: "rate_limited" }, { "Retry-After": String(limit.retryAfterSeconds) });
  }

  const accepting = leadInbox(deps.env, deps.dataDir).driver !== "unconfigured";
  return reply(200, { ok: true, token: issueToken(formSecret(deps.env), deps.now().getTime()), accepting });
}
