import Link from "next/link";
import { Star } from "lucide-react";
import { Badge, RATE_TYPE_LABEL, relativeAr, SyntheticBadge } from "../ui";
import { fmtNum, fmtPct } from "@/lib/format";
import type { InstrumentRow } from "@/lib/repo/markets";

export function InstrumentTable({ rows, watchlist, basePath, selected }: { rows: InstrumentRow[]; watchlist: string[]; basePath: string; selected?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th className="p-2 text-start font-medium">الأداة</th>
            <th className="p-2 text-start font-medium">نوع السعر</th>
            <th className="p-2 text-start font-medium">المزوّد</th>
            <th className="p-2 text-end font-medium">آخر قيمة</th>
            <th className="p-2 text-end font-medium">التغير</th>
            <th className="p-2 text-start font-medium">وقت الرصد</th>
            <th className="p-2 text-start font-medium">التواتر / التأخير</th>
            <th className="p-2 text-end font-medium">عدد الأرصاد</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const key = `${r.instrument}|${r.source_key}|${r.rate_type}`;
            const ch = r.prev_value ? ((Number(r.latest_value) - Number(r.prev_value)) / Number(r.prev_value)) * 100 : null;
            const rt = RATE_TYPE_LABEL[r.rate_type] ?? { label: r.rate_type, tone: "neutral" as const };
            return (
              <tr key={key} className={`border-b border-line/50 hover:bg-panel-2/50 ${selected === key ? "bg-panel-3/60" : ""}`}>
                <td className="p-2">
                  <Link href={`${basePath}?i=${encodeURIComponent(key)}`} className="ltr-num font-medium text-ink hover:text-cyan">
                    {watchlist.includes(r.instrument) ? <Star className="me-1 inline size-3 fill-amber text-amber" /> : null}
                    {r.instrument}
                  </Link>
                  {r.is_synthetic ? <SyntheticBadge /> : null}
                </td>
                <td className="p-2"><Badge tone={rt.tone}>{rt.label}</Badge></td>
                <td className="p-2 text-xs text-ink-2">{r.source_url ? <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-cyan">{r.provider}</a> : r.provider}</td>
                <td className="ltr-num p-2 text-end font-semibold">{fmtNum(r.latest_value, { digits: Number(r.latest_value) < 10 ? 4 : 2 })}</td>
                <td className={`ltr-num p-2 text-end text-xs ${ch === null ? "text-muted" : ch > 0 ? "text-emerald" : ch < 0 ? "text-rose" : "text-muted"}`}>{ch === null ? "—" : fmtPct(ch, 2)}</td>
                <td className="p-2 text-xs text-muted" title={r.latest_at.toISOString()}>{r.latest_at.toISOString().slice(0, 16).replace("T", " ")} UTC · {relativeAr(r.latest_at)}</td>
                <td className="p-2 text-xs text-muted">{r.granularity === "daily" ? "يومي" : r.granularity === "monthly" ? "شهري" : r.granularity === "intraday" ? "لقطة لحظية" : r.granularity} · {r.delay_minutes === null ? "التأخير غير محدد" : `${r.delay_minutes} د`}</td>
                <td className="ltr-num p-2 text-end text-xs text-muted">{r.n}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
