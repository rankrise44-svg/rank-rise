import type { Pool } from "pg";
import { z } from "zod";
import type { Queryable } from "../ingestion/store";

export const RULE_TYPES = [
  "high_relevance_news", "news_keyword", "indicator_change", "trend_signal", "company_activity", "data_anomaly", "opportunity_score", "forecast_outcome", "source_failure",
] as const;

export const ruleParams = {
  high_relevance_news: z.object({ min_relevance: z.number().min(0).max(1).default(0.85), sector: z.string().max(40).optional(), topic: z.string().max(40).optional() }),
  news_keyword: z.object({ keywords: z.array(z.string().min(2).max(60)).min(1).max(10) }),
  indicator_change: z.object({ code_prefix: z.string().min(2).max(60), min_abs_change_pct: z.number().min(0).max(1000).default(5) }),
  trend_signal: z.object({ min_significance: z.enum(["medium", "high"]).default("high"), signal_type: z.string().max(40).optional() }),
  company_activity: z.object({ company: z.string().max(80).optional() }),
  data_anomaly: z.object({}).default({}),
  opportunity_score: z.object({ min_delta: z.number().min(1).max(100).default(10) }),
  forecast_outcome: z.object({}).default({}),
  source_failure: z.object({}).default({}),
} as const;

type Rule = { id: string; name: string; rule_type: (typeof RULE_TYPES)[number]; params: Record<string, unknown>; last_evaluated_at: Date | null; created_at: Date };
type Hit = { title: string; body?: string; severity?: "info" | "warning" | "critical"; link?: string; ref_table?: string; ref_id?: string; key: string };

