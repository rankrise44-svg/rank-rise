import Link from "next/link";
import { Activity, Lightbulb, Map as MapIcon, Newspaper, Scale, TrendingUp } from "lucide-react";
import { TimeSeriesChart, type Point } from "../charts/TimeSeriesChart";
import { LebanonMap } from "../map/LebanonMap";
import { NewsItem } from "../news/NewsItem";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Freshness, Notice, SyntheticBadge } from "../ui";
import { query } from "@/lib/db";
import { fmtDate, fmtNum, fmtPct, fmtPeriod } from "@/lib/format";
import { SECTOR_LABELS, TOPIC_LABELS } from "@/lib/nav";
import { findIndicator, getSeries } from "@/lib/repo/indicators";
import { buildMapLayers } from "@/lib/repo/maplayers";
import { getMarketSeries } from "@/lib/repo/markets";
import { searchNews } from "@/lib/repo/news";
import { latestSignals } from "@/lib/repo/signals";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";

export async function MacroTrendsCard() {
  const r = await safe(async () => {
    const [infl, growth] = await Promise.all([findIndicator("PCPIPCH", "LBN", "imf-datamapper"), findIndicator("NGDP_RPCH", "LBN", "imf-datamapper")]);
    const [a, b] = await Promise.all([
      infl ? getSeries(infl.id, { from: "2010-01-01" }) : [],
      growth ? getSeries(growth.id, { from: "2010-01-01" }) : [],
    ]);
    const map = new Map<string, Point>();
    for (const o of a) map.set(o.period_label, { ...(map.get(o.period_label) ?? { x: o.period_label }), infl: Number(o.value) });
    for (const o of b) map.set(o.period_label, { ...(map.get(o.period_label) ?? { x: o.period_label }), growth: Number(o.value) });
    return { points: [...map.values()].sort((x, y) => x.x.localeCompare(y.x)), infl, growth };
  });
  return (
    <Card>
      <CardHeader
        icon={<TrendingUp className="size-4 text-cyan" />}
        title="اتجاهات الاقتصاد اللبناني"
        subtitle="التضخم ونمو الناتج الحقيقي، سنوياً (صندوق النقد الدولي — آفاق الاقتصاد العالمي)"
        actions={<Link href="/trends" className="text-xs text-sky hover:underline">استكشاف المؤشرات</Link>}
      />
      <div className="p-3">
        {!r.ok ? (
          <ErrorState message={r.error} />
        ) : r.data.points.length ? (
          <>
            <TimeSeriesChart
              data={r.data.points}
              series={[
                { key: "infl", label: "التضخم ٪", color: "#fbbf24" },
                { key: "growth", label: "نمو الناتج ٪", color: "#60a5fa" },
              ]}
              unit="%"
            />
            <p className="mt-2 text-[11px] text-muted">
              تضخم 2020–2023 تجاوز 100٪ في بعض السنوات؛ القيم الأخيرة قد تكون تقديرات قابلة للمراجعة. المصدر:{" "}
              <a className="underline" href="https://www.imf.org/external/datamapper/profile/LBN" target="_blank" rel="noopener noreferrer">IMF DataMapper</a>
            </p>
          </>
        ) : (
          <EmptyState title="لا توجد سلاسل بعد">شغّل مصدر «صندوق النقد الدولي» من صفحة المصادر.</EmptyState>
        )}
      </div>
    </Card>
  );
}

export async function MapCard() {
  const r = await safe(() => buildMapLayers());
  return (
    <Card>
      <CardHeader
        icon={<MapIcon className="size-4 text-cyan" />}
        title="الخريطة الجغرافية"
        subtitle="طبقات مبنية على بيانات حقيقية فقط؛ الطبقات المستنتجة مُعلَّمة"
        actions={<Link href="/trends#map" className="text-xs text-sky hover:underline">خريطة كاملة</Link>}
      />
      <div className="p-3">
        {!r.ok ? <ErrorState message={r.error} /> : r.data.layers.length ? <LebanonMap layers={r.data.layers} height={360} /> : <EmptyState title="لا توجد بيانات جغرافية بعد" />}
      </div>
    </Card>
  );
}

export async function LatestNewsCard() {
  const s = await getSettings();
  const r = await safe(() => searchNews({ minRelevance: s.minRelevance, limit: 7, offset: 0 }));
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<Newspaper className="size-4 text-cyan" />}
        title="آخر الأخبار والأحداث"
        subtitle="أخبار ذات صلة بلبنان من المصادر المفعّلة"
        actions={<Link href="/news" className="text-xs text-sky hover:underline">عرض الكل</Link>}
      />
      {!r.ok ? (
        <div className="p-3"><ErrorState message={r.error} /></div>
      ) : r.data.rows.length ? (
        <div className="scroll-thin max-h-[520px] overflow-y-auto">
          {r.data.rows.map((n) => (
            <NewsItem key={n.id} n={n} tz={s.timezone} compact />
          ))}
        </div>
      ) : (
        <EmptyState title="لم تُجمع أخبار بعد">فعّل مصادر RSS أو GDELT وشغّل المزامنة من صفحة المصادر.</EmptyState>
      )}
    </Card>
  );
}

