import { Suspense } from "react";
import { ApiForm } from "@/components/actions";
import { LbpRateCard } from "@/components/dashboard/Cards";
import { InstrumentTable } from "@/components/markets/InstrumentTable";
import { SeriesCard } from "@/components/markets/SeriesCard";
import { Card, CardHeader, EmptyState, ErrorState, Notice, PageHeader, SectionSkeleton } from "@/components/ui";
import { listInstruments } from "@/lib/repo/markets";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "العملات والذهب" };

export default async function FxGoldPage({ searchParams }: { searchParams: Promise<{ i?: string; days?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const rows = await safe(async () => (await listInstruments()).filter((r) => r.instrument_type === "fx" || r.instrument_type === "metal"));
  const def = rows.ok ? rows.data.find((r) => r.instrument === "USD/LBP" && r.rate_type === "official") ?? rows.data[0] : undefined;
  const selected = sp.i ?? (def ? `${def.instrument}|${def.source_key}|${def.rate_type}` : undefined);
  const days = [30, 90, 365, 1100].includes(Number(sp.days)) ? Number(sp.days) : 365;
  return (
    <div className="space-y-4">
      <PageHeader title="العملات والذهب" subtitle="السعر الرسمي للّيرة، السعر الموازي المرصود، الأسعار المرجعية للعملات الرئيسية، والذهب — كل نوع منفصل بمصدره." />
      <Suspense fallback={<Card><SectionSkeleton /></Card>}>
        <LbpRateCard />
      </Suspense>
      <Card>
        <CardHeader title="العملات والمعادن" />
        {!rows.ok ? <div className="p-3"><ErrorState message={rows.error} /></div> : rows.data.length ? <InstrumentTable rows={rows.data} watchlist={s.watchlist} basePath="/fx-gold" selected={selected} /> : <EmptyState title="لا بيانات" />}
      </Card>
      {selected ? (
        <Suspense fallback={<Card><SectionSkeleton /></Card>}>
          <SeriesCard selKey={selected} days={days} basePath="/fx-gold" />
        </Suspense>
      ) : null}
      <Card>
        <CardHeader title="إدخال سعر يدوي موثّق" subtitle="لأسعار تقرؤها من مصدر رسمي لا يمكن جلبه آلياً. يُخزَّن كـ«إدخال يدوي» مع المصدر والرابط إلزامياً." />
        <div className="p-4">
          <ApiForm
            url="/api/manual"
            columns={3}
            submitLabel="حفظ السعر"
            fields={[
              { name: "instrument", label: "الأداة", type: "text", required: true, placeholder: "USD/LBP" },
              { name: "claimed_rate_type", label: "نوع السعر كما ينشره المصدر", type: "select", options: [{ value: "official", label: "رسمي" }, { value: "parallel", label: "موازٍ" }, { value: "market", label: "سوق" }, { value: "reference", label: "مرجعي" }] },
              { name: "value", label: "القيمة", type: "number", step: "any", required: true },
              { name: "observed_at", label: "تاريخ ووقت السعر", type: "datetime-local", required: true },
              { name: "source_name", label: "اسم المصدر", type: "text", required: true, placeholder: "مثال: نشرة مصرف لبنان" },
              { name: "source_url", label: "رابط المصدر", type: "url", required: true },
            ]}
            transform="manualMarket"
          />
        </div>
      </Card>
      <Notice tone="amber">لا يُفترض أبداً أن السعر الرسمي يساوي سعر السوق. السعر الموازي هنا وسيط أسعار رصدها برنامج الأغذية العالمي شهرياً في أسواق محددة، وليس سعراً لحظياً.</Notice>
    </div>
  );
}
