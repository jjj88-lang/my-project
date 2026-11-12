/**
 * A small fixed-window rate limiter kept in memory.
 *
 * It is per server instance, so on serverless hosting it slows abuse down rather than
 * guaranteeing a hard cap. Together with the form token and honeypot that is enough for a
 * low-traffic restaurant site; if spam ever becomes a real problem, add Cloudflare Turnstile.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): { ok: boolean; retryAfterSeconds: number } {
  if (windows.size > 2000) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  if (current.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** For tests. */
export function resetRateLimits() {
  windows.clear();
}
