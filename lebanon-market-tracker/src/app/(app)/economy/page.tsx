import { Download } from "lucide-react";
import { ApiForm } from "@/components/actions";
import { Sparkline } from "@/components/charts/Sparkline";
import { IndicatorExplorer } from "@/components/indicators/IndicatorExplorer";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Notice, PageHeader, SyntheticBadge } from "@/components/ui";
import { query } from "@/lib/db";
import { fmtNum, fmtPct, fmtPeriod } from "@/lib/format";
import { COUNTRY_NAMES_AR } from "@/lib/catalog/indicators";
import { listIndicators, type IndicatorRow } from "@/lib/repo/indicators";
import { safe } from "@/lib/safe";

export const metadata = { title: "الاقتصاد اللبناني" };

const CATEGORY_AR: Record<string, string> = { growth: "النمو والناتج", prices: "الأسعار والتضخم", external: "القطاع الخارجي", labour: "سوق العمل", fiscal: "المالية العامة", monetary: "النقد والاحتياطيات", social: "مؤشرات اجتماعية وبنية تحتية", structure: "هيكل الاقتصاد", tourism: "السياحة" };

function staleness(r: IndicatorRow) {
  if (!r.latest_period) return null;
  const years = (Date.now() - new Date(r.latest_period).getTime()) / (365.25 * 86400_000);
  const limit = r.frequency === "annual" ? 2.5 : r.frequency === "monthly" ? 0.25 : 1;
  return years > limit ? Math.floor(years) : null;
}