/** Price changes by CPI expenditure division (official CAS data) — a defensible "sector performance" view. */
export async function SectorPricesCard() {
  const r = await safe(() =>
    query<{ division: string; division_ar: string | null; value: string; period_label: string; sector_key: string | null; weight: string | null }>(
      `SELECT DISTINCT ON (i.code) i.metadata->>'division' AS division, i.metadata->>'division_ar' AS division_ar, o.value, o.period_label,
              i.sector_key, i.metadata->>'weight' AS weight
         FROM economic_indicators i JOIN indicator_observations o ON o.indicator_id = i.id AND o.is_current
        WHERE i.code LIKE 'CAS.CPI.YOY_PCT.LBN.%' AND i.code <> 'CAS.CPI.YOY_PCT.LBN.TOTAL' AND NOT i.is_synthetic
        ORDER BY i.code, o.period_date DESC`,
    ),
  );
  return (
    <Card>
      <CardHeader
        icon={<Scale className="size-4 text-cyan" />}
        title="تغيّر الأسعار بحسب أبواب الإنفاق"
        subtitle="التغير السنوي في مؤشر أسعار الاستهلاك — لبنان (إدارة الإحصاء المركزي)"
      />
      <div className="p-3">
        {!r.ok ? (
          <ErrorState message={r.error} />
        ) : r.data.length ? (
          <table className="w-full text-xs">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-1.5 text-start font-medium">باب الإنفاق</th>
                <th className="py-1.5 text-start font-medium">الوزن</th>
                <th className="py-1.5 text-end font-medium">التغير السنوي</th>
              </tr>
            </thead>
            <tbody>
              {r.data
                .filter((x) => !/^\s/.test(x.division) && !/rent|owner/i.test(x.division))
                .sort((a, b) => Number(b.value) - Number(a.value))
                .map((x) => (
                  <tr key={x.division} className="border-b border-line/50">
                    <td className="py-1.5 text-ink-2">{x.division_ar ?? x.division}</td>
                    <td className="ltr-num py-1.5 text-muted">{x.weight ? `${fmtNum(x.weight)}%` : "—"}</td>
                    <td className={`ltr-num py-1.5 text-end font-medium ${Number(x.value) > 0 ? "text-amber" : "text-emerald"}`}>{fmtPct(x.value)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="لا توجد بيانات أسعار بحسب الأبواب بعد" />
        )}
        {r.ok && r.data[0] ? <p className="mt-2 text-[11px] text-muted">الفترة: {fmtPeriod(r.data[0].period_label)} مقارنةً بالشهر نفسه من العام السابق.</p> : null}
      </div>
    </Card>
  );
}

export async function SignalsCard() {
  const r = await safe(() => latestSignals({ minSignificance: "medium", limit: 8, recentOnly: true }));
  return (
    <Card>
      <CardHeader icon={<Activity className="size-4 text-cyan" />} title="إشارات تغيّر هذا الأسبوع" subtitle="مقارنات إحصائية؛ حجم التغطية الإخبارية ليس مقياساً للأثر الاقتصادي" actions={<Link href="/trends" className="text-xs text-sky hover:underline">الكل</Link>} />
      <div className="p-3">
        {!r.ok ? (
          <ErrorState message={r.error} />
        ) : r.data.length ? (
          <ul className="space-y-1.5 text-xs">
            {r.data.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-line/60 bg-panel-2/50 px-2 py-1.5">
                <span className="truncate text-ink-2">
                  {s.signal_type === "news_volume" ? "تغطية: " : s.signal_type === "market_change" ? "سوق: " : "مؤشر: "}
                  {s.subject_label ?? (s.subject_type === "sector" ? SECTOR_LABELS[s.subject_key] : s.subject_type === "topic" ? TOPIC_LABELS[s.subject_key] : s.subject_key) ?? s.subject_key}
                </span>
                <span className="flex items-center gap-1.5">
                  {s.change_pct !== null ? <span className={`ltr-num ${s.direction === "up" ? "text-emerald" : s.direction === "down" ? "text-rose" : "text-muted"}`}>{fmtPct(s.change_pct)}</span> : null}
                  <Badge tone={s.significance === "high" ? "rose" : "amber"}>{s.significance === "high" ? "قوية" : "متوسطة"}</Badge>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="لا إشارات ذات دلالة حالياً">تحتاج الإشارات إلى عدة أسابيع من البيانات المتراكمة لتكون موثوقة.</EmptyState>
        )}
      </div>
    </Card>
  );
}

export async function OpportunitiesCard() {
  const s = await getSettings();
  const r = await safe(() =>
    query<{ id: string; title: string; sector_key: string | null; overall_score: string | null; confidence: string; assessed_at: Date | null; status: string; is_synthetic: boolean; n_for: string; n_against: string }>(
      `SELECT o.id, o.title, o.sector_key, o.overall_score, o.confidence, o.assessed_at, o.status, o.is_synthetic,
              count(e.*) FILTER (WHERE e.stance = 'supports') AS n_for, count(e.*) FILTER (WHERE e.stance = 'contradicts') AS n_against
         FROM opportunities o LEFT JOIN opportunity_evidence e ON e.opportunity_id = o.id
        WHERE (NOT o.is_synthetic OR $1) AND o.status NOT IN ('rejected','archived')
        GROUP BY o.id ORDER BY o.overall_score DESC NULLS LAST LIMIT 5`,
      [s.demoMode],
    ),
  );
  return (
    <Card>
      <CardHeader icon={<Lightbulb className="size-4 text-cyan" />} title="الفرص المرشّحة" subtitle="فرضيات تحتاج تحققاً — الدرجة ليست احتمال نجاح" actions={<Link href="/opportunities" className="text-xs text-sky hover:underline">عرض الكل</Link>} />
      <div className="p-3">
        {!r.ok ? (
          <ErrorState message={r.error} />
        ) : r.data.length ? (
          <ul className="space-y-2">
            {r.data.map((o) => (
              <li key={o.id}>
                <Link href={`/opportunities/${o.id}`} className="block rounded-lg border border-line bg-panel-2/60 p-2.5 hover:border-cyan/40">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-ink">{o.title}</span>
                    {o.overall_score ? <span className="ltr-num text-sm font-semibold text-cyan">{Number(o.overall_score).toFixed(0)}</span> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                    {o.sector_key ? <Badge tone="cyan">{SECTOR_LABELS[o.sector_key] ?? o.sector_key}</Badge> : null}
                    <Badge tone={o.confidence === "unvalidated" ? "amber" : "sky"}>{o.confidence === "unvalidated" ? "غير متحقق منها" : `ثقة ${o.confidence}`}</Badge>
                    <Badge>أدلة داعمة {o.n_for} · معاكسة {o.n_against}</Badge>
                    {o.is_synthetic ? <SyntheticBadge /> : null}
                    {o.assessed_at ? <span className="text-muted">قُيّمت {fmtDate(o.assessed_at, s.timezone)}</span> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="لا توجد فرص مسجّلة بعد">
            يمكنك توليد فرضيات من الإشارات المتوفرة أو إضافة فرضية يدوياً من صفحة{" "}
            <Link href="/opportunities" className="text-sky underline">الفرص</Link>.
          </EmptyState>
        )}
      </div>
    </Card>
  );
}

export async function LbpRateCard() {
  const r = await safe(async () => {
    const [off, par] = await Promise.all([getMarketSeries("USD/LBP", "bdl-official-rate", "official", 900), getMarketSeries("USD/LBP", "wfp-food-prices", "parallel", 900)]);
    const map = new Map<string, Point>();
    for (const o of off) {
      const k = o.observed_at.toISOString().slice(0, 7);
      map.set(k, { ...(map.get(k) ?? { x: k }), official: Number(o.value) });
    }
    for (const o of par) {
      const k = o.observed_at.toISOString().slice(0, 7);
      map.set(k, { ...(map.get(k) ?? { x: k }), parallel: Number(o.value) });
    }
    return { points: [...map.values()].sort((a, b) => a.x.localeCompare(b.x)), lastOfficial: off.at(-1) };
  });
  return (
    <Card>
      <CardHeader title="الليرة اللبنانية: الرسمي مقابل الموازي" subtitle="لا يُفترض تطابق السعر الرسمي مع سعر السوق — كل نوع مُعروض منفصلاً" actions={r.ok && r.data.lastOfficial ? <Freshness at={r.data.lastOfficial.observed_at} expectedHours={72} /> : null} />
      <div className="p-3">
        {!r.ok ? (
          <ErrorState message={r.error} />
        ) : r.data.points.length ? (
          <>
            <TimeSeriesChart data={r.data.points} series={[{ key: "official", label: "رسمي (مصرف لبنان)", color: "#34d399" }, { key: "parallel", label: "موازٍ (رصد WFP الشهري)", color: "#fbbf24", dashed: true }]} height={200} />
            <Notice>السعر الرسمي يومي من مصرف لبنان (عبر Frankfurter)؛ السعر الموازي شهري وهو وسيط ما رصده برنامج الأغذية العالمي في الأسواق.</Notice>
          </>
        ) : (
          <EmptyState title="لا بيانات سعر صرف بعد" />
        )}
      </div>
    </Card>
  );
}
