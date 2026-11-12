import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed, short-lived form tokens.
 *
 * The browser asks for a token when a form appears and sends it back with the submission.
 * A submission is accepted only if the token is genuine, at least a few seconds old
 * (people do not fill forms in under three seconds, scripts do), not expired, and unused.
 * Bots that post straight to the endpoint without loading the page have no token at all.
 */

export const MIN_AGE_MS = 2_500;
export const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type TokenCheck = { ok: true } | { ok: false; reason: "malformed" | "signature" | "too-fast" | "expired" | "replayed" };

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueToken(secret: string, now: number = Date.now()): string {
  const payload = `${now.toString(36)}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(secret, payload)}`;
}

const used = new Map<string, number>(); // nonce -> expiry time

function prune(now: number) {
  if (used.size < 500) return;
  for (const [nonce, expires] of used) if (expires <= now) used.delete(nonce);
}

/**
 * Verify a token. With `consume`, a valid token is also marked as used so it cannot be replayed.
 * (The used-token list is per server instance: a best-effort measure on serverless hosting.)
 */
export function verifyToken(
  secret: string,
  token: unknown,
  { now = Date.now(), consume = false }: { now?: number; consume?: boolean } = {},
): TokenCheck {
  if (typeof token !== "string" || token.length > 200) return { ok: false, reason: "malformed" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [issuedRaw, nonce, signature] = parts;
  const issued = parseInt(issuedRaw, 36);
  if (!Number.isFinite(issued) || !nonce || !signature) return { ok: false, reason: "malformed" };

  const expected = Buffer.from(sign(secret, `${issuedRaw}.${nonce}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "signature" };

  const age = now - issued;
  if (age < MIN_AGE_MS) return { ok: false, reason: "too-fast" };
  if (age > MAX_AGE_MS) return { ok: false, reason: "expired" };

  if (used.has(nonce)) return { ok: false, reason: "replayed" };
  if (consume) {
    prune(now);
    used.set(nonce, issued + MAX_AGE_MS);
  }
  return { ok: true };
}

/** For tests. */
export function resetUsedTokens() {
  used.clear();
}
