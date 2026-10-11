import cfg from "../../../config/opportunity-scoring.json";

export type EvidenceItem = { stance: "supports" | "contradicts" | "context"; evidence_type: keyof typeof cfg.evidence_weights; observed_at: Date | null; source_provenance?: string | null; weight?: number };
export type AnalystRatings = Partial<Record<"market_accessibility" | "competitive_intensity" | "economic_feasibility" | "regulatory_operational_risk", { score: number; rationale: string } | null>>;
export type Component = { score: number | null; method: string; explanation: string };
export type ScoreResult = {
  version: string;
  components: Record<keyof typeof cfg.weights, Component>;
  overall: number | null;
  confidence: "unvalidated" | "low" | "medium" | "high";
  missing: string[];
  disclaimer: string;
};

const clamp = (x: number) => Math.max(0, Math.min(100, x));

function recencyFactor(d: Date | null, now: Date) {
  if (!d) return 0.5;
  const ageDays = Math.max(0, (now.getTime() - d.getTime()) / 86400_000);
  return Math.pow(0.5, ageDays / cfg.recency_half_life_days);
}

/** Pure, deterministic scoring — documented in config/opportunity-scoring.json and docs/ARCHITECTURE.md. */
export function scoreOpportunity(evidence: EvidenceItem[], ratings: AnalystRatings, status: string, now = new Date()): ScoreResult {
  const w = (e: EvidenceItem) => (cfg.evidence_weights[e.evidence_type] ?? 0.3) * (e.weight ?? 1) * recencyFactor(e.observed_at, now);
  const sup = evidence.filter((e) => e.stance === "supports");
  const con = evidence.filter((e) => e.stance === "contradicts");
  const supW = sup.reduce((a, e) => a + w(e), 0);
  const conW = con.reduce((a, e) => a + w(e), 0);

  // Demand evidence: net weighted support, saturating (3 strong recent items ≈ 75).
  const demand: Component =
    sup.length + con.length === 0
      ? { score: null, method: "net-weighted-evidence", explanation: "لا توجد أدلة مرفقة بعد." }
      : {
          score: clamp(Math.round(100 * (1 - Math.exp(-Math.max(0, supW - 0.8 * conW) / 2.2)))),
          method: "net-weighted-evidence",
          explanation: `${sup.length} دليل داعم (وزن ${supW.toFixed(2)}) و${con.length} دليل معاكس (وزن ${conW.toFixed(2)})، مع ترجيح الحداثة (نصف عمر ${cfg.recency_half_life_days} يوماً) ونوع الدليل.`,
        };

  // Evidence quality: diversity of types, share of official sources, recency, counter-evidence considered.
  let quality: Component;
  if (!evidence.length) quality = { score: null, method: "evidence-quality", explanation: "لا توجد أدلة لتقييم جودتها." };
  else {
    const types = new Set(evidence.map((e) => e.evidence_type)).size;
    const official = evidence.filter((e) => e.source_provenance === "official").length / evidence.length;
    const recent = evidence.filter((e) => recencyFactor(e.observed_at, now) > 0.5).length / evidence.length;
    const s = 20 * Math.min(types, 3) / 3 + 35 * official + 25 * recent + (con.length ? 10 : 0) + Math.min(10, evidence.length * 2);
    quality = {
      score: clamp(Math.round(s)),
      method: "evidence-quality",
      explanation: `${types} نوع/أنواع من الأدلة، ${(official * 100).toFixed(0)}٪ من مصادر رسمية، ${(recent * 100).toFixed(0)}٪ حديثة، ${con.length ? "تمت مراعاة أدلة معاكسة" : "لم تُسجَّل أدلة معاكسة بعد"}.`,
    };
  }

  const rated = (k: keyof AnalystRatings, label: string): Component => {
    const r = ratings[k];
    return r && Number.isFinite(r.score)
      ? { score: clamp(Math.round(r.score)), method: "analyst-rated", explanation: r.rationale || "تقييم المحلل دون تبرير مكتوب." }
      : { score: null, method: "analyst-rated", explanation: `لم يُقيَّم بعد (${label}). لا يُقدَّر آلياً.` };
  };

  const components = {
    demand_evidence: demand,
    market_accessibility: rated("market_accessibility", "سهولة الوصول إلى السوق"),
    competitive_intensity: rated("competitive_intensity", "شدة المنافسة — درجة أعلى تعني منافسة أقل"),
    economic_feasibility: rated("economic_feasibility", "الجدوى الاقتصادية"),
    regulatory_operational_risk: rated("regulatory_operational_risk", "المخاطر التنظيمية والتشغيلية — درجة أعلى تعني مخاطر أقل"),
    evidence_quality: quality,
  } as ScoreResult["components"];

  const present = (Object.keys(components) as (keyof typeof cfg.weights)[]).filter((k) => components[k].score !== null);
  const missing = (Object.keys(components) as (keyof typeof cfg.weights)[]).filter((k) => components[k].score === null);
  let overall: number | null = null;
  if (present.length >= cfg.min_components_for_score) {
    const tw = present.reduce((a, k) => a + cfg.weights[k], 0);
    overall = Math.round((present.reduce((a, k) => a + cfg.weights[k] * (components[k].score as number), 0) / tw) * 10) / 10;
  }
  const q = quality.score ?? 0;
  const analystCount = present.filter((k) => (cfg.analyst_rated as string[]).includes(k)).length;
  let confidence: ScoreResult["confidence"] = "unvalidated";
  if (q >= 40 && sup.length >= 3 && present.length >= cfg.min_components_for_score) {
    confidence = "low";
    if (q >= 60 && analystCount >= 2) confidence = "medium";
    if (q >= 80 && missing.length === 0 && status === "validated") confidence = "high";
  }
  return { version: cfg.version, components, overall, confidence, missing, disclaimer: "الدرجة أداة لترتيب الفرضيات وليست احتمال نجاح مالي." };
}

export const SCORING_CONFIG = cfg;
