import Link from "next/link";
import { Download, Layers } from "lucide-react";
import { NewsItem } from "@/components/news/NewsItem";
import { Badge, Card, CardHeader, EmptyState, ErrorState, NoResults, Notice, PageHeader, inputCls } from "@/components/ui";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { AREA_LABELS, IMPACT_LABELS, SECTOR_LABELS, TOPIC_LABELS } from "@/lib/nav";
import { listEvents, newsFilterSchema, searchNews } from "@/lib/repo/news";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "الأخبار والأحداث" };

type SP = Record<string, string | undefined>;

export default async function NewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const days = sp.days ? Number(sp.days) : undefined;
  const filter = newsFilterSchema.safeParse({
    q: sp.q || undefined, topic: sp.topic || undefined, sector: sp.sector || undefined, area: sp.area || undefined, lang: sp.lang || undefined, source: sp.source || undefined,
    minRelevance: sp.rel !== undefined && sp.rel !== "" ? Number(sp.rel) : sp.q ? undefined : s.minRelevance,
    from: days ? new Date(Date.now() - days * 86400_000) : undefined, includeDuplicates: sp.dups === "1", limit: 25, offset: (page - 1) * 25,
  });
  const [res, events, sources] = await Promise.all([
    filter.success ? safe(() => searchNews(filter.data)) : Promise.resolve({ ok: false as const, error: "معاملات البحث غير صالحة", kind: "other" as const }),
    safe(() => listEvents(12, 14)),
    safe(() => query<{ key: string; name: string }>("SELECT key, name FROM sources WHERE connector IN ('rss','gdelt') ORDER BY name")),
  ]);
  const qs = (patch: SP) => {
    const u = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]);
    return `/news?${u.toString()}`;
  };
  return (
    <div>
      <PageHeader
        title="الأخبار والأحداث"
        subtitle="أخبار مجمّعة من مصادر RSS وGDELT. نعرض العنوان والرابط والمصدر والوقت ومقتطفاً قصيراً فقط؛ التصنيفات مستنتجة آلياً."
        actions={<a href="/api/export?dataset=news" className="inline-flex items-center gap-1 rounded-lg border border-line-strong bg-panel-2 px-3 py-1.5 text-sm hover:border-cyan/40"><Download className="size-4" /> تصدير CSV (بيانات وصفية)</a>}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
        <div className="min-w-0 space-y-4">
          <Card className="p-3">
            <form method="get" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input name="q" defaultValue={sp.q} placeholder="كلمات البحث (عربي/إنكليزي/فرنسي)" className={`${inputCls} lg:col-span-2`} />
              <select name="topic" defaultValue={sp.topic ?? ""} className={inputCls} aria-label="الموضوع">
                <option value="">كل المواضيع</option>
                {Object.entries(TOPIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select name="sector" defaultValue={sp.sector ?? ""} className={inputCls} aria-label="القطاع">
                <option value="">كل القطاعات</option>
                {Object.entries(SECTOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select name="area" defaultValue={sp.area ?? ""} className={inputCls} aria-label="المنطقة">
                <option value="">كل المناطق</option>
                {Object.entries(AREA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select name="lang" defaultValue={sp.lang ?? ""} className={inputCls} aria-label="اللغة">
                <option value="">كل اللغات</option>
                <option value="ar">عربي</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
              <select name="source" defaultValue={sp.source ?? ""} className={inputCls} aria-label="المصدر">
                <option value="">كل المصادر</option>
                {sources.ok ? sources.data.map((x) => <option key={x.key} value={x.key}>{x.name}</option>) : null}
              </select>
              <select name="days" defaultValue={sp.days ?? ""} className={inputCls} aria-label="الفترة">
                <option value="">كل الفترات</option>
                <option value="1">آخر 24 ساعة</option>
                <option value="7">آخر 7 أيام</option>
                <option value="30">آخر 30 يوماً</option>
              </select>
              <select name="rel" defaultValue={sp.rel ?? ""} className={inputCls} aria-label="الصلة بلبنان">
                <option value="">الصلة: افتراضي ({s.minRelevance})</option>
                <option value="0">كل الأخبار</option>
                <option value="0.6">صلة عالية (≥0.6)</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-ink-2"><input type="checkbox" name="dups" value="1" defaultChecked={sp.dups === "1"} className="accent-cyan" /> إظهار النسخ المكرّرة</label>
              <button className="rounded-lg bg-cyan/90 px-3 py-2 text-sm font-medium text-bg hover:bg-cyan">بحث</button>
            </form>
          </Card>
          <Card>
            <CardHeader title={res.ok ? `النتائج (${res.data.total})` : "النتائج"} subtitle="مرتبة حسب الصلة بالبحث أو الأحدث" />
            {!res.ok ? (
              <div className="p-3"><ErrorState message={res.error} /></div>
            ) : res.data.rows.length ? (
              <>
                {res.data.rows.map((n) => <NewsItem key={n.id} n={n} tz={s.timezone} />)}
                <div className="flex items-center justify-between p-3 text-sm">
                  {page > 1 ? <Link className="text-sky hover:underline" href={qs({ page: String(page - 1) })}>→ السابق</Link> : <span />}
                  <span className="text-muted">صفحة {page} من {Math.max(1, Math.ceil(res.data.total / 25))}</span>
                  {page * 25 < res.data.total ? <Link className="text-sky hover:underline" href={qs({ page: String(page + 1) })}>التالي ←</Link> : <span />}
                </div>
              </>
            ) : sp.q || sp.topic || sp.sector ? (
              <NoResults>لا نتائج مطابقة. جرّب كلمات أخرى أو وسّع الفترة.</NoResults>
            ) : (
              <EmptyState title="لم تُجمع أخبار بعد">فعّل مصادر RSS أو GDELT وشغّل المزامنة من صفحة المصادر.</EmptyState>
            )}
          </Card>
        </div>
        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader icon={<Layers className="size-4 text-cyan" />} title="أحداث تغطيها عدة أخبار" subtitle="تجميع آلي حسب تشابه العناوين (نفس اللغة، 72 ساعة)" />
            {!events.ok ? (
              <div className="p-3"><ErrorState message={events.error} /></div>
            ) : events.data.length ? (
              <ul className="divide-y divide-line/60">
                {events.data.map((e) => (
                  <li key={e.id} className="p-3">
                    <Link href={`/news/events/${e.id}`} dir="auto" className="text-sm text-ink hover:text-cyan">{e.title}</Link>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted">
                      <Badge>{e.article_count} أخبار</Badge>
                      <Badge>{e.source_count} مصادر</Badge>
                      {e.impact && e.impact !== "neutral" ? <Badge tone={IMPACT_LABELS[e.impact].tone}>{IMPACT_LABELS[e.impact].label}</Badge> : null}
                      <span>{fmtDate(e.last_seen_at, s.timezone, true)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="لا أحداث مجمّعة بعد">تتشكّل الأحداث حين تنشر عدة مصادر خبراً متشابهاً.</EmptyState>
            )}
          </Card>
          <Notice>
            عدد الأخبار عن حدث ما يقيس حجم التغطية وليس حجم أثره الاقتصادي. «أول رصد» يعني وقت اكتشاف GDELT للخبر وليس وقت نشره.
          </Notice>
        </aside>
      </div>
    </div>
  );
}
