import { IndicatorExplorer } from "@/components/indicators/IndicatorExplorer";
import { ListingsModule } from "@/components/ListingsModule";
import { NewsItem } from "@/components/news/NewsItem";
import { Card, CardHeader, EmptyState, Notice, PageHeader } from "@/components/ui";
import { COUNTRY_NAMES_AR } from "@/lib/catalog/indicators";
import { listIndicators } from "@/lib/repo/indicators";
import { searchNews } from "@/lib/repo/news";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "الوظائف" };

export default async function JobsPage() {
  const s = await getSettings();
  const [inds, news] = await Promise.all([
    safe(async () => (await listIndicators({ category: "labour" })).filter((x) => x.latest_value !== null)),
    safe(() => searchNews({ sector: "employment", minRelevance: 0.35, limit: 10, offset: 0 })),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="الوظائف وسوق العمل" subtitle="مؤشرات البطالة الرسمية، أخبار سوق العمل، ووحدة إعلانات الوظائف." />
      <Card>
        <CardHeader title="البطالة" subtitle="تقديرات منظمة العمل الدولية (البنك الدولي) وصندوق النقد — سنوية ومتأخرة" />
        <div className="p-4">
          {inds.ok && inds.data.length ? (
            <IndicatorExplorer
              options={inds.data.map((x) => ({ id: x.id, label: `${x.name_ar ?? x.name_en} — ${COUNTRY_NAMES_AR[x.country_code] ?? x.country_code}`, group: x.source_key.startsWith("imf") ? "صندوق النقد" : "البنك الدولي" }))}
              initial={[inds.data.find((x) => x.country_code === "LBN" && x.code === "SL.UEM.TOTL.ZS")?.id ?? inds.data[0].id]}
            />
          ) : <EmptyState title="لا مؤشرات عمل بعد" />}
        </div>
      </Card>
      <ListingsModule types={["job"]} title="إعلانات الوظائف" what="إعلانات الوظائف" />
      <Card>
        <CardHeader title="أخبار التوظيف وسوق العمل" />
        {news.ok && news.data.rows.length ? news.data.rows.map((n) => <NewsItem key={n.id} n={n} tz={s.timezone} />) : <EmptyState title="لا أخبار مصنّفة بعد" />}
      </Card>
      <Notice>لا يُستنتج «ارتفاع التوظيف» من عدد الأخبار. يتطلب ذلك مصدراً لإعلانات الوظائف يُرصد بانتظام عبر الزمن.</Notice>
    </div>
  );
}
