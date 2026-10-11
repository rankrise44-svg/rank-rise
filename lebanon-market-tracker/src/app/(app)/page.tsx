import { Suspense } from "react";
import { Bot } from "lucide-react";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { LatestNewsCard, LbpRateCard, MacroTrendsCard, MapCard, OpportunitiesCard, SectorPricesCard, SignalsCard } from "@/components/dashboard/Cards";
import { Card, CardHeader, SectionSkeleton } from "@/components/ui";
import { configStatus } from "@/lib/env";

export default function DashboardPage() {
  const cfg = configStatus();
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
      <div className="min-w-0 space-y-4">
        <section className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-l from-panel-3 via-panel-2 to-panel px-5 py-5">
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/2 opacity-40 [background:radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.18),transparent_60%)]" />
          <h1 className="relative text-xl font-semibold md:text-2xl">أهلاً بك في منصة تتبّع الأسواق اللبنانية</h1>
          <p className="relative mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-2">
            مؤشرات رسمية، أسعار صرف بأنواعها، أخبار مصنّفة، وإشارات تغيّر — كل رقم مع مصدره وتاريخه. ما يستنتجه النظام آلياً مُعلَّم بوضوح، والتوقعات تُعرض فقط حين تتوفر بيانات كافية لاختبارها.
          </p>
        </section>

        <Suspense fallback={<SectionSkeleton rows={3} />}>
          <KpiCards />
        </Suspense>

        <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
          <Suspense fallback={<Card><SectionSkeleton /></Card>}>
            <MacroTrendsCard />
          </Suspense>
          <Suspense fallback={<Card><SectionSkeleton /></Card>}>
            <MapCard />
          </Suspense>
        </div>

        <div className="grid gap-4 xl:grid-cols-3 [&>*]:min-w-0">
          <div className="min-w-0">
            <Suspense fallback={<Card><SectionSkeleton rows={6} /></Card>}>
              <LatestNewsCard />
            </Suspense>
          </div>
          <div className="min-w-0 space-y-4">
            <Suspense fallback={<Card><SectionSkeleton /></Card>}>
              <SectorPricesCard />
            </Suspense>
          </div>
          <div className="min-w-0 space-y-4">
            <Suspense fallback={<Card><SectionSkeleton /></Card>}>
              <OpportunitiesCard />
            </Suspense>
            <Suspense fallback={<Card><SectionSkeleton /></Card>}>
              <SignalsCard />
            </Suspense>
          </div>
        </div>

        <Suspense fallback={<Card><SectionSkeleton /></Card>}>
          <LbpRateCard />
        </Suspense>
      </div>

      <aside className="min-w-0">
        <Card className="flex flex-col 2xl:sticky 2xl:top-20 2xl:max-h-[calc(100dvh-6rem)]">
          <CardHeader icon={<Bot className="size-4 text-cyan" />} title="المساعد الذكي" subtitle={cfg.llmConfigured ? `النموذج: ${cfg.llmProvider}` : "وضع الاسترجاع فقط"} />
          <AssistantChat compact configured={cfg.llmConfigured} />
        </Card>
      </aside>
    </div>
  );
}
