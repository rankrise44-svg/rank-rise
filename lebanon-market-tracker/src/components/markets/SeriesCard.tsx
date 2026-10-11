import Link from "next/link";
import { TimeSeriesChart } from "../charts/TimeSeriesChart";
import { Card, CardHeader, EmptyState, RATE_TYPE_LABEL } from "../ui";
import { fmtNum, fmtPct } from "@/lib/format";
import { getMarketSeries } from "@/lib/repo/markets";

const RANGES = [
  { d: 30, l: "شهر" },
  { d: 90, l: "3 أشهر" },
  { d: 365, l: "سنة" },
  { d: 1100, l: "3 سنوات" },
];

export async function SeriesCard({ selKey, days, basePath }: { selKey: string; days: number; basePath: string }) {
  const [instrument, sourceKey, rateType] = selKey.split("|");
  const series = await getMarketSeries(instrument, sourceKey, rateType, days);
  const vals = series.map((s) => Number(s.value));
  const ch = vals.length > 1 ? ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100 : null;
  return (
    <Card>
      <CardHeader
        title={<span className="ltr-num">{instrument}</span>}
        subtitle={`${RATE_TYPE_LABEL[rateType]?.label ?? rateType} · ${sourceKey} · ${series.length} رصداً${ch !== null ? ` · التغير خلال الفترة ${fmtPct(ch, 2)}` : ""}`}
        actions={
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Link key={r.d} href={`${basePath}?i=${encodeURIComponent(selKey)}&days=${r.d}`} className={`rounded-md border px-2 py-0.5 text-xs ${days === r.d ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-muted hover:text-ink"}`}>
                {r.l}
              </Link>
            ))}
          </div>
        }
      />
      <div className="p-3">
        {series.length > 1 ? (
          <>
            <TimeSeriesChart data={series.map((s) => ({ x: s.observed_at.toISOString().slice(0, 10), v: Number(s.value) }))} series={[{ key: "v", label: instrument, color: "#22d3ee" }]} />
            <p className="mt-2 text-[11px] text-muted">أدنى {fmtNum(Math.min(...vals))} · أعلى {fmtNum(Math.max(...vals))} · <a className="underline" href={`/api/export?dataset=market&instrument=${encodeURIComponent(instrument)}`}>تصدير CSV</a></p>
          </>
        ) : (
          <EmptyState title="لا يكفي عدد الأرصاد لرسم سلسلة في هذه الفترة">بعض المصادر (مثل Gold API) تقدّم آخر سعر فقط، ويتراكم التاريخ مع كل مزامنة.</EmptyState>
        )}
      </div>
    </Card>
  );
}
