"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type SeriesDef = { key: string; label: string; color: string; dashed?: boolean };
export type Point = { x: string; [series: string]: string | number | null };

const fmt = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(a >= 1e5 ? 0 : 1)}k`;
  return n.toLocaleString("en-US", { maximumFractionDigits: a >= 100 ? 0 : 2 });
};

/**
 * Multi-series line chart. The x axis runs left→right (chronological) even in RTL pages, matching
 * financial-chart convention; the chart container is set to dir=ltr explicitly.
 */
export function TimeSeriesChart({
  data,
  series,
  height = 260,
  unit,
  projectionFrom,
}: {
  data: Point[];
  series: SeriesDef[];
  height?: number;
  unit?: string;
  projectionFrom?: string | null;
}) {
  if (!data.length) return null;
  return (
    <div dir="ltr" style={{ width: "100%", height }} role="img" aria-label={`رسم بياني: ${series.map((s) => s.label).join("، ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#1b2a44" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="x" tick={{ fill: "#7d8aa3", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#27395a" }} minTickGap={24} />
          <YAxis tick={{ fill: "#7d8aa3", fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={fmt} domain={["auto", "auto"]} />
          {projectionFrom ? <ReferenceArea x1={projectionFrom} fill="#a78bfa" fillOpacity={0.07} label={{ value: "projection", fill: "#a78bfa", fontSize: 10, position: "insideTop" }} /> : null}
          <Tooltip
            contentStyle={{ background: "#0f192c", border: "1px solid #27395a", borderRadius: 8, color: "#e7ecf6", fontSize: 12, direction: "rtl" }}
            labelStyle={{ color: "#b4c0d6" }}
            formatter={(v: unknown, name: unknown) => [`${fmt(v)}${unit ? ` ${unit}` : ""}`, String(name)]}
          />
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12, color: "#b4c0d6" }} /> : null}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={1.8}
              strokeDasharray={s.dashed ? "4 3" : undefined}
              dot={data.length < 40 ? { r: 2 } : false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
