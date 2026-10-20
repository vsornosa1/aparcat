interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

/**
 * Ventana fija en memoria. Suficiente para una instancia; si se escala
 * horizontalmente hará falta Redis o equivalente.
 */
export function consumeRateLimit(key: string, rule: RateLimitRule, now = Date.now()): boolean {
  if (buckets.size > MAX_BUCKETS) pruneExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return true;
  }

  if (bucket.count >= rule.limit) return false;

  bucket.count += 1;
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
