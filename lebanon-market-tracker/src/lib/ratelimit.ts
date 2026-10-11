import "server-only";
import { query } from "./db";
import { HttpError } from "./auth/guard";

const memory = new Map<string, { tokens: number; at: number }>();

function memoryTake(bucket: string, capacity: number, refillPerSec: number): boolean {
  const now = Date.now();
  const b = memory.get(bucket) ?? { tokens: capacity, at: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.at) / 1000) * refillPerSec);
  b.at = now;
  const ok = b.tokens >= 1;
  if (ok) b.tokens -= 1;
  memory.set(bucket, b);
  return ok;
}

/**
 * Token-bucket rate limit, persisted in PostgreSQL so it holds across serverless instances.
 * Falls back to an in-process bucket when the database is unavailable.
 */
export async function rateLimit(bucket: string, capacity: number, refillPerSec: number): Promise<void> {
  let allowed: boolean;
  try {
    const rows = await query<{ tokens: number }>(
      `INSERT INTO rate_limits (bucket, tokens, refilled_at) VALUES ($1, $2::double precision - 1, now())
       ON CONFLICT (bucket) DO UPDATE SET
         tokens = GREATEST(-1, LEAST($2::double precision,
                   rate_limits.tokens + EXTRACT(EPOCH FROM (now() - rate_limits.refilled_at)) * $3::double precision) - 1),
         refilled_at = now()
       RETURNING tokens`,
      [bucket, capacity, refillPerSec],
    );
    allowed = rows[0].tokens >= 0;
  } catch {
    allowed = memoryTake(bucket, capacity, refillPerSec);
  }
  if (!allowed) throw new HttpError(429, "Too many requests, please slow down", "rate_limited");
}
