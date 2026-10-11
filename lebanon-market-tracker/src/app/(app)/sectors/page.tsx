import Link from "next/link";
import { Badge, Card, ErrorState, Notice, PageHeader } from "@/components/ui";
import { query } from "@/lib/db";
import { safe } from "@/lib/safe";

export const metadata = { title: "الشركات والقطاعات" };

export default async function SectorsPage() {
  const r = await safe(() =>
    query<{ key: string; name_ar: string; news30: string; indicators: string; companies: string; opps: string; sig_change: string | null; sig_sig: string | null; neg: string; pos: string }>(
      `SELECT s.key, s.name_ar,
              (SELECT count(*) FROM news_articles n WHERE s.key = ANY(n.sectors) AND n.duplicate_of IS NULL AND NOT n.is_synthetic AND n.lebanon_relevance >= 0.35 AND COALESCE(n.published_at, n.collected_at) > now() - interval '30 days') AS news30,
              (SELECT count(*) FROM news_articles n WHERE s.key = ANY(n.sectors) AND n.impact = 'negative' AND NOT n.is_synthetic AND COALESCE(n.published_at, n.collected_at) > now() - interval '30 days') AS neg,
              (SELECT count(*) FROM news_articles n WHERE s.key = ANY(n.sectors) AND n.impact = 'positive' AND NOT n.is_synthetic AND COALESCE(n.published_at, n.collected_at) > now() - interval '30 days') AS pos,
              (SELECT count(*) FROM economic_indicators i WHERE i.sector_key = s.key AND i.country_code = 'LBN') AS indicators,
              (SELECT count(*) FROM companies c WHERE c.sector_key = s.key AND NOT c.is_synthetic) AS companies,
              (SELECT count(*) FROM opportunities o WHERE o.sector_key = s.key AND NOT o.is_synthetic AND o.status NOT IN ('rejected','archived')) AS opps,
              t.change_pct AS sig_change, t.significance AS sig_sig
         FROM sectors s
         LEFT JOIN LATERAL (SELECT change_pct, significance FROM trend_signals WHERE signal_type='news_volume' AND subject_type='sector' AND subject_key = s.key ORDER BY window_end DESC LIMIT 1) t ON true
        WHERE s.is_active ORDER BY s.sort_order`,
    ),
  );
  return (
    <div className="space-y-4">
      <PageHeader title="الشركات والقطاعات" subtitle="17 قطاعاً قابلة للتوسعة من قاعدة البيانات. الأرقام أدناه عدّ لما جُمع فعلاً، وليست أحجام أسواق أو مبيعات." />
      {!r.ok ? <ErrorState message={r.error} /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {r.data.map((s) => (
            <Link key={s.key} href={`/sectors/${s.key}`}>
              <Card className="h-full p-4 transition hover:border-cyan/40">
                <h2 className="text-[15px] font-semibold">{s.name_ar}</h2>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span>أخبار (30 يوماً): <b className="text-ink">{s.news30}</b></span>
                  <span>مؤشرات رسمية: <b className="text-ink">{s.indicators}</b></span>
                  <span>شركات معروفة: <b className="text-ink">{s.companies}</b></span>
                  <span>فرضيات فرص: <b className="text-ink">{s.opps}</b></span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.sig_sig && s.sig_sig !== "low" ? <Badge tone="amber">تغطية {s.sig_change ? `${Number(s.sig_change) > 0 ? "+" : ""}${Number(s.sig_change).toFixed(0)}%` : ""}</Badge> : null}
                  {Number(s.pos) ? <Badge tone="emerald">إيجابي محتمل {s.pos}</Badge> : null}
                  {Number(s.neg) ? <Badge tone="rose">سلبي محتمل {s.neg}</Badge> : null}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Notice>تغطية الشركات محدودة بقائمة أولية وبما يرد في الأخبار؛ لا تدّعي المنصة تغطية شاملة ولا تملك بيانات مبيعات أو حصص سوقية.</Notice>
    </div>
  );
}
