import "server-only";
import { z } from "zod";
import { query, queryOne, withTransaction } from "../db";
import { SECTOR_LABELS } from "../nav";
import { scoreOpportunity, type AnalystRatings, type EvidenceItem } from "./scoring";

const DEFAULT_GAPS = "لا تتوفر بيانات مبيعات أو حجم سوق أو هوامش؛ لا تتوفر بيانات منافسين شاملة؛ لا يوجد مسح طلب مباشر.";
const DEFAULT_STEPS = [
  "مقابلة 10–15 عميلاً محتملاً للتحقق من المشكلة واستعدادهم للدفع",
  "حصر المنافسين المباشرين وأسعارهم ميدانياً",
  "التحقق من المتطلبات التنظيمية والتراخيص لدى الجهات المعنية",
  "تقدير كلفة الإطلاق من عروض أسعار فعلية",
  "اختبار صغير (pilot) بميزانية محدودة قبل التوسع",
].join("\n");

export const opportunityInput = z.object({
  title: z.string().trim().min(4).max(200),
  sector_key: z.string().max(40).nullable().optional(),
  area_key: z.string().max(40).nullable().optional(),
  problem: z.string().max(4000).optional(),
  customer_segments: z.string().max(4000).optional(),
  competitors: z.string().max(4000).optional(),
  market_size_estimates: z.array(z.object({ value: z.number(), unit: z.string().max(40), year: z.number().int().optional(), source_name: z.string().min(2).max(200), source_url: z.string().url() })).max(10).optional(),
  startup_requirements: z.string().max(4000).optional(),
  regulatory_considerations: z.string().max(4000).optional(),
  risks: z.string().max(4000).optional(),
  data_gaps: z.string().max(4000).optional(),
  validation_steps: z.string().max(4000).optional(),
  status: z.enum(["candidate", "investigating", "validated", "rejected", "archived"]).optional(),
  analyst_ratings: z
    .record(z.enum(["market_accessibility", "competitive_intensity", "economic_feasibility", "regulatory_operational_risk"]), z.object({ score: z.number().min(0).max(100), rationale: z.string().max(1000) }).nullable())
    .optional(),
});
export type OpportunityInput = z.infer<typeof opportunityInput>;

export const evidenceInput = z.object({
  stance: z.enum(["supports", "contradicts", "context"]),
  evidence_type: z.enum(["news", "indicator", "signal", "market", "company", "document", "note"]),
  summary: z.string().trim().min(3).max(1000),
  url: z.string().url().optional(),
  source_name: z.string().max(200).optional(),
  observed_at: z.coerce.date().optional(),
  ref_table: z.string().max(40).optional(),
  ref_id: z.string().uuid().optional(),
});

export async function rescore(opportunityId: string) {
  const opp = await queryOne<{ status: string; scores: { analyst_ratings?: AnalystRatings } }>("SELECT status, scores FROM opportunities WHERE id = $1", [opportunityId]);
  if (!opp) return null;
  const ev = await query<{ stance: EvidenceItem["stance"]; evidence_type: EvidenceItem["evidence_type"]; observed_at: Date | null; weight: string; provenance: string | null }>(
    `SELECT e.stance, e.evidence_type, e.observed_at, e.weight,
            COALESCE((SELECT s.provenance FROM sources s WHERE s.name = e.source_name LIMIT 1),
                     CASE WHEN e.evidence_type IN ('indicator') THEN 'official' ELSE NULL END) AS provenance
       FROM opportunity_evidence e WHERE e.opportunity_id = $1`,
    [opportunityId],
  );
  const ratings = opp.scores?.analyst_ratings ?? {};
  const r = scoreOpportunity(
    ev.map((e) => ({ stance: e.stance, evidence_type: e.evidence_type, observed_at: e.observed_at, weight: Number(e.weight), source_provenance: e.provenance })),
    ratings,
    opp.status,
  );
  await query(
    "UPDATE opportunities SET scores = $2, overall_score = $3, confidence = $4, scoring_version = $5, assessed_at = now() WHERE id = $1",
    [opportunityId, JSON.stringify({ ...r, analyst_ratings: ratings }), r.overall, r.confidence, r.version],
  );
  await query(
    "INSERT INTO opportunity_assessments (opportunity_id, scores, overall_score, confidence, scoring_version) VALUES ($1,$2,$3,$4,$5)",
    [opportunityId, JSON.stringify(r.components), r.overall, r.confidence, r.version],
  );
  return r;
}

export async function createOpportunity(input: OpportunityInput, origin: "user" | "system" = "user") {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO opportunities (title, sector_key, area_key, problem, customer_segments, competitors, market_size_estimates, startup_requirements,
        regulatory_considerations, risks, data_gaps, validation_steps, status, origin, scores)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [
      input.title, input.sector_key ?? null, input.area_key ?? null, input.problem ?? null, input.customer_segments ?? null, input.competitors ?? null,
      JSON.stringify(input.market_size_estimates ?? []), input.startup_requirements ?? null, input.regulatory_considerations ?? null, input.risks ?? null,
      input.data_gaps ?? DEFAULT_GAPS, input.validation_steps ?? DEFAULT_STEPS, input.status ?? "candidate", origin, JSON.stringify({ analyst_ratings: input.analyst_ratings ?? {} }),
    ],
  );
  await rescore(row!.id);
  return row!.id;
}

