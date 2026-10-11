import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { runMigrations } from "@/lib/migrations";
import { runConnector, type RunnerDeps } from "@/lib/ingestion/runner";
import { syncSystemSources } from "@/lib/ingestion/registry";
import { afterStore, seedReferenceData } from "@/lib/intel/pipeline";
import type { Connector, NormalizedRecord, SourceRow } from "@/lib/ingestion/types";
import { ConnectorConfigError } from "@/lib/ingestion/types";
import { searchNews } from "@/lib/repo/news";
import { getSeries, findIndicator } from "@/lib/repo/indicators";
import { answerQuestion } from "@/lib/assistant/orchestrator";
import { generateReport } from "@/lib/reports/generate";
import { requestForecast } from "@/lib/forecasting/requests";

const pool = getPool();
let reachable = true;

const DATA_TABLES = [
  "notifications", "alert_rules", "forecast_outcomes", "forecasts", "opportunity_assessments", "opportunity_evidence", "opportunities", "reports",
  "trend_signals", "company_observations", "companies", "event_entities", "news_articles", "events", "indicator_observations", "economic_indicators",
  "market_observations", "price_observations", "listing_observations", "listings", "raw_payloads", "ingestion_runs", "assistant_queries", "audit_log", "rate_limits",
];

async function reset() {
  await pool.query(`TRUNCATE ${DATA_TABLES.join(", ")} CASCADE`);
  await pool.query("DELETE FROM sources WHERE key LIKE 'test-%'");
}

async function testSource(connector: string, key = `test-${connector}`): Promise<SourceRow> {
  const r = await pool.query<SourceRow>(
    `INSERT INTO sources (key, connector, name, source_type, provenance, endpoint_url, enabled) VALUES ($1,$2,$3,'api','official','https://example.test', true)
     ON CONFLICT (key) DO UPDATE SET connector = EXCLUDED.connector RETURNING *`,
    [key, connector, `Test ${connector}`],
  );
  return r.rows[0];
}

/** A connector whose output is fully controlled by the test (no network). */
function fake(records: () => NormalizedRecord[], opts: { fail?: Error; requiresCredential?: boolean } = {}): Connector<NormalizedRecord[], NormalizedRecord> {
  return {
    id: "fake",
    requiresCredential: opts.requiresCredential ?? false,
    async fetch() {
      if (opts.fail) throw opts.fail;
      const recs = records();
      return { raw: recs, payloads: [{ url: "https://example.test/feed", contentType: "application/json", body: JSON.stringify(recs) }] };
    },
    validate: (raw) => ({ items: raw, issues: [] }),
    normalize: (items) => items,
  };
}

function deps(connector: Connector<NormalizedRecord[], NormalizedRecord>): RunnerDeps {
  return { db: pool, connectors: { fake: connector }, getCredential: async () => null, retentionDays: 1, afterStore: (db, stats) => afterStore(db, stats) };
}

const news = (url: string, title: string, at = "2026-10-10T08:00:00Z"): NormalizedRecord => ({
  kind: "news", url, title, summary: "ملخص قصير", language: "ar", sourceName: "Test Outlet", sourceDomain: "outlet.lb", publishedAt: new Date(at), provenance: {},
});

beforeAll(async () => {
  try {
    await pool.query("SELECT 1");
  } catch {
    reachable = false;
    return;
  }
  const first = await runMigrations(pool);
  const second = await runMigrations(pool);
  expect(second.applied).toEqual([]); // migrations are idempotent
  expect(first.applied.length + first.skipped.length).toBeGreaterThanOrEqual(3);
  await syncSystemSources(pool);
  await seedReferenceData(pool);
});

beforeEach(async (ctx) => {
  if (!reachable) ctx.skip();
  await reset();
});

afterAll(async () => {
  if (reachable) await reset();
  await pool.end();
  globalThis.__lmtPool = undefined;
});

