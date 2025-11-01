const buckets = new Map<string, { tokens: number; lastRefill: number }>();

export function rateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: limit, lastRefill: now };
  // refill
  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const refill = Math.floor(elapsed / windowMs) * limit;
    bucket.tokens = Math.min(limit, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { ok: true, remaining: bucket.tokens };
  }

  return { ok: false, remaining: 0 };
}