export async function updateOpportunity(id: string, input: Partial<OpportunityInput>) {
  const cur = await queryOne<{ scores: Record<string, unknown> }>("SELECT scores FROM opportunities WHERE id = $1", [id]);
  if (!cur) return false;
  const fields: [string, unknown][] = [];
  for (const k of ["title", "sector_key", "area_key", "problem", "customer_segments", "competitors", "startup_requirements", "regulatory_considerations", "risks", "data_gaps", "validation_steps", "status"] as const) {
    if (input[k] !== undefined) fields.push([k, input[k]]);
  }
  if (input.market_size_estimates) fields.push(["market_size_estimates", JSON.stringify(input.market_size_estimates)]);
  if (input.analyst_ratings) fields.push(["scores", JSON.stringify({ ...cur.scores, analyst_ratings: { ...((cur.scores?.analyst_ratings as object) ?? {}), ...input.analyst_ratings } })]);
  if (fields.length) {
    await query(`UPDATE opportunities SET ${fields.map(([k], i) => `${k} = $${i + 2}`).join(", ")} WHERE id = $1`, [id, ...fields.map(([, v]) => v)]);
  }
  await rescore(id);
  return true;
}

export async function addEvidence(id: string, e: z.infer<typeof evidenceInput>) {
  await query(
    `INSERT INTO opportunity_evidence (opportunity_id, stance, evidence_type, ref_table, ref_id, summary, url, source_name, observed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (opportunity_id, ref_table, ref_id) DO NOTHING`,
    [id, e.stance, e.evidence_type, e.ref_table ?? null, e.ref_id ?? null, e.summary, e.url ?? null, e.source_name ?? null, e.observed_at ?? null],
  );
  await rescore(id);
}

/**
 * Discovery: turns measured signals into *hypotheses worth investigating*. Each candidate links the
 * evidence that triggered it, starts as "unvalidated", and never contains invented market figures.
 */
