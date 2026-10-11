import Link from "next/link";
import { Suspense } from "react";
import { InstrumentTable } from "@/components/markets/InstrumentTable";
import { SeriesCard } from "@/components/markets/SeriesCard";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Notice, PageHeader, SectionSkeleton } from "@/components/ui";
import { query } from "@/lib/db";
import { listInstruments } from "@/lib/repo/markets";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "الأسواق المالية" };

export default async function MarketsPage({ searchParams }: { searchParams: Promise<{ i?: string; days?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const [rows, providers] = await Promise.all([
    safe(listInstruments),
    safe(() => query<{ key: string; name: string; status: string; enabled: boolean; coverage_notes: string | null }>("SELECT key, name, status, enabled, coverage_notes FROM sources WHERE key IN ('twelvedata','alphavantage') ORDER BY key")),
  ]);
  const def = rows.ok ? rows.data.find((r) => r.instrument === "XAU/USD") ?? rows.data[0] : undefined;
  const selected = sp.i ?? (def ? `${def.instrument}|${def.source_key}|${def.rate_type}` : undefined);
  const days = [30, 90, 365, 1100].includes(Number(sp.days)) ? Number(sp.days) : 365;
  return (
    <div className="space-y-4">
      <PageHeader title="الأسواق المالية" subtitle="كل أداة مع مزوّدها ونوع سعرها وتوقيت رصدها. لا نعرض بيانات أسهم لبنانية أو أسعاراً لحظية لا يدعمها مصدر مفعّل." />
      <Card>
        <CardHeader title="الأدوات المتاحة" subtitle={`★ = ضمن قائمة المتابعة (${s.watchlist.join("، ")}) — تُعدّل من الإعدادات`} />
        {!rows.ok ? <div className="p-3"><ErrorState message={rows.error} /></div> : rows.data.length ? <InstrumentTable rows={rows.data} watchlist={s.watchlist} basePath="/markets" selected={selected} /> : <EmptyState title="لا توجد بيانات أسواق بعد" />}
      </Card>
      {selected ? (
        <Suspense fallback={<Card><SectionSkeleton /></Card>}>
          <SeriesCard selKey={selected} days={days} basePath="/markets" />
        </Suspense>
      ) : null}
      <Card>
        <CardHeader title="مزوّدون اختياريون" subtitle="للأسهم والمؤشرات العالمية والسلع؛ يحتاجون مفتاح API" />
        <div className="grid gap-2 p-3 md:grid-cols-2">
          {providers.ok
            ? providers.data.map((p) => (
                <div key={p.key} className="rounded-lg border border-line bg-panel-2/60 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.name}</span>
                    <Badge tone={p.status === "ok" ? "emerald" : p.status === "needs_credentials" ? "amber" : "neutral"}>{p.status === "needs_credentials" ? "يحتاج مفتاحاً" : p.enabled ? p.status : "معطّل"}</Badge>
                  </div>
                  <p className="mt-1 text-muted">{p.coverage_notes}</p>
                  <Link href="/sources" className="mt-1 inline-block text-sky hover:underline">إعداد المفتاح</Link>
                </div>
              ))
            : null}
        </div>
      </Card>
      <Notice tone="amber">
        تنبيهات الأسعار تُضبط من الإعدادات (قاعدة «إشارات تغيّر» لأدوات السوق). أسعار Gold API تسعيرات طرف ثالث وليست تثبيتاً رسمياً (LBMA). أسعار البنك المركزي الأوروبي مرجعية وليست أسعار تداول.
      </Notice>
    </div>
  );
}
