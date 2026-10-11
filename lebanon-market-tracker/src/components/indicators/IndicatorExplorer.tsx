"use client";
import { useEffect, useMemo, useState } from "react";
import { TimeSeriesChart, type Point } from "../charts/TimeSeriesChart";
import { Badge, ErrorState, Skeleton, inputCls } from "../ui";

export type IndicatorOption = { id: string; label: string; group: string };
type Series = { indicator: { name: string; unit: string | null; source: string; provenance: string; url: string | null; code: string; country: string }; observations: { period: string; value: number | null; projection: boolean; quality: string }[] };

const RANGES = [
  { v: "", l: "كل التاريخ" },
  { v: "2015-01-01", l: "منذ 2015" },
  { v: "2019-01-01", l: "منذ 2019 (الأزمة)" },
  { v: "2023-01-01", l: "منذ 2023" },
];

/** Pick up to two indicators and a date range; data is fetched from the server (with source metadata). */
export function IndicatorExplorer({ options, initial = [] }: { options: IndicatorOption[]; initial?: string[] }) {
  const [a, setA] = useState(initial[0] ?? options[0]?.id ?? "");
  const [b, setB] = useState(initial[1] ?? "");
  const [from, setFrom] = useState("2005-01-01");
  const [data, setData] = useState<Record<string, Series>>({});
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ids = [a, b].filter(Boolean);
    if (!ids.length) return;
    setLoading(true);
    setErr(null);
    Promise.all(ids.map((id) => fetch(`/api/indicators/${id}${from ? `?from=${from}` : ""}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))))
      .then((rs) => setData(Object.fromEntries(ids.map((id, i) => [id, rs[i] as Series]))))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [a, b, from]);

  const { points, projFrom } = useMemo(() => {
    const map = new Map<string, Point>();
    let projFrom: string | null = null;
    for (const [k, id] of [["a", a], ["b", b]] as const) {
      const s = data[id];
      if (!id || !s) continue;
      for (const o of s.observations) {
        map.set(o.period, { ...(map.get(o.period) ?? { x: o.period }), [k]: o.value });
        if (o.projection && (!projFrom || o.period < projFrom)) projFrom = o.period;
      }
    }
    return { points: [...map.values()].sort((x, y) => x.x.localeCompare(y.x)), projFrom };
  }, [data, a, b]);

  const groups = [...new Set(options.map((o) => o.group))];
  const select = (value: string, onChange: (v: string) => void, allowEmpty: boolean, label: string) => (
    <label className="block min-w-0 flex-1 text-xs text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} mt-1`}>
        {allowEmpty ? <option value="">— بلا مقارنة —</option> : null}
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {options.filter((o) => o.group === g).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row">
        {select(a, setA, false, "المؤشر")}
        {select(b, setB, true, "مقارنة مع")}
        <label className="block text-xs text-muted md:w-44">
          الفترة
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} mt-1`}>
            <option value="2005-01-01">منذ 2005</option>
            {RANGES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
        </label>
      </div>
      {err ? <ErrorState message={err} /> : loading && !points.length ? <Skeleton className="h-[280px] w-full" /> : points.length ? (
        <TimeSeriesChart
          data={points}
          height={300}
          projectionFrom={projFrom}
          series={[
            { key: "a", label: data[a]?.indicator.name ?? "", color: "#22d3ee" },
            ...(b && data[b] ? [{ key: "b", label: data[b].indicator.name, color: "#fbbf24" }] : []),
          ]}
        />
      ) : <p className="p-6 text-center text-sm text-muted">لا توجد أرصاد في هذه الفترة.</p>}
      <div className="space-y-1 text-[11px] text-muted">
        {[a, b].filter(Boolean).map((id) => data[id] ? (
          <div key={id} className="flex flex-wrap items-center gap-1.5">
            <Badge tone={data[id].indicator.provenance === "official" ? "emerald" : "sky"}>{data[id].indicator.provenance === "official" ? "رسمي" : data[id].indicator.provenance}</Badge>
            <span className="text-ink-2">{data[id].indicator.name}</span>
            <span>· الوحدة: {data[id].indicator.unit ?? "—"} · المصدر: {data[id].indicator.url ? <a href={data[id].indicator.url!} target="_blank" rel="noopener noreferrer" className="underline">{data[id].indicator.source}</a> : data[id].indicator.source}</span>
            <span className="ltr-num">({data[id].indicator.code} · {data[id].indicator.country})</span>
          </div>
        ) : null)}
        {projFrom ? <div className="text-violet">المنطقة المظللة: قيم إسقاطية (توقعات المزوّد) وليست أرصاداً فعلية.</div> : null}
      </div>
    </div>
  );
}