export async function discoverCandidates() {
  const created: string[] = [];
  const exists = async (title: string) => Boolean(await queryOne("SELECT 1 FROM opportunities WHERE title = $1", [title]));

  // R1 — sectors whose Lebanon-relevant news coverage rose significantly (7d vs prior 4 weeks).
  const surges = await query<{ id: string; subject_key: string; current_value: string; baseline_value: string; change_pct: string | null; significance: string; window_end: Date }>(
    `SELECT DISTINCT ON (subject_key) id, subject_key, current_value, baseline_value, change_pct, significance, window_end FROM trend_signals
      WHERE signal_type = 'news_volume' AND subject_type = 'sector' AND direction = 'up' AND significance IN ('medium','high') AND NOT is_synthetic
        AND window_end > now() - interval '14 days'
      ORDER BY subject_key, window_end DESC`,
  );
  for (const s of surges) {
    const title = `اهتمام متزايد بقطاع ${SECTOR_LABELS[s.subject_key] ?? s.subject_key} — فرضية نشاط يستحق التحقق`;
    if (await exists(title)) continue;
    const id = await createOpportunity({ title, sector_key: s.subject_key, problem: "ارتفعت التغطية الإخبارية لهذا القطاع بشكل ملحوظ. قد يعكس ذلك نشاطاً تجارياً أو تنظيمياً جديداً — أو مجرد حدث إعلامي. يجب التحقق من طبيعة الأخبار قبل أي استنتاج." }, "system");
    await addEvidence(id, { stance: "supports", evidence_type: "signal", summary: `حجم التغطية خلال 7 أيام: ${s.current_value} مقابل متوسط أسبوعي ${Number(s.baseline_value).toFixed(1)} (دلالة ${s.significance}). حجم التغطية لا يقيس الأثر.`, ref_table: "trend_signals", ref_id: s.id, observed_at: s.window_end, source_name: "Lebanon Market Tracker" });
    const arts = await query<{ id: string; title: string; url: string; source_name: string | null; at: Date }>(
      `SELECT id, title, url, source_name, COALESCE(published_at, collected_at) AS at FROM news_articles WHERE $1 = ANY(sectors) AND duplicate_of IS NULL
         AND lebanon_relevance >= 0.35 AND NOT is_synthetic ORDER BY COALESCE(published_at, collected_at) DESC LIMIT 4`,
      [s.subject_key],
    );
    for (const a of arts) await addEvidence(id, { stance: "context", evidence_type: "news", summary: a.title.slice(0, 300), url: a.url, source_name: a.source_name ?? undefined, ref_table: "news_articles", ref_id: a.id, observed_at: a.at });
    created.push(id);
  }

  // R2 — CPI divisions rising much faster than headline inflation (official CAS data).
  const cpi = await query<{ id: string; obs_id: string; division: string; division_ar: string | null; sector_key: string | null; value: string; period_label: string; source_url: string; observed_at: Date }>(
    `SELECT DISTINCT ON (i.code) i.id, o.id AS obs_id, i.metadata->>'division' AS division, i.metadata->>'division_ar' AS division_ar, i.sector_key, o.value,
            o.period_label, o.source_url, o.observed_at
       FROM economic_indicators i JOIN indicator_observations o ON o.indicator_id = i.id AND o.is_current
      WHERE i.code LIKE 'CAS.CPI.YOY_PCT.LBN.%' AND NOT i.is_synthetic ORDER BY i.code, o.period_date DESC`,
  );
  const headline = cpi.find((c) => c.division === "Consumer price index");
  if (headline) {
    for (const c of cpi.filter((x) => x !== headline && x.sector_key && !/^\s/.test(x.division) && Number(x.value) - Number(headline.value) >= 5)) {
      const title = `ارتفاع أسعار «${(c.division_ar ?? c.division).trim()}» أسرع من التضخم العام — فرضية بدائل أقل كلفة`;
      if (await exists(title)) continue;
      const id = await createOpportunity({
        title,
        sector_key: c.sector_key,
        problem: `ارتفعت أسعار هذا الباب ${Number(c.value).toFixed(1)}٪ سنوياً مقابل ${Number(headline.value).toFixed(1)}٪ للتضخم العام (${c.period_label}). قد يدل ذلك على ضغط كلفة أو طلب يفتح مجالاً لحلول أرخص أو أكثر كفاءة — أو على عوامل مؤقتة. غير متحقق منه.`,
      }, "system");
      await addEvidence(id, { stance: "supports", evidence_type: "indicator", summary: `التغير السنوي لأسعار ${(c.division_ar ?? c.division).trim()}: ${Number(c.value).toFixed(1)}٪ (${c.period_label})`, url: c.source_url, source_name: "Central Administration of Statistics — CPI", ref_table: "indicator_observations", ref_id: c.obs_id, observed_at: c.observed_at });
      await addEvidence(id, { stance: "context", evidence_type: "indicator", summary: `التضخم العام: ${Number(headline.value).toFixed(1)}٪ (${headline.period_label})`, url: headline.source_url, source_name: "Central Administration of Statistics — CPI", ref_table: "indicator_observations", ref_id: headline.obs_id, observed_at: headline.observed_at });
      created.push(id);
    }
  }

  // R3 — food commodities whose USD retail price rose ≥ 20% over 12 months (WFP medians).
  const food = await query<{ commodity: string; now_usd: string; then_usd: string; last: string }>(
    `WITH m AS (
       SELECT commodity, date_trunc('month', observed_date) AS mo, percentile_cont(0.5) WITHIN GROUP (ORDER BY usd_price) AS usd
         FROM price_observations WHERE usd_price IS NOT NULL AND NOT is_synthetic AND commodity NOT ILIKE 'exchange rate%' AND observed_date > now() - interval '15 months'
        GROUP BY 1,2)
     SELECT a.commodity, a.usd AS now_usd, b.usd AS then_usd, to_char(a.mo, 'YYYY-MM') AS last
       FROM m a JOIN m b ON b.commodity = a.commodity AND b.mo = a.mo - interval '12 months'
      WHERE a.mo = (SELECT max(mo) FROM m WHERE commodity = a.commodity) AND b.usd > 0 AND a.usd / b.usd >= 1.2`,
  );
  for (const f of food.slice(0, 5)) {
    const pct = (Number(f.now_usd) / Number(f.then_usd) - 1) * 100;
    const title = `ارتفاع سعر ${f.commodity} بالدولار ${pct.toFixed(0)}٪ خلال عام — فرضية إنتاج محلي أو بدائل`;
    if (await exists(title)) continue;
    const id = await createOpportunity({ title, sector_key: "agriculture", problem: "ارتفع السعر الوسيط بالدولار في الأسواق التي يرصدها برنامج الأغذية العالمي. قد يشير إلى ضغط على الكلفة أو العرض. العينة محدودة بأسواق مرصودة ولا تمثل كل المستهلكين." }, "system");
    await addEvidence(id, { stance: "supports", evidence_type: "market", summary: `السعر الوسيط ${Number(f.then_usd).toFixed(2)}$ → ${Number(f.now_usd).toFixed(2)}$ (حتى ${f.last})`, url: "https://data.humdata.org/dataset/wfp-food-prices-for-lebanon", source_name: "WFP food prices — Lebanon (HDX)", observed_at: new Date(`${f.last}-15T00:00:00Z`) });
    created.push(id);
  }
  return created;
}

export async function deleteOpportunity(id: string) {
  await withTransaction(async (c) => {
    await c.query("DELETE FROM opportunities WHERE id = $1", [id]);
  });
}
