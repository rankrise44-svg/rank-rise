"use client";
import { useState } from "react";
import { ApiButton } from "@/components/actions";

export function SectorReportForm({ sectors, inputCls }: { sectors: [string, string][]; inputCls: string }) {
  const [sector, setSector] = useState(sectors[0]?.[0] ?? "");
  return (
    <div className="flex flex-wrap items-start gap-2">
      <select value={sector} onChange={(e) => setSector(e.target.value)} className={`${inputCls} max-w-xs`} aria-label="القطاع">
        {sectors.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <ApiButton url="/api/reports" body={{ type: "sector", sector }} label="إنشاء تقرير القطاع" describe={(j) => String(j.title)} />
    </div>
  );
}
