import type { Pool } from "pg";
import { evaluateAlerts } from "./alerts/evaluate";
import { realDeps } from "./ingestion/deps";
import { runConnector, type RunReport } from "./ingestion/runner";
import type { SourceRow } from "./ingestion/types";

/**
 * One scheduler tick: mark interrupted runs, run due sources within a time budget, evaluate alerts,
 * and apply raw-payload retention. Safe to call concurrently (advisory lock).
 */
export async function schedulerTick(pool: Pool, opts: { budgetMs?: number; trigger?: "schedule" | "cli" } = {}) {
  const budget = opts.budgetMs ?? 240_000;
  const t0 = Date.now();
  const lock = await pool.query<{ ok: boolean }>("SELECT pg_try_advisory_lock(424242) AS ok");
  if (!lock.rows[0].ok) return { skipped: "another tick is running" };
  const reports: Pick<RunReport, "sourceKey" | "status" | "inserted" | "error">[] = [];
  try {
    await pool.query(
      "UPDATE ingestion_runs SET status = 'failed', finished_at = now(), error_message = 'Interrupted (process stopped before completion)' WHERE status = 'running' AND started_at < now() - interval '30 minutes'",
    );
    const due = await pool.query<SourceRow>(
      `SELECT * FROM sources WHERE enabled AND connector NOT IN ('manual','unavailable') AND schedule_minutes IS NOT NULL
         AND status <> 'needs_credentials'
         AND (last_attempt_at IS NULL OR last_attempt_at < now() - make_interval(mins => schedule_minutes))
       ORDER BY last_attempt_at NULLS FIRST LIMIT 25`,
    );
    for (const s of due.rows) {
      if (Date.now() - t0 > budget) break;
      const r = await runConnector(s, opts.trigger ?? "schedule", realDeps(pool));
      reports.push({ sourceKey: r.sourceKey, status: r.status, inserted: r.inserted, error: r.error });
    }
    const notifications = await evaluateAlerts(pool);
    const purged = await pool.query("DELETE FROM raw_payloads WHERE expires_at < now()");
    await pool.query("DELETE FROM rate_limits WHERE refilled_at < now() - interval '1 day'");
    return { ran: reports, notifications, purgedPayloads: purged.rowCount ?? 0, ms: Date.now() - t0 };
  } finally {
    await pool.query("SELECT pg_advisory_unlock(424242)");
  }
}