async function hitsFor(db: Queryable, r: Rule, since: Date): Promise<Hit[]> {
  const p = ruleParams[r.rule_type].parse(r.params ?? {}) as Record<string, unknown>;
  switch (r.rule_type) {
    case "high_relevance_news": {
      const rows = await db.query<{ id: string; title: string; url: string; source_name: string | null }>(
        `SELECT id, title, url, source_name FROM news_articles WHERE collected_at > $1 AND NOT is_synthetic AND duplicate_of IS NULL
           AND lebanon_relevance >= $2 AND ($3::text IS NULL OR $3 = ANY(sectors)) AND ($4::text IS NULL OR $4 = ANY(topics))
         ORDER BY collected_at DESC LIMIT 20`,
        [since, p.min_relevance, p.sector ?? null, p.topic ?? null],
      );
      return rows.rows.map((n) => ({ title: n.title, body: n.source_name ?? undefined, link: n.url, ref_table: "news_articles", ref_id: n.id, key: `news:${n.id}` }));
    }
    case "news_keyword": {
      const kws = (p.keywords as string[]).map((k) => `%${k}%`);
      const rows = await db.query<{ id: string; title: string; url: string }>(
        "SELECT id, title, url FROM news_articles WHERE collected_at > $1 AND NOT is_synthetic AND duplicate_of IS NULL AND title ILIKE ANY($2) ORDER BY collected_at DESC LIMIT 20",
        [since, kws],
      );
      return rows.rows.map((n) => ({ title: n.title, body: "تطابق كلمة مفتاحية", link: n.url, ref_table: "news_articles", ref_id: n.id, key: `kw:${n.id}` }));
    }
    case "indicator_change": {
      const rows = await db.query<{ id: string; name: string; label: string; value: string; prev: string | null }>(
        `SELECT o.id, COALESCE(i.name_ar, i.name_en) AS name, o.period_label AS label, o.value,
                (SELECT p.value FROM indicator_observations p WHERE p.indicator_id = o.indicator_id AND p.is_current AND p.period_date < o.period_date
                  AND NOT p.is_projection ORDER BY p.period_date DESC LIMIT 1) AS prev
           FROM indicator_observations o JOIN economic_indicators i ON i.id = o.indicator_id
          WHERE o.collected_at > $1 AND o.is_current AND NOT o.is_projection AND i.code LIKE $2 || '%' AND NOT o.is_synthetic`,
        [since, p.code_prefix],
      );
      return rows.rows
        .filter((x) => x.prev !== null && Number(x.prev) !== 0 && Math.abs(((Number(x.value) - Number(x.prev)) / Math.abs(Number(x.prev))) * 100) >= (p.min_abs_change_pct as number))
        .map((x) => ({ title: `${x.name}: ${Number(x.value).toFixed(2)} (${x.label})`, body: `القيمة السابقة ${Number(x.prev).toFixed(2)}`, severity: "warning" as const, link: "/economy", ref_table: "indicator_observations", ref_id: x.id, key: `ind:${x.id}` }));
    }
    case "trend_signal": {
      const levels = p.min_significance === "high" ? ["high"] : ["medium", "high"];
      const rows = await db.query<{ id: string; subject_key: string; signal_type: string; change_pct: string | null; significance: string }>(
        "SELECT id, subject_key, signal_type, change_pct, significance FROM trend_signals WHERE computed_at > $1 AND significance = ANY($2) AND ($3::text IS NULL OR signal_type = $3) AND NOT is_synthetic LIMIT 20",
        [since, levels, p.signal_type ?? null],
      );
      return rows.rows.map((s) => ({ title: `إشارة ${s.significance === "high" ? "قوية" : "متوسطة"}: ${s.subject_key} (${s.signal_type})`, body: s.change_pct ? `التغير ${Number(s.change_pct).toFixed(1)}%` : undefined, link: "/trends", ref_table: "trend_signals", ref_id: s.id, key: `sig:${s.id}:${s.change_pct}` }));
    }
    case "company_activity": {
      const rows = await db.query<{ id: string; title: string; url: string | null; name: string }>(
        `SELECT o.id, o.title, o.url, c.name FROM company_observations o JOIN companies c ON c.id = o.company_id
          WHERE o.collected_at > $1 AND ($2::text IS NULL OR c.name ILIKE '%' || $2 || '%') AND NOT o.is_synthetic LIMIT 20`,
        [since, p.company ?? null],
      );
      return rows.rows.map((o) => ({ title: `${o.name}: ${o.title}`, link: o.url ?? "/sectors", ref_table: "company_observations", ref_id: o.id, key: `co:${o.id}` }));
    }
    case "data_anomaly": {
      const rows = await db.query<{ id: string; name: string; label: string; prev: string | null; value: string | null }>(
        `SELECT n.id, COALESCE(i.name_ar, i.name_en) AS name, n.period_label AS label, n.provenance->>'previous_value' AS prev, n.value
           FROM indicator_observations n JOIN economic_indicators i ON i.id = n.indicator_id
          WHERE n.collected_at > $1 AND n.provenance ? 'revision_of' LIMIT 20`,
        [since],
      );
      return rows.rows.map((x) => ({ title: `مراجعة بيانات: ${x.name} (${x.label})`, body: `من ${x.prev ?? "—"} إلى ${x.value ?? "—"}`, severity: "warning" as const, link: "/economy", ref_table: "indicator_observations", ref_id: x.id, key: `rev:${x.id}` }));
    }
    case "opportunity_score": {
      const rows = await db.query<{ id: string; opportunity_id: string; title: string; overall: string | null; prev: string | null }>(
        `SELECT a.id, a.opportunity_id, o.title, a.overall_score AS overall,
                (SELECT b.overall_score FROM opportunity_assessments b WHERE b.opportunity_id = a.opportunity_id AND b.assessed_at < a.assessed_at ORDER BY b.assessed_at DESC LIMIT 1) AS prev
           FROM opportunity_assessments a JOIN opportunities o ON o.id = a.opportunity_id WHERE a.assessed_at > $1`,
        [since],
      );
      return rows.rows
        .filter((x) => x.prev !== null && x.overall !== null && Math.abs(Number(x.overall) - Number(x.prev)) >= (p.min_delta as number))
        .map((x) => ({ title: `تغيّر درجة فرصة: ${x.title}`, body: `${Number(x.prev).toFixed(0)} → ${Number(x.overall).toFixed(0)}`, link: `/opportunities/${x.opportunity_id}`, ref_table: "opportunities", ref_id: x.opportunity_id, key: `opp:${x.id}` }));
    }
    case "forecast_outcome": {
      const rows = await db.query<{ id: string; forecast_id: string; question: string; outcome: boolean }>(
        "SELECT o.id, o.forecast_id, f.question, o.outcome FROM forecast_outcomes o JOIN forecasts f ON f.id = o.forecast_id WHERE o.resolved_at > $1",
        [since],
      );
      return rows.rows.map((x) => ({ title: `حُسم توقع: ${x.question}`, body: x.outcome ? "النتيجة: حدث" : "النتيجة: لم يحدث", link: "/analytics", ref_table: "forecasts", ref_id: x.forecast_id, key: `fo:${x.id}` }));
    }
    case "source_failure": {
      const rows = await db.query<{ id: string; name: string; status: string; last_error: string | null; last_error_at: Date }>(
        "SELECT id, name, status, last_error, last_error_at FROM sources WHERE enabled AND last_error_at > $1 AND status IN ('error','blocked','needs_credentials')",
        [since],
      );
      return rows.rows.map((s) => ({ title: `فشل مصدر: ${s.name}`, body: s.last_error?.slice(0, 200), severity: "warning" as const, link: "/sources", ref_table: "sources", ref_id: s.id, key: `src:${s.id}:${s.last_error_at.toISOString()}` }));
    }
  }
}