describe("ingestion pipeline (database)", () => {
  it("stores news once, deduplicates on re-run and by canonical URL, flags near-duplicates, classifies", async () => {
    const src = await testSource("fake");
    const c = fake(() => [
      news("https://outlet.lb/a?utm_source=x", "مصرف لبنان يبقي سعر الصرف الرسمي عند 89500 ليرة"),
      news("https://www.outlet.lb/a", "duplicate by canonical url"),
      news("https://other.lb/b", "مصرف لبنان يبقي سعر الصرف الرسمي عند 89500 ليرة - النهار"),
    ]);
    const r1 = await runConnector(src, "cli", deps(c));
    expect(r1.status).toBe("success");
    expect(r1.inserted).toBe(2);
    const r2 = await runConnector(src, "cli", deps(c));
    expect(r2.inserted).toBe(0);
    const rows = await pool.query("SELECT title, duplicate_of, topics, lebanon_relevance FROM news_articles ORDER BY created_at");
    expect(rows.rowCount).toBe(2);
    expect(rows.rows[1].duplicate_of).not.toBeNull();
    expect(rows.rows[0].topics).toContain("currency");
    expect(Number(rows.rows[0].lebanon_relevance)).toBeGreaterThan(0.5);
    const src2 = await pool.query("SELECT status, last_success_at FROM sources WHERE id = $1", [src.id]);
    expect(src2.rows[0]).toMatchObject({ status: "ok" });
    expect(src2.rows[0].last_success_at).not.toBeNull();
    // Search works on Arabic text without any vector extension.
    const found = await searchNews({ q: "سعر الصرف", limit: 10, offset: 0 });
    expect(found.total).toBe(1);
  });

  it("keeps historical observations when a provider revises a value", async () => {
    const src = await testSource("fake");
    let value = 10;
    const c = fake(() => [
      {
        kind: "indicator",
        indicator: { code: "TEST.IND", countryCode: "LBN", nameEn: "Test indicator", frequency: "annual", unit: "%" },
        periodDate: "2024-01-01", periodLabel: "2024", value, isProjection: false, observedAt: new Date("2024-12-31T23:59:59Z"), sourceUrl: "https://example.test", provenance: {},
      },
    ]);
    await runConnector(src, "cli", deps(c));
    value = 12.5;
    const r = await runConnector(src, "cli", deps(c));
    expect(r.updated).toBe(1);
    const all = await pool.query("SELECT value, is_current, superseded_at, provenance FROM indicator_observations ORDER BY collected_at");
    expect(all.rowCount).toBe(2);
    expect(all.rows[0]).toMatchObject({ is_current: false });
    expect(all.rows[0].superseded_at).not.toBeNull();
    expect(all.rows[1]).toMatchObject({ is_current: true, value: "12.5" });
    expect(all.rows[1].provenance.revision_of).toBeDefined();
    const ind = await findIndicator("TEST.IND", "LBN", src.key);
    expect((await getSeries(ind!.id)).map((o) => o.value)).toEqual(["12.5"]);
  });

  it("records failures accurately without touching previously stored data", async () => {
    const src = await testSource("fake");
    await runConnector(src, "cli", deps(fake(() => [news("https://outlet.lb/keep", "خبر محفوظ عن لبنان")])));
    const r = await runConnector(src, "cli", deps(fake(() => [], { fail: new Error("upstream exploded") })));
    expect(r.status).toBe("failed");
    expect(r.error).toBe("upstream exploded");
    const s = await pool.query("SELECT status, last_error FROM sources WHERE id = $1", [src.id]);
    expect(s.rows[0]).toMatchObject({ status: "error", last_error: "upstream exploded" });
    expect((await pool.query("SELECT count(*)::int AS n FROM news_articles")).rows[0].n).toBe(1);
    const run = await pool.query("SELECT status, error_message, log FROM ingestion_runs WHERE id = $1", [r.runId]);
    expect(run.rows[0].status).toBe("failed");
    expect(run.rows[0].log.some((l: { level: string }) => l.level === "error")).toBe(true);
  });

  it("reports missing credentials and blocked sources distinctly", async () => {
    const src = await testSource("fake");
    const r = await runConnector(src, "cli", deps(fake(() => [], { requiresCredential: true })));
    expect(r.status).toBe("failed");
    expect((await pool.query("SELECT status FROM sources WHERE id = $1", [src.id])).rows[0].status).toBe("needs_credentials");
    const r2 = await runConnector(src, "cli", deps(fake(() => [], { fail: new ConnectorConfigError("bot protection", "blocked") })));
    expect(r2.status).toBe("failed");
    expect((await pool.query("SELECT status FROM sources WHERE id = $1", [src.id])).rows[0].status).toBe("blocked");
  });

  it("test mode exercises the connector but stores nothing", async () => {
    const src = await testSource("fake");
    const r = await runConnector(src, "test", deps(fake(() => [news("https://outlet.lb/t", "اختبار")])));
    expect(r.status).toBe("success");
    expect(r.sample).toHaveLength(1);
    expect((await pool.query("SELECT count(*)::int AS n FROM news_articles")).rows[0].n).toBe(0);
    expect((await pool.query("SELECT last_success_at FROM sources WHERE id = $1", [src.id])).rows[0].last_success_at).toBeNull();
  });

  it("never shows synthetic rows outside demo mode", async () => {
    const src = await testSource("fake");
    await pool.query(
      `INSERT INTO news_articles (source_id, url, canonical_url, url_hash, title, title_fingerprint, is_synthetic, lebanon_relevance)
       VALUES ($1,'https://s.test/x','https://s.test/x','h1','بيانات اصطناعية عن لبنان','x', true, 1)`,
      [src.id],
    );
    expect((await searchNews({ limit: 10, offset: 0 })).total).toBe(0);
  });
});

