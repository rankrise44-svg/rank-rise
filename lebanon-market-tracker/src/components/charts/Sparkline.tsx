"use client";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export function Sparkline({ values, color = "#34d399", height = 32, width = 96 }: { values: number[]; color?: string; height?: number; width?: number }) {
  if (values.length < 2) return <div style={{ width, height }} className="grid place-items-center text-[10px] text-faint">—</div>;
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div dir="ltr" style={{ width, height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
