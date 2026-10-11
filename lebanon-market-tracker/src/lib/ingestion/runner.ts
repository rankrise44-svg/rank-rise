import { httpGet, httpGetJson, HttpFetchError, type FetchOptions } from "./http";
import { sha256 } from "./normalize";
import { dedupeBatch, storeRecords, type Queryable, type StoreStats } from "./store";
import {
  ConnectorConfigError,
  type Connector,
  type ConnectorContext,
  type LogEntry,
  type Logger,
  type NormalizedRecord,
  type SourceRow,
  type ValidationIssue,
} from "./types";

export type RunTrigger = "manual" | "schedule" | "test" | "cli";

export type RunReport = {
  runId: string | null;
  sourceKey: string;
  status: "success" | "partial" | "failed" | "skipped";
  mode: "full" | "test";
  fetched: number;
  valid: number;
  invalid: number;
  inserted: number;
  updated: number;
  skipped: number;
  durationMs: number;
  error?: string;
  issues: ValidationIssue[];
  sample: NormalizedRecord[];
  stats?: StoreStats;
};

export type RunnerDeps = {
  db: Queryable;
  connectors: Record<string, Connector<any, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  getCredential: (source: SourceRow) => Promise<string | null>;
  retentionDays: number;
  afterStore?: (db: Queryable, stats: StoreStats, source: SourceRow) => Promise<void>;
  fetchOptions?: Partial<FetchOptions>;
  now?: () => Date;
};

export function createLogger(scope: Record<string, unknown>, echo = true): Logger {
  const entries: LogEntry[] = [];
  const push = (level: LogEntry["level"], msg: string, data?: Record<string, unknown>) => {
    const e: LogEntry = { t: new Date().toISOString(), level, msg, ...(data ? { data } : {}) };
    entries.push(e);
    if (echo && process.env.NODE_ENV !== "test") console.log(JSON.stringify({ ...scope, ...e }));
  };
  return {
    entries,
    info: (m, d) => push("info", m, d),
    warn: (m, d) => push("warn", m, d),
    error: (m, d) => push("error", m, d),
  };
}

/**
 * Executes one source: fetch → validate → normalize → dedupe → store → post-process → report.
 * On failure the run and source are marked failed and previously stored data is left untouched.
 * In "test" mode nothing is stored: the connector is exercised end-to-end and a sample returned.
 */
