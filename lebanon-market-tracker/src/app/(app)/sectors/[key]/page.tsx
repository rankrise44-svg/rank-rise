import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiButton } from "@/components/actions";
import { NewsItem } from "@/components/news/NewsItem";
import { Badge, Card, CardHeader, EmptyState, InferredBadge, Notice, PageHeader } from "@/components/ui";
import { query } from "@/lib/db";
import { fmtNum, fmtPeriod } from "@/lib/format";
import { SECTOR_LABELS } from "@/lib/nav";
import { buildSectorEvidence } from "@/lib/opportunities/evidence";
import { searchNews } from "@/lib/repo/news";
import { getSettings } from "@/lib/settings";

export default async function SectorPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!SECTOR_LABELS[key]) {
    const custom = await query("SELECT 1 FROM sectors WHERE key = $1", [key]);
    if (!custom.length) notFound();
  }
  const s = await getSettings();
  const [ev, risks, opps, companies] = await Promise.all([
    buildSectorEvidence(key, 30),
    searchNews({ sector: key, minRelevance: 0.35, limit: 6, offset: 0, from: new Date(Date.now() - 60 * 86400_000) }).then((r) => r.rows.filter((n) => n.impact === "negative")),
    query<{ id: string; title: string; overall_score: string | null; confidence: string }>("SELECT id, title, overall_score, confidence FROM opportunities WHERE sector_key = $1 AND NOT is_synthetic AND status NOT IN ('rejected','archived') ORDER BY overall_score DESC NULLS LAST", [key]),
    query<{ name: string; name_ar: string | null; website: string | null; mentions: string; last: Date | null }>(
      `SELECT c.name, c.name_ar, c.website, count(o.id) AS mentions, max(o.observed_at) AS last FROM companies c LEFT JOIN company_observations o ON o.company_id = c.id
        WHERE c.sector_key = $1 AND NOT c.is_synthetic GROUP BY c.id ORDER BY 4 DESC`,
      [key],
    ),
  ]);
  const quality = ev.official_indicators.length >= 2 && ev.news_coverage.articles >= 10 ? "متوسطة" : ev.official_indicators.length || ev.news_coverage.articles >= 5 ? "منخفضة" : "ضعيفة جداً";
  return (
    <div className="space-y-4">
      <PageHeader title={ev.sector_name} subtitle={`جودة البيانات المتاحة لهذا القطاع: ${quality}. كل ما يلي مأخوذ من قاعدة البيانات مع روابطه.`} actions={<ApiButton url="/api/reports" body={{ type: "sector", sector: key }} label="إنشاء تقرير القطاع" describe="sectorReport" />} />
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="مؤشرات متاحة" subtitle="مؤشرات رسمية مرتبطة بالقطاع" />
          <div className="p-3">
            {ev.official_indicators.length ? (
              <ul className="space-y-1.5 text-sm">
                {ev.official_indicators.map((i) => (
                  <li key={i.cite} className="flex justify-between gap-2"><span className="text-ink-2">{i.name}</span><span className="ltr-num shrink-0">{fmtNum(i.latest_value)} <span className="text-xs text-muted">{i.unit} · {fmtPeriod(i.latest_period ?? "")}</span></span></li>
                ))}
              </ul>
            ) : <EmptyState title="لا مؤشر رسمي مرتبط بهذا القطاع" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="التغطية الإخبارية (30 يوماً)" actions={<InferredBadge />} />
          <div className="space-y-1 p-3 text-sm">
            <p>عدد الأخبار ذات الصلة: <b>{ev.news_coverage.articles}</b> — إيجابي محتمل {ev.news_coverage.inferred_positive}، سلبي محتمل {ev.news_coverage.inferred_negative}.</p>
            {ev.news_coverage.volume_signal ? <p className="text-xs text-muted">آخر 7 أيام: {ev.news_coverage.volume_signal.current_7d} مقابل متوسط أسبوعي {ev.news_coverage.volume_signal.baseline_weekly_avg} (دلالة {ev.news_coverage.volume_signal.significance}).</p> : null}
            <Link href={`/news?sector=${key}`} className="text-xs text-sky hover:underline">كل أخبار القطاع</Link>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
        <Card className="min-w-0">
          <CardHeader title="أحدث الأخبار والأحداث" />
          {ev.news_coverage.top_articles.length ? (await searchNews({ sector: key, minRelevance: 0.35, limit: 8, offset: 0 })).rows.map((n) => <NewsItem key={n.id} n={n} tz={s.timezone} />) : <EmptyState title="لا أخبار" />}
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="شركات ومنافسون معروفون" subtitle="قائمة غير شاملة" />
            <ul className="space-y-1 p-3 text-sm">
              {companies.length ? companies.map((c) => (
                <li key={c.name} className="flex justify-between"><span>{c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer" className="hover:text-cyan">{c.name}</a> : c.name}</span><span className="text-xs text-muted">{c.mentions} ذكر</span></li>
              )) : <li className="text-xs text-muted">لا شركات معروفة في هذا القطاع ضمن قاعدة البيانات.</li>}
            </ul>
          </Card>
          <Card>
            <CardHeader title="فرضيات فرص" />
            <ul className="space-y-1 p-3 text-sm">
              {opps.length ? opps.map((o) => <li key={o.id}><Link href={`/opportunities/${o.id}`} className="hover:text-cyan">{o.title}</Link> <Badge tone="amber">{o.confidence === "unvalidated" ? "غير متحقق" : o.confidence}</Badge></li>) : <li className="text-xs text-muted">لا توجد. <Link href="/opportunities" className="text-sky">أضف فرضية</Link></li>}
            </ul>
          </Card>
          <Card>
            <CardHeader title="مخاطر مرصودة" subtitle="أخبار مصنّفة آلياً كسلبية الأثر (60 يوماً)" />
            <ul className="space-y-1 p-3 text-xs">
              {risks.length ? risks.map((n) => <li key={n.id}><a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:text-cyan" dir="auto">{n.title}</a></li>) : <li className="text-muted">لا أخبار سلبية مصنّفة في الفترة.</li>}
            </ul>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader title="فجوات البيانات" />
        <ul className="list-disc space-y-1 p-4 ps-8 text-sm text-ink-2">{ev.data_gaps.map((g) => <li key={g}>{g}</li>)}</ul>
      </Card>
      <Notice>لا نملك أرقام مبيعات أو حصص سوقية موثوقة لهذا القطاع؛ أي تقدير من هذا النوع يجب أن يأتي من مصدر مذكور.</Notice>
    </div>
  );
}
