import Link from "next/link";
import { ApiButton } from "@/components/actions";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, inputCls } from "@/components/ui";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { SECTOR_LABELS } from "@/lib/nav";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";
import { SectorReportForm } from "./SectorReportForm";

export const metadata = { title: "التقارير" };

export default async function ReportsPage() {
  const s = await getSettings();
  const r = await safe(() => query<{ id: string; title: string; report_type: string; created_at: Date; generated_by: string; n: number }>("SELECT id, title, report_type, created_at, generated_by, jsonb_array_length(citations) AS n FROM reports WHERE NOT is_synthetic ORDER BY created_at DESC LIMIT 100"));
  return (
    <div className="space-y-4">
      <PageHeader
        title="التقارير"
        subtitle="ملخصات يومية وأسبوعية وقطاعية تُبنى من البيانات المخزّنة فقط، مع قائمة مصادر مرقّمة. تنزيل Markdown، أو طباعة/حفظ PDF من المتصفح."
        actions={
          <>
            <ApiButton url="/api/reports" body={{ type: "daily" }} label="ملخص يومي" variant="primary" describe="title" />
            <ApiButton url="/api/reports" body={{ type: "weekly" }} label="تقرير أسبوعي" describe="title" />
          </>
        }
      />
      <Card>
        <CardHeader title="تقرير قطاعي" />
        <div className="p-4"><SectorReportForm sectors={Object.entries(SECTOR_LABELS)} inputCls={inputCls} /></div>
      </Card>
      <Card>
        <CardHeader title="التقارير المحفوظة" />
        {!r.ok ? <div className="p-3"><ErrorState message={r.error} /></div> : r.data.length ? (
          <ul className="divide-y divide-line/60">
            {r.data.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-2 p-3">
                <Link href={`/reports/${x.id}`} className="text-sm hover:text-cyan">{x.title}</Link>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <Badge>{x.report_type}</Badge>
                  <span>{x.n} مصدراً</span>
                  <span>{fmtDate(x.created_at, s.timezone, true)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="لا تقارير بعد">أنشئ ملخصاً يومياً من الزر أعلاه.</EmptyState>}
      </Card>
    </div>
  );
}
