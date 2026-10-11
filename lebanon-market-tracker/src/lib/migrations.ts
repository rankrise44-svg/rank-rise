import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Client, Pool } from "pg";

export const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

export type MigrationResult = { applied: string[]; skipped: string[] };

/**
 * Applies pending SQL migrations in filename order, each inside its own transaction.
 * Applied migrations are recorded with a checksum; editing an already-applied file is an error
 * (write a new migration instead).
 */
export async function runMigrations(db: Pool | Client, dir = MIGRATIONS_DIR): Promise<MigrationResult> {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
  // Serialize concurrent runners.
  await db.query("SELECT pg_advisory_lock(727274)");
  try {
    const files = (await readdir(dir)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
    const { rows } = await db.query<{ name: string; checksum: string }>("SELECT name, checksum FROM schema_migrations");
    const done = new Map(rows.map((r) => [r.name, r.checksum]));
    const result: MigrationResult = { applied: [], skipped: [] };
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const prev = done.get(file);
      if (prev) {
        if (prev !== checksum) throw new Error(`Migration ${file} was modified after being applied`);
        result.skipped.push(file);
        continue;
      }
      await db.query("BEGIN");
      try {
        await db.query(sql);
        await db.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [file, checksum]);
        await db.query("COMMIT");
        result.applied.push(file);
      } catch (e) {
        await db.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
      }
    }
    return result;
  } finally {
    await db.query("SELECT pg_advisory_unlock(727274)");
  }
}