/** Evaluates enabled alert rules for activity since their last evaluation and writes in-app notifications. */
export async function evaluateAlerts(db?: Queryable) {
  const conn: Queryable = db ?? (await import("../db")).getPool();
  const rules = await conn.query<Rule>("SELECT id, name, rule_type, params, last_evaluated_at, created_at FROM alert_rules WHERE enabled");
  let created = 0;
  for (const r of rules.rows) {
    const since = r.last_evaluated_at ?? new Date(Date.now() - 24 * 3600_000);
    const now = new Date();
    try {
      const hits = await hitsFor(conn, r, since);
      for (const h of hits) {
        const ins = await conn.query(
          `INSERT INTO notifications (alert_rule_id, title, body, severity, link, ref_table, ref_id, dedupe_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (dedupe_key) DO NOTHING`,
          [r.id, h.title.slice(0, 300), h.body ?? null, h.severity ?? "info", h.link ?? null, h.ref_table ?? null, h.ref_id ?? null, `${r.id}:${h.key}`],
        );
        created += ins.rowCount ?? 0;
      }
      await conn.query("UPDATE alert_rules SET last_evaluated_at = $2 WHERE id = $1", [r.id, now]);
    } catch (e) {
      console.error(JSON.stringify({ level: "error", msg: "alert rule failed", rule: r.id, error: (e as Error).message }));
    }
  }
  return created;
}

export const DEFAULT_RULES: { name: string; rule_type: (typeof RULE_TYPES)[number]; params: Record<string, unknown> }[] = [
  { name: "أخبار عالية الصلة بلبنان", rule_type: "high_relevance_news", params: { min_relevance: 0.85, topic: "economy" } },
  { name: "إشارات تغيّر قوية", rule_type: "trend_signal", params: { min_significance: "high" } },
  { name: "تغيّر التضخم الرسمي (CAS)", rule_type: "indicator_change", params: { code_prefix: "CAS.CPI.YOY_PCT.LBN.TOTAL", min_abs_change_pct: 5 } },
  { name: "مراجعات البيانات", rule_type: "data_anomaly", params: {} },
  { name: "نتائج التوقعات", rule_type: "forecast_outcome", params: {} },
  { name: "فشل المصادر", rule_type: "source_failure", params: {} },
];

export async function seedDefaultAlerts(db: Pool | Queryable) {
  const n = await db.query<{ n: string }>("SELECT count(*) AS n FROM alert_rules");
  if (Number(n.rows[0].n) > 0) return;
  for (const r of DEFAULT_RULES) await db.query("INSERT INTO alert_rules (name, rule_type, params, last_evaluated_at) VALUES ($1,$2,$3, now())", [r.name, r.rule_type, JSON.stringify(r.params)]);
}
