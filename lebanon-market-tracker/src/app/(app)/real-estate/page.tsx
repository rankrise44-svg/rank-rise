import { IndicatorExplorer } from "@/components/indicators/IndicatorExplorer";
import { ListingsModule } from "@/components/ListingsModule";
import { NewsItem } from "@/components/news/NewsItem";
import { Card, CardHeader, EmptyState, ErrorState, Notice, PageHeader } from "@/components/ui";
import { fmtPct, fmtPeriod } from "@/lib/format";
import { listIndicators } from "@/lib/repo/indicators";
import { searchNews } from "@/lib/repo/news";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "العقارات" };

export default async function RealEstatePage() {
  const s = await getSettings();
  const [inds, news] = await Promise.all([
    safe(async () => (await listIndicators({ sector: "real_estate" })).filter((x) => x.latest_value !== null)),
    safe(() => searchNews({ sector: "real_estate", minRelevance: 0.35, limit: 10, offset: 0 })),
  ]);
  const yoy = inds.ok ? inds.data.filter((x) => x.code.startsWith("CAS.CPI.YOY_PCT.LBN.")) : [];
  return (
    <div className="space-y-4">
      <PageHeader title="العقارات" subtitle="مكوّنات الإيجار والسكن في مؤشر أسعار الاستهلاك الرسمي، الأخبار العقارية، ووحدة الإعلانات (سكني، تجاري، إيجارات)." />
      <Card>
        <CardHeader title="الإيجارات والسكن في مؤشر الأسعار الرسمي" subtitle="إدارة الإحصاء المركزي — التغير السنوي (لبنان)" />
        <div className="p-3">
          {!inds.ok ? <ErrorState message={inds.error} /> : yoy.length ? (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {yoy.map((x) => (
                <li key={x.id} className="rounded-lg border border-line bg-panel-2/60 p-3 text-sm">
                  <div className="text-ink-2">{String(x.metadata?.division_ar ?? x.metadata?.division ?? "").trim()}</div>
                  <div className="ltr-num mt-1 text-lg font-semibold text-amber">{fmtPct(x.latest_value)}</div>
                  <div className="text-[11px] text-muted">{fmtPeriod(x.latest_label ?? "")} · رسمي</div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="لا بيانات بعد" />}
          {inds.ok && inds.data.some((x) => x.metadata?.measure === "index") ? (
            <div className="mt-4">
              <IndicatorExplorer options={inds.data.filter((x) => x.metadata?.measure === "index" && x.metadata?.region === "Lebanon").map((x) => ({ id: x.id, label: String(x.metadata?.division_ar ?? x.name_ar ?? x.name_en).trim(), group: "الرقم القياسي (كانون الأول 2013 = 100)" }))} />
              <p className="mt-1 text-[11px] text-muted">تاريخ هذه السلاسل يتراكم شهرياً بدءاً من أول استيراد (الصفحة الرسمية تنشر آخر ملف فقط).</p>
            </div>
          ) : null}
        </div>
      </Card>
      <ListingsModule types={["property_sale", "property_rent", "commercial_sale", "commercial_rent"]} title="إعلانات العقارات" what="إعلانات العقارات" />
      <Card>
        <CardHeader title="أخبار العقارات والبناء" />
        {news.ok && news.data.rows.length ? news.data.rows.map((n) => <NewsItem key={n.id} n={n} tz={s.timezone} />) : <EmptyState title="لا أخبار مصنّفة في هذا القطاع بعد" />}
      </Card>
      <Notice>لا توجد بيانات رسمية منشورة عن أسعار الصفقات العقارية ضمن المصادر المفعّلة.</Notice>
    </div>
  );
}
