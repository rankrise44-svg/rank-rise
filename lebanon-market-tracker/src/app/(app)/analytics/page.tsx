import { ApiButton, ApiForm } from "@/components/actions";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Notice, PageHeader } from "@/components/ui";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { listForecasts } from "@/lib/forecasting/requests";
import { listIndicators } from "@/lib/repo/indicators";
import { COUNTRY_NAMES_AR } from "@/lib/catalog/indicators";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "التحليلات والتوقعات" };

const STATUS: Record<string, { l: string; t: "amber" | "emerald" | "rose" | "sky" | "neutral" }> = {
  pending: { l: "بانتظار المحرك", t: "sky" }, running: { l: "قيد الحساب", t: "sky" }, complete: { l: "مكتمل", t: "emerald" }, insufficient_data: { l: "بيانات غير كافية", t: "amber" }, failed: { l: "فشل", t: "rose" },
};

export default async function AnalyticsPage() {
  const s = await getSettings();
  const [fc, inds, calib] = await Promise.all([
    safe(() => listForecasts(30)),
    safe(async () => (await listIndicators({})).filter((x) => Number(x.obs_count) >= 8 && x.latest_value !== null && (!x.code.startsWith("CAS.") || x.metadata?.headline))),
    safe(() => query<{ n: string; brier: string | null; base: string | null }>("SELECT count(*) AS n, avg(brier_score) AS brier, avg(baseline_brier) AS base FROM forecast_outcomes WHERE brier_score IS NOT NULL")),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader
        title="التحليلات والتوقعات"
        subtitle="محرك توقعات إحصائي منفصل (Python) يختبر كل نموذج اختباراً رجعياً قبل عرض أي احتمال. حين لا تكفي البيانات، يُعرض تحليل سيناريوهات نوعي بدل رقم."
        actions={<ApiButton url="/api/forecasts/process" label="تشغيل محرك التوقعات الآن" describe="engineRan" />}
      />
      <Card>
        <CardHeader title="سؤال توقع جديد" subtitle="تعريف دقيق: مؤشر، نوع الحدث، الأفق بعدد الفترات (سنوات للسلاسل السنوية، أشهر للشهرية)" />
        <div className="p-4">
          {inds.ok ? (
            <ApiForm
              url="/api/forecasts"
              columns={3}
              submitLabel="تسجيل السؤال"
              fields={[
                { name: "indicator", label: "المؤشر", type: "select", required: true, options: inds.data.map((x) => ({ value: `${x.code}|${x.country_code}|${x.source_key}`, label: `${x.name_ar ?? x.name_en} — ${COUNTRY_NAMES_AR[x.country_code] ?? x.country_code} (${x.obs_count} رصداً، آخرها ${x.latest_label})` })) },
                { name: "event", label: "الحدث", type: "select", options: [{ value: "increase", label: "يرتفع مقارنة بآخر قيمة" }, { value: "decrease", label: "ينخفض مقارنة بآخر قيمة" }, { value: "above_threshold", label: "يتجاوز عتبة" }, { value: "below_threshold", label: "ينخفض دون عتبة" }] },
                { name: "threshold", label: "العتبة (لأحداث العتبة)", type: "number", step: "any" },
                { name: "horizon", label: "الأفق (عدد الفترات)", type: "number", defaultValue: "1" },
              ]}
              transform="forecast"
              describe="forecastQueued"
            />
          ) : <ErrorState message={inds.error} />}
        </div>
      </Card>
      <Card>
        <CardHeader title="سجل التوقعات" subtitle={calib.ok && Number(calib.data[0]?.n) ? `تمّ حسم ${calib.data[0].n} توقعاً — متوسط Brier ${Number(calib.data[0].brier).toFixed(3)} مقابل ${Number(calib.data[0].base).toFixed(3)} لخط الأساس (الأقل أفضل)` : "لم يُحسم أي توقع بعد؛ تُقيَّم الدقة تلقائياً عند صدور البيانات الفعلية"} />
        {!fc.ok ? <div className="p-3"><ErrorState message={fc.error} /></div> : fc.data.length ? (
          <ul className="divide-y divide-line/60">
            {fc.data.map((f) => {
              const bt = f.backtest as { n_predictions?: number; brier?: Record<string, number>; selected_model?: string };
              const best = bt?.brier ? Math.min(...Object.values(bt.brier)) : null;
              return (
                <li key={f.id} id={`f-${f.id}`} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm text-ink">{f.question}</p>
                    <Badge tone={STATUS[f.status]?.t ?? "neutral"}>{STATUS[f.status]?.l ?? f.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted">
                    <span>قطع البيانات: {fmtDate(f.data_cutoff, s.timezone, true)}</span>
                    {f.model ? <span>النموذج: <span className="ltr-num">{f.model}</span></span> : null}
                    {f.training_period ? <span>فترة التدريب: <span className="ltr-num">{f.training_period}</span></span> : null}
                    {bt?.n_predictions ? <span>اختبار رجعي: {bt.n_predictions} تنبؤاً{best !== null ? ` · أفضل Brier ${best.toFixed(3)} (تنبؤ «نصف-نصف» = 0.250؛ الأقل أفضل)` : ""}</span> : null}
                  </div>
                  {f.probability !== null ? (
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="ltr-num text-2xl font-semibold text-cyan">{(f.probability * 100).toFixed(0)}%</span>
                      {f.interval && typeof f.interval === "object" ? <span className="ltr-num text-xs text-muted">نطاق {(Number((f.interval as { low: number }).low) * 100).toFixed(0)}–{(Number((f.interval as { high: number }).high) * 100).toFixed(0)}%</span> : null}
                      {f.baseline_probability !== null ? <span className="text-xs text-muted">خط الأساس (التكرار التاريخي): {(f.baseline_probability * 100).toFixed(0)}%</span> : null}
                    </div>
                  ) : f.scenario_analysis ? (
                    <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 text-xs leading-relaxed whitespace-pre-wrap text-ink-2">{f.scenario_analysis}</div>
                  ) : f.status === "pending" ? <p className="text-xs text-muted">{f.note}</p> : null}
                  {f.limitations?.length ? <ul className="list-disc ps-5 text-[11px] text-muted">{f.limitations.map((l) => <li key={l}>{l}</li>)}</ul> : null}
                  {f.outcome !== null ? <Badge tone={f.outcome ? "emerald" : "rose"}>النتيجة الفعلية: {f.outcome ? "حدث" : "لم يحدث"}</Badge> : null}
                </li>
              );
            })}
          </ul>
        ) : <EmptyState title="لا توجد توقعات بعد">سجّل سؤالاً محدداً أعلاه.</EmptyState>}
      </Card>
      <Notice tone="amber">
        الاحتمال المعروض تقدير إحصائي من بيانات تاريخية وليس يقيناً. للأحداث السياسية والأمنية النادرة لا تكفي البيانات التاريخية، ولا تعرض المنصة احتمالات رقمية لها. راجع docs/FORECASTING.md للمنهجية.
      </Notice>
    </div>
  );
}
