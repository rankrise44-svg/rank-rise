import { notFound } from "next/navigation";
import { ApiButton, ApiForm } from "@/components/actions";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, SyntheticBadge } from "@/components/ui";
import { query, queryOne } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { AREA_LABELS, SECTOR_LABELS } from "@/lib/nav";
import { SCORING_CONFIG } from "@/lib/opportunities/scoring";
import { getSettings } from "@/lib/settings";

const COMP_AR: Record<string, string> = {
  demand_evidence: "أدلة الطلب", market_accessibility: "سهولة الوصول إلى السوق", competitive_intensity: "شدة المنافسة (أعلى = أقل منافسة)",
  economic_feasibility: "الجدوى الاقتصادية", regulatory_operational_risk: "المخاطر التنظيمية والتشغيلية (أعلى = أقل خطراً)", evidence_quality: "جودة الأدلة",
};

type Opp = {
  id: string; title: string; sector_key: string | null; area_key: string | null; problem: string | null; customer_segments: string | null; competitors: string | null;
  market_size_estimates: { value: number; unit: string; year?: number; source_name: string; source_url: string }[]; startup_requirements: string | null;
  regulatory_considerations: string | null; risks: string | null; data_gaps: string | null; validation_steps: string | null; overall_score: string | null; confidence: string;
  status: string; origin: string; assessed_at: Date | null; is_synthetic: boolean; scores: { components?: Record<string, { score: number | null; explanation: string; method: string }>; disclaimer?: string; analyst_ratings?: Record<string, { score: number; rationale: string } | null> };
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-ink-2">{value?.trim() ? value : <span className="text-faint">لم يُحدَّد بعد</span>}</dd>
    </div>
  );
}

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const s = await getSettings();
  const o = await queryOne<Opp>("SELECT * FROM opportunities WHERE id = $1", [id]);
  if (!o) notFound();
  const ev = await query<{ id: string; stance: string; evidence_type: string; summary: string; url: string | null; source_name: string | null; observed_at: Date | null }>(
    "SELECT id, stance, evidence_type, summary, url, source_name, observed_at FROM opportunity_evidence WHERE opportunity_id = $1 ORDER BY stance, observed_at DESC NULLS LAST",
    [id],
  );
  const comps = o.scores?.components ?? {};
  const group = (st: string) => ev.filter((e) => e.stance === st);
  return (
    <div className="space-y-4">
      <PageHeader
        title={o.title}
        subtitle={`${o.origin === "system" ? "فرضية مولّدة من إشارات البيانات" : "فرضية أضافها المستخدم"} · تاريخ التقييم: ${o.assessed_at ? fmtDate(o.assessed_at, s.timezone, true) : "—"}`}
        actions={
          <>
            {(["investigating", "validated", "rejected", "archived"] as const).filter((x) => x !== o.status).map((x) => (
              <ApiButton key={x} url={`/api/opportunities/${id}`} method="PATCH" body={{ status: x }} label={{ investigating: "قيد التحقق", validated: "متحقق منها", rejected: "رفض", archived: "أرشفة" }[x]} variant={x === "rejected" ? "danger" : "secondary"} />
            ))}
          </>
        }
      />
      <div className="flex flex-wrap gap-1">
        {o.sector_key ? <Badge tone="cyan">{SECTOR_LABELS[o.sector_key] ?? o.sector_key}</Badge> : null}
        {o.area_key ? <Badge>{AREA_LABELS[o.area_key] ?? o.area_key}</Badge> : null}
        <Badge tone={o.confidence === "unvalidated" ? "amber" : "sky"}>{o.confidence === "unvalidated" ? "غير متحقق منها" : `ثقة: ${o.confidence}`}</Badge>
        {o.is_synthetic ? <SyntheticBadge /> : null}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="التقرير" />
            <dl className="grid gap-4 p-4 md:grid-cols-2 [&>*]:min-w-0">
              <Field label="1. المشكلة أو الحاجة غير الملبّاة" value={o.problem} />
              <Field label="2. القطاع والمنطقة" value={`${o.sector_key ? SECTOR_LABELS[o.sector_key] ?? o.sector_key : "—"} — ${o.area_key ? AREA_LABELS[o.area_key] ?? o.area_key : "لبنان"}`} />
              <Field label="3. شرائح العملاء المحتملة" value={o.customer_segments} />
              <Field label="4. منافسون معروفون" value={o.competitors} />
              <div>
                <dt className="text-xs text-muted">5. تقديرات حجم السوق ومصادرها</dt>
                <dd className="mt-0.5 text-sm">
                  {o.market_size_estimates?.length ? o.market_size_estimates.map((m, i) => <div key={i}>{m.value} {m.unit} {m.year ? `(${m.year})` : ""} — <a className="text-sky underline" href={m.source_url} target="_blank" rel="noopener noreferrer">{m.source_name}</a></div>) : <span className="text-amber">لا يوجد تقدير موثّق المصدر — لا تُقدّر المنصة أحجام الأسواق.</span>}
                </dd>
              </div>
              <Field label="6. متطلبات الإطلاق" value={o.startup_requirements} />
              <Field label="7. اعتبارات تنظيمية" value={o.regulatory_considerations} />
              <Field label="8. مخاطر تشغيلية ومالية" value={o.risks} />
              <Field label="9. فجوات البيانات" value={o.data_gaps} />
              <Field label="10. خطوات التحقق" value={o.validation_steps} />
            </dl>
          </Card>
          <Card>
            <CardHeader title="الأدلة" subtitle="داعمة / معاكسة / سياق — كل دليل مع مصدره وتاريخه" />
            <div className="grid gap-3 p-3 md:grid-cols-3">
              {(["supports", "contradicts", "context"] as const).map((st) => (
                <div key={st}>
                  <h3 className={`mb-1 text-xs font-medium ${st === "supports" ? "text-emerald" : st === "contradicts" ? "text-rose" : "text-sky"}`}>{{ supports: "تدعم الفرضية", contradicts: "تعارض الفرضية", context: "سياق" }[st]} ({group(st).length})</h3>
                  <ul className="space-y-1.5 text-xs">
                    {group(st).map((e) => (
                      <li key={e.id} className="rounded-md border border-line bg-panel-2/60 p-2">
                        <div dir="auto" className="text-ink-2">{e.summary}</div>
                        <div className="mt-1 text-[10px] text-muted">{e.evidence_type} · {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline">{e.source_name ?? "المصدر"}</a> : e.source_name ?? "—"}{e.observed_at ? ` · ${e.observed_at.toISOString().slice(0, 10)}` : ""}</div>
                      </li>
                    ))}
                    {!group(st).length ? <li className="text-faint">لا يوجد</li> : null}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-line p-4">
              <ApiForm
                url={`/api/opportunities/${id}/evidence`}
                columns={3}
                submitLabel="إضافة دليل"
                fields={[
                  { name: "stance", label: "الموقف", type: "select", options: [{ value: "supports", label: "يدعم" }, { value: "contradicts", label: "يعارض" }, { value: "context", label: "سياق" }] },
                  { name: "evidence_type", label: "النوع", type: "select", options: ["news", "indicator", "market", "company", "document", "note"].map((v) => ({ value: v, label: v })) },
                  { name: "observed_at", label: "التاريخ", type: "date" },
                  { name: "source_name", label: "المصدر", type: "text" },
                  { name: "url", label: "الرابط", type: "url" },
                  { name: "summary", label: "ملخص الدليل", type: "textarea", required: true },
                ]}
                transform="evidence"
              />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="نموذج التقييم الشفاف" subtitle={`${SCORING_CONFIG.version} — المكوّنات غير المقيّمة لا تُحتسب`} />
            <div className="p-4">
              <div className="mb-3 flex items-baseline gap-2">
                <span className="ltr-num text-3xl font-semibold text-cyan">{o.overall_score === null ? "—" : Number(o.overall_score).toFixed(1)}</span>
                <span className="text-xs text-muted">{o.overall_score === null ? `يتطلب ${SCORING_CONFIG.min_components_for_score} مكوّنات مقيّمة على الأقل` : "/100"}</span>
              </div>
              <ul className="space-y-2">
                {Object.entries(SCORING_CONFIG.weights).map(([k, w]) => {
                  const c = comps[k];
                  return (
                    <li key={k} className="text-xs">
                      <div className="flex justify-between"><span className="text-ink-2">{COMP_AR[k]} <span className="text-faint">(وزن {w})</span></span><span className="ltr-num font-medium">{c?.score ?? "—"}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-panel-3"><div className="h-full rounded-full bg-cyan/70" style={{ width: `${c?.score ?? 0}%` }} /></div>
                      <p className="mt-0.5 text-[11px] text-muted">{c?.explanation ?? "—"}</p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] text-amber">{o.scores?.disclaimer ?? "الدرجة ليست احتمال نجاح."}</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="تقييمات المحلل" subtitle="0–100 مع تبرير مكتوب؛ تبقى فارغة حتى تقيّمها أنت" />
            <div className="p-4">
              <ApiForm
                url={`/api/opportunities/${id}`}
                method="PATCH"
                reset={false}
                submitLabel="حفظ وإعادة التقييم"
                fields={(["market_accessibility", "competitive_intensity", "economic_feasibility", "regulatory_operational_risk"] as const).flatMap((k) => [
                  { name: `${k}_score`, label: `${COMP_AR[k]} (0–100)`, type: "number" as const, defaultValue: o.scores?.analyst_ratings?.[k]?.score?.toString() },
                  { name: `${k}_why`, label: "التبرير", type: "text" as const, defaultValue: o.scores?.analyst_ratings?.[k]?.rationale },
                ])}
                transform="analystRatings"
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="تفاصيل التقرير" />
            <div className="p-4">
              <ApiForm
                url={`/api/opportunities/${id}`}
                method="PATCH"
                reset={false}
                submitLabel="حفظ"
                fields={[
                  { name: "customer_segments", label: "شرائح العملاء", type: "textarea", defaultValue: o.customer_segments ?? "" },
                  { name: "competitors", label: "المنافسون المعروفون", type: "textarea", defaultValue: o.competitors ?? "" },
                  { name: "startup_requirements", label: "متطلبات الإطلاق", type: "textarea", defaultValue: o.startup_requirements ?? "" },
                  { name: "regulatory_considerations", label: "اعتبارات تنظيمية", type: "textarea", defaultValue: o.regulatory_considerations ?? "" },
                  { name: "risks", label: "المخاطر", type: "textarea", defaultValue: o.risks ?? "" },
                  { name: "data_gaps", label: "فجوات البيانات", type: "textarea", defaultValue: o.data_gaps ?? "" },
                  { name: "validation_steps", label: "خطوات التحقق", type: "textarea", defaultValue: o.validation_steps ?? "" },
                ]}
              />
            </div>
          </Card>
        </div>
      </div>
      {!ev.length ? <EmptyState title="لا أدلة بعد" /> : null}
      <Notice tone="amber">هذه فرضية للتحقيق وليست توصية استثمارية.</Notice>
    </div>
  );
}