export async function runConnector(source: SourceRow, trigger: RunTrigger, deps: RunnerDeps): Promise<RunReport> {
  const t0 = Date.now();
  const now = deps.now?.() ?? new Date();
  const mode = trigger === "test" ? "test" : "full";
  const log = createLogger({ source: source.key, trigger });
  const report: RunReport = {
    runId: null, sourceKey: source.key, status: "failed", mode, fetched: 0, valid: 0, invalid: 0,
    inserted: 0, updated: 0, skipped: 0, durationMs: 0, issues: [], sample: [],
  };

  if (!source.enabled && trigger === "schedule") {
    report.status = "skipped";
    return report;
  }

  const run = await deps.db.query<{ id: string }>(
    "INSERT INTO ingestion_runs (source_id, trigger, params) VALUES ($1,$2,$3) RETURNING id",
    [source.id, trigger, JSON.stringify({ mode })],
  );
  report.runId = run.rows[0].id;
  await deps.db.query("UPDATE sources SET last_attempt_at = now() WHERE id = $1", [source.id]);

  let sourceStatus: string = "error";
  try {
    const connector = deps.connectors[source.connector];
    if (!connector) throw new ConnectorConfigError(`No connector implementation named "${source.connector}"`);
    const credential = await deps.getCredential(source);
    if (connector.requiresCredential && !credential) {
      throw new ConnectorConfigError("This source requires an API key. Add it in المصادر والبيانات → إعداد المفتاح.", "needs_credentials");
    }
    const ctx: ConnectorContext = {
      source,
      credential,
      log,
      since: source.last_success_at,
      mode,
      now,
      http: {
        get: (url, o) => httpGet(url, { ...deps.fetchOptions, ...o }),
        getJson: (url, o) => httpGetJson(url, { ...deps.fetchOptions, ...o }),
      },
    };

    log.info("fetch started");
    const fetched = await connector.fetch(ctx);
    for (const pe of fetched.partialErrors ?? []) log.warn("partial fetch error", { error: pe });

    if (mode === "full" && deps.retentionDays > 0) {
      for (const p of fetched.payloads) {
        await deps.db.query(
          `INSERT INTO raw_payloads (source_id, ingestion_run_id, request_url, content_type, body, sha256, expires_at)
           VALUES ($1,$2,$3,$4,$5,$6, now() + ($7 || ' days')::interval)`,
          [source.id, report.runId, p.url, p.contentType, p.body.slice(0, 2_000_000), sha256(p.body), String(deps.retentionDays)],
        );
      }
    }

    const { items, issues } = connector.validate(fetched.raw, ctx);
    report.fetched = items.length + issues.length;
    report.invalid = issues.length;
    report.issues = issues.slice(0, 20);
    if (issues.length) log.warn("validation issues", { count: issues.length, first: issues[0] });

    const normalized = connector.normalize(items, ctx);
    const { unique, duplicates } = dedupeBatch(normalized);
    report.valid = unique.length;
    report.sample = unique.slice(0, 5);
    log.info("normalized", { records: normalized.length, batchDuplicates: duplicates });

    if (mode === "full") {
      const stats = await storeRecords(deps.db, source.id, report.runId, unique);
      report.inserted = stats.inserted;
      report.updated = stats.updated;
      report.skipped = stats.skipped + duplicates;
      report.stats = stats;
      if (deps.afterStore) {
        try {
          await deps.afterStore(deps.db, stats, source);
        } catch (e) {
          log.warn("post-processing failed", { error: (e as Error).message });
        }
      }
    }

    const partial = (fetched.partialErrors?.length ?? 0) > 0 || issues.length > 0;
    if (report.fetched === 0 && (fetched.partialErrors?.length ?? 0) > 0) {
      throw new Error(`All requests failed: ${fetched.partialErrors![0]}`);
    }
    report.status = partial ? "partial" : "success";
    sourceStatus = partial ? "partial" : "ok";
    log.info("run finished", { inserted: report.inserted, updated: report.updated, skipped: report.skipped });
  } catch (e) {
    const err = e as Error;
    report.status = "failed";
    report.error = err.message;
    if (e instanceof ConnectorConfigError) sourceStatus = e.status;
    else if (e instanceof HttpFetchError && e.status === 403) sourceStatus = "blocked";
    log.error("run failed", { error: err.message, ...(e instanceof HttpFetchError ? { status: e.status, url: e.url } : {}) });
  }

  report.durationMs = Date.now() - t0;
  await deps.db.query(
    `UPDATE ingestion_runs SET status=$2, finished_at=now(), records_fetched=$3, records_inserted=$4, records_updated=$5,
        records_skipped=$6, error_message=$7, log=$8 WHERE id=$1`,
    [report.runId, report.status, report.fetched, report.inserted, report.updated,
      report.skipped, report.error ?? null, JSON.stringify(log.entries.slice(-200))],
  );
  // Test runs report their outcome but do not change the source's freshness timestamps.
  if (mode === "full") {
    if (report.status === "failed") {
      await deps.db.query("UPDATE sources SET status=$2, last_error=$3, last_error_at=now() WHERE id=$1", [source.id, sourceStatus, report.error]);
    } else {
      await deps.db.query(
        "UPDATE sources SET status=$2, last_success_at=now(), last_error = CASE WHEN $2 = 'ok' THEN NULL ELSE last_error END WHERE id=$1",
        [source.id, sourceStatus],
      );
    }
  }
  return report;
}
