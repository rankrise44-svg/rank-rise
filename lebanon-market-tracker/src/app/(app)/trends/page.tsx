import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { IndicatorExplorer } from "@/components/indicators/IndicatorExplorer";
import { LebanonMap } from "@/components/map/LebanonMap";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Notice, PageHeader, inputCls } from "@/components/ui";
import { COUNTRY_NAMES_AR } from "@/lib/catalog/indicators";
import { fmtPct } from "@/lib/format";
import { SECTOR_LABELS, TOPIC_LABELS } from "@/lib/nav";
import { listIndicators } from "@/lib/repo/indicators";
import { buildMapLayers } from "@/lib/repo/maplayers";
import { newsVolumeDaily } from "@/lib/repo/news";
import { commodityTrend } from "@/lib/repo/prices";
import { latestSignals } from "@/lib/repo/signals";
import { safe } from "@/lib/safe";

export const metadata = { title: "الاتجاهات" };

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ sector?: string; commodity?: string; sig?: string }> }) {
  const sp = await searchParams;
  const sector = sp.sector && SECTOR_LABELS[sp.sector] ? sp.sector : undefined;
  const [inds, signals, volume, map] = await Promise.all([
    safe(async () => (await listIndicators({})).filter((x) => x.latest_value !== null && (!x.code.startsWith("CAS.") || x.metadata?.headline))),
    safe(() => latestSignals({ type: sp.sig || undefined, minSignificance: "low", limit: 60 })),
    safe(() => newsVolumeDaily(60, { sector })),
    safe(() => buildMapLayers({ commodity: sp.commodity })),
  ]);
  const trend = map.ok && map.data.commodity ? await safe(() => commodityTrend(map.data.commodity!, 48)) : null;
  return (
    <div className="space-y-4">
      <PageHeader title="الاتجاهات" subtitle="سلاسل تاريخية، مقارنات بين المؤشرات، إشارات تغيّر إحصائية، وخريطة تفاعلية مبنية على بيانات حقيقية." />
      <Card>
        <CardHeader title="مقارنة المؤشرات" subtitle="اختر مؤشرين وفترة زمنية" />
        <div className="p-4">
          {inds.ok ? <IndicatorExplorer options={inds.data.map((x) => ({ id: x.id, label: `${x.name_ar ?? x.name_en} — ${COUNTRY_NAMES_AR[x.country_code] ?? x.country_code}`, group: x.source_name }))} initial={[inds.data.find((x) => x.code === "PCPIPCH" && x.country_code === "LBN")?.id ?? "", inds.data.find((x) => x.code === "NGDP_RPCH" && x.country_code === "LBN")?.id ?? ""].filter(Boolean)} /> : <ErrorState message={inds.error} />}
        </div>
      </Card>

      <Card id="map">
        <CardHeader
          title="الخريطة الجغرافية"
          subtitle="حدود المحافظات من geoBoundaries (ملكية عامة). لا إحداثيات عشوائية: الأسواق بإحداثيات WFP، والتلوين من بيانات CAS أو عدّ آلي معلَن."
          actions={
            map.ok && map.data.commodities.length ? (
              <form method="get" className="flex items-center gap-1">
                <select name="commodity" defaultValue={map.data.commodity ?? ""} className={`${inputCls} py-1 text-xs`} aria-label="السلعة">
                  {map.data.commodities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className="rounded-md border border-line-strong px-2 py-1 text-xs hover:border-cyan/40">عرض</button>
              </form>
            ) : null
          }
        />
        <div className="p-3">{map.ok ? <LebanonMap layers={map.data.layers} height={520} /> : <ErrorState message={map.error} />}</div>
        {trend?.ok && trend.data.length ? (
          <div className="border-t border-line p-3">
            <p className="mb-2 text-xs text-muted">السعر الوسيط الشهري عبر الأسواق المرصودة — {map.ok ? map.data.commodity : ""} (ليرة ودولار)</p>
            <TimeSeriesChart data={trend.data.map((t) => ({ x: t.month, usd: t.median_usd === null ? null : Number(Number(t.median_usd).toFixed(2)) }))} series={[{ key: "usd", label: "بالدولار (وسيط)", color: "#34d399" }]} height={200} unit="$" />
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader
            title="حجم التغطية الإخبارية اليومي"
            subtitle="أخبار ذات صلة بلبنان (60 يوماً) — يقيس التغطية لا الأثر"
            actions={
              <form method="get" className="flex items-center gap-1">
                <select name="sector" defaultValue={sector ?? ""} className={`${inputCls} py-1 text-xs`} aria-label="القطاع">
                  <option value="">كل القطاعات</option>
                  {Object.entries(SECTOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="rounded-md border border-line-strong px-2 py-1 text-xs">تطبيق</button>
              </form>
            }
          />
          <div className="p-3">
            {volume.ok && volume.data.length > 1 ? <TimeSeriesChart data={volume.data.map((v) => ({ x: v.day, n: Number(v.n) }))} series={[{ key: "n", label: "عدد الأخبار", color: "#60a5fa" }]} height={220} /> : <EmptyState title="لا يكفي التاريخ المتراكم بعد">يبدأ تاريخ التغطية من أول مزامنة للمصادر.</EmptyState>}
          </div>
        </Card>
        <Card>
          <CardHeader title="إشارات التغيّر" subtitle="أحدث إشارة لكل موضوع/مؤشر/أداة مع طريقة حسابها" actions={
            <form method="get" className="flex items-center gap-1">
              <select name="sig" defaultValue={sp.sig ?? ""} className={`${inputCls} py-1 text-xs`} aria-label="نوع الإشارة">
                <option value="">كل الأنواع</option>
                <option value="news_volume">تغطية إخبارية</option>
                <option value="indicator_change">مؤشرات</option>
                <option value="market_change">أسواق</option>
              </select>
              <button className="rounded-md border border-line-strong px-2 py-1 text-xs">تطبيق</button>
            </form>
          } />
          <div className="scroll-thin max-h-[360px] overflow-auto">
            {signals.ok && signals.data.length ? (
              <table className="w-full min-w-[520px] text-xs">
                <thead className="sticky top-0 bg-panel text-muted"><tr><th className="p-2 text-start">الموضوع</th><th className="p-2 text-start">النافذة</th><th className="p-2 text-end">التغير</th><th className="p-2 text-end">z</th><th className="p-2">الدلالة</th></tr></thead>
                <tbody>
                  {signals.data.map((s) => (
                    <tr key={s.id} className="border-t border-line/50" title={s.method}>
                      <td className="p-2 text-ink-2">{s.subject_label ?? (s.subject_type === "sector" ? SECTOR_LABELS[s.subject_key] : s.subject_type === "topic" ? TOPIC_LABELS[s.subject_key] : s.subject_key) ?? s.subject_key}</td>
                      <td className="ltr-num p-2 text-muted">{s.window_end.toISOString().slice(0, 10)}</td>
                      <td className={`ltr-num p-2 text-end ${s.direction === "up" ? "text-emerald" : s.direction === "down" ? "text-rose" : ""}`}>{s.change_pct === null ? "—" : fmtPct(s.change_pct)}</td>
                      <td className="ltr-num p-2 text-end text-muted">{s.zscore ?? "—"}</td>
                      <td className="p-2 text-center"><Badge tone={s.significance === "high" ? "rose" : s.significance === "medium" ? "amber" : "neutral"}>{s.significance}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="لا إشارات" />}
          </div>
        </Card>
      </div>
      <Notice>إشارات المؤشرات السنوية قد تعكس تغيّرات قديمة (مثل انهيار 2020) لأن آخر قيمة منشورة قديمة؛ تحقق من «النافذة» قبل التفسير.</Notice>
    </div>
  );
}
