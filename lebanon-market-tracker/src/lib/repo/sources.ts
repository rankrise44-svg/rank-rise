import "server-only";
import { query, queryOne } from "../db";
import type { SourceRow } from "../ingestion/types";

export type SourceWithStats = SourceRow & {
  credential_hint: string | null;
  last_run_status: string | null;
  last_run_at: Date | null;
  last_run_error: string | null;
  records: string;
};

export async function listSources(): Promise<SourceWithStats[]> {
  return query<SourceWithStats>(
    `SELECT s.*, c.key_hint AS credential_hint, r.status AS last_run_status, r.started_at AS last_run_at, r.error_message AS last_run_error,
            (SELECT count(*) FROM news_articles WHERE source_id = s.id) + (SELECT count(*) FROM indicator_observations WHERE source_id = s.id)
            + (SELECT count(*) FROM market_observations WHERE source_id = s.id) + (SELECT count(*) FROM price_observations WHERE source_id = s.id) AS records
       FROM sources s
       LEFT JOIN source_credentials c ON c.source_id = s.id
       LEFT JOIN LATERAL (SELECT status, started_at, error_message FROM ingestion_runs WHERE source_id = s.id ORDER BY started_at DESC LIMIT 1) r ON true
      ORDER BY s.enabled DESC, s.source_type, s.name`,
  );
}

export async function getSourceByKey(key: string) {
  return queryOne<SourceRow>("SELECT * FROM sources WHERE key = $1", [key]);
}

export async function getSourceById(id: string) {
  return queryOne<SourceRow>("SELECT * FROM sources WHERE id = $1", [id]);
}

export async function recentRuns(sourceId: string, limit = 10) {
  return query<{ id: string; trigger: string; status: string; started_at: Date; finished_at: Date | null; records_fetched: number; records_inserted: number; records_updated: number; records_skipped: number; error_message: string | null; log: unknown[] }>(
    "SELECT id, trigger, status, started_at, finished_at, records_fetched, records_inserted, records_updated, records_skipped, error_message, log FROM ingestion_runs WHERE source_id = $1 ORDER BY started_at DESC LIMIT $2",
    [sourceId, limit],
  );
}

export type FreshnessSummary = { total: number; enabled: number; ok: number; failing: number; blocked: number; needsCredentials: number; lastSuccess: Date | null };

export async function freshnessSummary(): Promise<FreshnessSummary> {
  const r = await queryOne<{ total: string; enabled: string; ok: string; failing: string; blocked: string; creds: string; last: Date | null }>(
    `SELECT count(*) AS total, count(*) FILTER (WHERE enabled) AS enabled,
            count(*) FILTER (WHERE enabled AND status IN ('ok')) AS ok,
            count(*) FILTER (WHERE enabled AND status IN ('error','partial')) AS failing,
            count(*) FILTER (WHERE status = 'blocked') AS blocked,
            count(*) FILTER (WHERE status = 'needs_credentials') AS creds,
            max(last_success_at) AS last
       FROM sources WHERE connector <> 'manual'`,
  );
  return {
    total: Number(r?.total ?? 0), enabled: Number(r?.enabled ?? 0), ok: Number(r?.ok ?? 0), failing: Number(r?.failing ?? 0),
    blocked: Number(r?.blocked ?? 0), needsCredentials: Number(r?.creds ?? 0), lastSuccess: r?.last ?? null,
  };
}
