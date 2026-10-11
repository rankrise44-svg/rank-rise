import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getEnv } from "./env";

declare global {
  var __lmtPool: Pool | undefined;
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function getPool(): Pool {
  const env = getEnv();
  if (!env.DATABASE_URL) throw new DatabaseNotConfiguredError();
  if (!globalThis.__lmtPool) {
    globalThis.__lmtPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 20_000,
      ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
    });
  }
  return globalThis.__lmtPool;
}

/** Parameterized query helper. Never interpolate user input into `text`. */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export type DbHealth = { ok: true; latencyMs: number } | { ok: false; reason: "not_configured" | "unreachable" | "not_migrated"; message: string };

export async function dbHealth(): Promise<DbHealth> {
  const t0 = Date.now();
  try {
    await query("SELECT 1 FROM sources LIMIT 1");
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (e) {
    if (e instanceof DatabaseNotConfiguredError) return { ok: false, reason: "not_configured", message: e.message };
    const msg = (e as Error).message;
    if (/relation .* does not exist/.test(msg)) return { ok: false, reason: "not_migrated", message: msg };
    return { ok: false, reason: "unreachable", message: msg };
  }
}