describe("assistant retrieval (no LLM configured)", () => {
  it("admits when the database has no evidence instead of inventing an answer", async () => {
    const r = await answerQuestion("ما هو حجم سوق الطاقة الشمسية في عكار؟", [], null);
    expect(r.mode).toBe("retrieval_only");
    expect(r.answer).toContain("لا تتوفر في قاعدة البيانات أدلة كافية");
    expect(r.citations).toEqual([]);
  });
  it("lists stored evidence with resolvable citations", async () => {
    const src = await testSource("fake");
    await runConnector(src, "cli", deps(fake(() => [news("https://outlet.lb/solar", "ارتفاع الطلب على الطاقة الشمسية في لبنان", new Date().toISOString())])));
    const r = await answerQuestion("ما آخر أخبار الطاقة الشمسية في لبنان؟", [], null);
    expect(r.citations.length).toBeGreaterThan(0);
    for (const c of r.citations) expect(r.answer).toContain(`[${c.id}]`);
    expect(r.citations[0].url).toBe("https://outlet.lb/solar");
  });
});

describe("reports and forecasts", () => {
  it("generates a report that states data limits and lists only real sources", async () => {
    const r = await generateReport({ type: "daily", save: true });
    expect(r.content_md).toContain("## حدود البيانات");
    expect(r.content_md).toContain("لم تُجمع أخبار ذات صلة عالية");
    expect(r.citations).toEqual([]);
  });
  it("queues well-defined forecast questions without producing a probability", async () => {
    const src = await testSource("fake");
    await runConnector(src, "cli", deps(fake(() => [2020, 2021, 2022].map((y) => ({
      kind: "indicator" as const, indicator: { code: "TEST.F", countryCode: "LBN", nameEn: "F", frequency: "annual" as const }, periodDate: `${y}-01-01`, periodLabel: String(y),
      value: y - 2000, isProjection: false, observedAt: new Date(`${y}-12-31T23:59:59Z`), sourceUrl: "https://example.test", provenance: {},
    })))));
    const f = await requestForecast({ indicatorCode: "TEST.F", country: "LBN", event: "increase", threshold: null, horizonPeriods: 1, via: "test" });
    expect("error" in f).toBe(false);
    if (!("error" in f)) {
      expect(f.status).toBe("pending");
      expect(f.probability).toBeNull();
    }
    const again = await requestForecast({ indicatorCode: "TEST.F", country: "LBN", event: "increase", threshold: null, horizonPeriods: 1, via: "test" });
    expect(!("error" in again) && !("error" in f) && again.id === f.id).toBe(true); // de-duplicated
    expect(await requestForecast({ indicatorCode: "TEST.F", country: "LBN", event: "above_threshold", threshold: null, horizonPeriods: 1, via: "test" })).toMatchObject({ error: "threshold_required" });
  });
});

describe("API access control", () => {
  it("rejects unauthenticated admin requests", async () => {
    const { POST } = await import("@/app/api/sources/[key]/run/route");
    const res = await POST(new NextRequest("http://localhost/api/sources/gdelt-doc/run", { method: "POST", body: "{}" }), { params: Promise.resolve({ key: "gdelt-doc" }) });
    expect(res.status).toBe(401);
    const { PUT } = await import("@/app/api/sources/[key]/credential/route");
    const res2 = await PUT(new NextRequest("http://localhost/api/sources/twelvedata/credential", { method: "PUT", body: JSON.stringify({ secret: "abcdefghijk" }) }), { params: Promise.resolve({ key: "twelvedata" }) });
    expect(res2.status).toBe(401);
    expect((await pool.query("SELECT count(*)::int AS n FROM source_credentials")).rows[0].n).toBe(0);
  });
});