export default async function EconomyPage() {
  const r = await safe(async () => {
    const rows = (await listIndicators({ country: "LBN" })).filter((x) => x.latest_value !== null);
    const sparks = await query<{ indicator_id: string; vals: string[] }>(
      `SELECT indicator_id, array_agg(value ORDER BY period_date) AS vals FROM indicator_observations
        WHERE is_current AND NOT is_projection AND value IS NOT NULL AND period_date > now() - interval '16 years' AND indicator_id = ANY($1) GROUP BY indicator_id`,
      [rows.map((x) => x.id)],
    );
    const all = await listIndicators({});
    return { rows, sparks: new Map(sparks.map((s) => [s.indicator_id, s.vals.map(Number)])), all: all.filter((x) => x.latest_value !== null) };
  });
  if (!r.ok) return <ErrorState message={r.error} />;
  const headline = r.data.rows.filter((x) => !x.code.startsWith("CAS.") || (x.metadata?.headline && x.metadata?.region === "Lebanon" && x.metadata?.measure !== "index"));
  const byCat = new Map<string, IndicatorRow[]>();
  for (const x of headline) byCat.set(x.category ?? "other", [...(byCat.get(x.category ?? "other") ?? []), x]);
  const options = r.data.all
    .filter((x) => !x.code.startsWith("CAS.") || x.metadata?.headline)
    .map((x) => ({ id: x.id, label: `${x.name_ar ?? x.name_en} — ${COUNTRY_NAMES_AR[x.country_code] ?? x.country_code}${x.code.startsWith("CAS.") ? "" : ` (${x.source_key.startsWith("imf") ? "IMF" : x.source_key.startsWith("world") ? "WB" : x.source_key})`}`, group: CATEGORY_AR[x.category ?? ""] ?? "أخرى" }));
  const initial = [r.data.all.find((x) => x.code === "PCPIPCH" && x.country_code === "LBN")?.id, r.data.all.find((x) => x.code === "PCPIPCH" && x.country_code === "JOR")?.id].filter(Boolean) as string[];
  return (
    <div className="space-y-4">
      <PageHeader
        title="الاقتصاد اللبناني"
        subtitle="آخر قيمة منشورة لكل مؤشر مع فترته ومصدره. القيم السنوية للبنك الدولي وصندوق النقد تتأخر عادةً سنة أو أكثر؛ المؤشرات القديمة مُعلَّمة."
        actions={<a href="/api/export?dataset=indicators" className="inline-flex items-center gap-1 rounded-lg border border-line-strong bg-panel-2 px-3 py-1.5 text-sm hover:border-cyan/40"><Download className="size-4" /> تصدير CSV</a>}
      />
      <Card>
        <CardHeader title="مستكشف المؤشرات والمقارنات الإقليمية" subtitle="لبنان مقارنةً بالأردن ومصر وقبرص (حيث تتوفر البيانات)" />
        <div className="p-4">{options.length ? <IndicatorExplorer options={options} initial={initial} /> : <EmptyState title="لا مؤشرات بعد" />}</div>
      </Card>
      {[...byCat.entries()].map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader title={CATEGORY_AR[cat] ?? cat} />
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((x) => {
              const old = staleness(x);
              const prev = x.prev_value === null ? null : Number(x.prev_value);
              const cur = Number(x.latest_value);
              return (
                <div key={x.id} className="rounded-lg border border-line bg-panel-2/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[13px] leading-snug text-ink-2">{x.name_ar ?? x.name_en}</h3>
                    <Sparkline values={r.data.sparks.get(x.id) ?? []} color={x.higher_is === "worse" ? "#fbbf24" : "#22d3ee"} width={80} height={28} />
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="ltr-num text-xl font-semibold">{fmtNum(cur, { compact: Math.abs(cur) >= 1e6 })}</span>
                    <span className="text-[11px] text-muted">{x.unit_ar ?? x.unit}</span>
                    {prev !== null && prev !== 0 && x.unit?.includes("%") === false ? <span className="ltr-num text-[11px] text-muted">{fmtPct(((cur - prev) / Math.abs(prev)) * 100)}</span> : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                    <Badge tone={x.provenance === "official" ? "emerald" : "sky"}>{x.provenance === "official" ? "رسمي" : "طرف ثالث"}</Badge>
                    <span>{fmtPeriod(x.latest_label ?? "", x.frequency)}</span>
                    <span>· {x.source_key.startsWith("imf") ? "صندوق النقد" : x.source_key.startsWith("world") ? "البنك الدولي" : x.source_key === "cas" ? "الإحصاء المركزي" : x.source_name}</span>
                    {old ? <Badge tone="amber">آخر قيمة قبل ~{old} سنوات</Badge> : null}
                    {x.latest_quality === "provisional" ? <Badge tone="violet">أولية</Badge> : null}
                    {x.is_synthetic ? <SyntheticBadge /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <Card>
        <CardHeader title="استيراد بيانات رسمية (CSV)" subtitle="لجداول منشورة في تقارير أو ملفات PDF لا يمكن جلبها آلياً (مثلاً من وزارة المالية). الرابط إلى الوثيقة الأصلية إلزامي." />
        <div className="p-4">
          <ApiForm
            url="/api/manual"
            submitLabel="استيراد"
            columns={2}
            fields={[
              { name: "source_name", label: "اسم المصدر", type: "text", required: true },
              { name: "source_url", label: "رابط الوثيقة الأصلية", type: "url", required: true },
              { name: "csv", label: "محتوى CSV", type: "textarea", required: true, rows: 6, placeholder: "code,name,name_ar,unit,period,value\nMOF.REVENUE,Total revenue,الإيرادات العامة,LBP bn,2024,123456", help: "الأعمدة: code, name, unit, period (2024 أو 2024-Q2 أو 2024-05), value. اختياري: name_ar, country, category. القيم المعدّلة لاحقاً تُحفظ كمراجعات دون حذف السابقة." },
            ]}
            transform="indicatorCsv"
            describe="csvImport"
          />
        </div>
      </Card>
      <Notice>
        المراجعات: حين يعدّل المزوّد قيمة منشورة سابقاً، تحتفظ المنصة بالقيمة القديمة (مع تاريخ جمعها) وتضيف القيمة الجديدة، بدل الكتابة فوقها.
      </Notice>
    </div>
  );
}
