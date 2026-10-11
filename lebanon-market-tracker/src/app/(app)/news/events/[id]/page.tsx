import { notFound } from "next/navigation";
import { NewsItem } from "@/components/news/NewsItem";
import { Badge, Card, CardHeader, InferredBadge, Notice, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { IMPACT_LABELS, SECTOR_LABELS, TOPIC_LABELS } from "@/lib/nav";
import { getEvent } from "@/lib/repo/news";
import { getSettings } from "@/lib/settings";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [d, s] = await Promise.all([getEvent(id), getSettings()]);
  if (!d) notFound();
  const { event: e, articles, entities } = d;
  return (
    <div className="space-y-4">
      <PageHeader title={e.title} subtitle={`حدث مجمّع آلياً (${e.method}) — من ${fmtDate(e.first_seen_at, s.timezone, true)} إلى ${fmtDate(e.last_seen_at, s.timezone, true)}`} />
      <div className="flex flex-wrap gap-1.5">
        <InferredBadge />
        <Badge>{e.article_count} أخبار</Badge>
        <Badge>{e.source_count} مصادر مستقلة</Badge>
        {e.topics.map((t) => <Badge key={t} tone="sky">{TOPIC_LABELS[t] ?? t}</Badge>)}
        {e.sectors.map((t) => <Badge key={t} tone="cyan">{SECTOR_LABELS[t] ?? t}</Badge>)}
        {e.impact ? <Badge tone={IMPACT_LABELS[e.impact]?.tone ?? "neutral"}>{IMPACT_LABELS[e.impact]?.label ?? e.impact}</Badge> : null}
      </div>
      <Notice>ما تنقله المصادر يظهر في عناوينها وروابطها أدناه. التجميع والتصنيف والأثر استنتاجات آلية لم يتحقق منها إنسان.</Notice>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] [&>*]:min-w-0">
        <Card className="min-w-0">
          <CardHeader title="تطوّر التغطية (الأقدم أولاً)" />
          {articles.map((n) => <NewsItem key={n.id} n={n} tz={s.timezone} />)}
        </Card>
        <Card>
          <CardHeader title="الكيانات المذكورة" subtitle="استخراج آلي بالمطابقة مع قوائم معروفة" />
          <ul className="space-y-1 p-3 text-sm">
            {entities.length ? entities.map((x) => (
              <li key={`${x.entity_type}:${x.entity_key}`} className="flex justify-between"><span>{x.name}</span><span className="text-xs text-muted">{x.entity_type} · {x.mention_count}</span></li>
            )) : <li className="text-xs text-muted">لا كيانات معروفة.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
