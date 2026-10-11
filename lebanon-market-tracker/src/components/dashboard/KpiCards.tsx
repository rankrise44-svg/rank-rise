import Link from "next/link";
import { Coins, Database, DollarSign, Landmark, TrendingUp } from "lucide-react";
import { Sparkline } from "../charts/Sparkline";
import { Badge, Card, ErrorState, Freshness, RATE_TYPE_LABEL, Stat } from "../ui";
import { fmtNum, fmtPct, fmtPeriod } from "@/lib/format";
import { findIndicator, getSeries } from "@/lib/repo/indicators";
import { getMarketSeries, listInstruments } from "@/lib/repo/markets";
import { freshnessSummary } from "@/lib/repo/sources";
import { safe } from "@/lib/safe";

function Change({ cur, prev, invert = false }: { cur: number; prev: number | null; invert?: boolean }) {
  if (prev === null || !Number.isFinite(prev) || prev === 0) return null;
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const good = invert ? pct < 0 : pct > 0;
  return <span className={`ltr-num text-xs ${Math.abs(pct) < 0.005 ? "text-muted" : good ? "text-emerald" : "text-rose"}`}>{fmtPct(pct, 2)}</span>;
}

function KpiShell({ icon, title, children, footer }: { icon: React.ReactNode; title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <Card className="flex min-h-[148px] flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-medium text-ink-2">{title}</h3>
        <span className="grid size-9 place-items-center rounded-lg border border-line bg-panel-2 text-cyan">{icon}</span>
      </div>
      <div className="mt-1">{children}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">{footer}</div>
    </Card>
  );
}

export async function KpiCards() {
  const r = await safe(async () => {
    const [instruments, cpiYoy, growth, fresh] = await Promise.all([
      listInstruments(),
      findIndicator("CAS.CPI.YOY_PCT.LBN.TOTAL", "LBN", "cas"),
      findIndicator("NGDP_RPCH", "LBN", "imf-datamapper"),
      freshnessSummary(),
    ]);
    const lbpOfficial = instruments.find((i) => i.instrument === "USD/LBP" && i.rate_type === "official");
    const lbpParallel = instruments.find((i) => i.instrument === "USD/LBP" && i.rate_type === "parallel");
    const gold = instruments.find((i) => i.instrument === "XAU/USD");
    const goldSeries = gold ? await getMarketSeries("XAU/USD", gold.source_key, gold.rate_type, 120) : [];
    const growthSeries = growth ? (await getSeries(growth.id, { from: "2012-01-01", includeProjections: false })).map((o) => Number(o.value)) : [];
    return { lbpOfficial, lbpParallel, gold, goldSeries, cpiYoy, growth, growthSeries, fresh };
  });
  if (!r.ok) return <ErrorState message={r.error} />;
  const d = r.data;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiShell
        icon={<DollarSign className="size-4" />}
        title="سعر صرف الدولار (ليرة لكل دولار)"
        footer={
          d.lbpOfficial ? (
            <>
              <Badge tone={RATE_TYPE_LABEL.official.tone}>{RATE_TYPE_LABEL.official.label}</Badge>
              <span>مصرف لبنان · {d.lbpOfficial.latest_at.toISOString().slice(0, 10)}</span>
            </>
          ) : (
            <Link href="/sources" className="underline">لم يُجمع بعد — شغّل المصدر</Link>
          )
        }
      >
        {d.lbpOfficial ? (
          <div className="flex items-baseline gap-2">
            <Stat value={fmtNum(d.lbpOfficial.latest_value)} unit="LBP" className="text-2xl" />
            <Change cur={Number(d.lbpOfficial.latest_value)} prev={d.lbpOfficial.prev_value ? Number(d.lbpOfficial.prev_value) : null} />
          </div>
        ) : (
          <span className="text-sm text-muted">لا بيانات</span>
        )}
        {d.lbpParallel ? (
          <p className="mt-1 text-[11px] text-muted">
            <Badge tone="amber">سوق موازية</Badge> <span className="ltr-num">{fmtNum(d.lbpParallel.latest_value)}</span> (WFP، {d.lbpParallel.latest_at.toISOString().slice(0, 7)})
          </p>
        ) : null}
      </KpiShell>

      <KpiShell
        icon={<Coins className="size-4" />}
        title="سعر الذهب العالمي (أونصة)"
        footer={
          d.gold ? (
            <>
              <Badge tone={RATE_TYPE_LABEL[d.gold.rate_type]?.tone ?? "sky"}>{RATE_TYPE_LABEL[d.gold.rate_type]?.label ?? d.gold.rate_type}</Badge>
              <span>{d.gold.provider}</span>
              <Freshness at={d.gold.latest_at} expectedHours={12} />
            </>
          ) : (
            <span>لا يوجد مصدر مفعّل للذهب</span>
          )
        }
      >
        {d.gold ? (
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <Stat value={fmtNum(d.gold.latest_value, { digits: 0 })} unit="USD/oz" className="text-2xl" />
              <Change cur={Number(d.gold.latest_value)} prev={d.gold.prev_value ? Number(d.gold.prev_value) : null} />
            </div>
            <Sparkline values={d.goldSeries.map((x) => Number(x.value))} color="#fbbf24" />
          </div>
        ) : (
          <span className="text-sm text-muted">لا بيانات</span>
        )}
      </KpiShell>

      <KpiShell
        icon={<TrendingUp className="size-4" />}
        title="التضخم السنوي (مؤشر أسعار الاستهلاك)"
        footer={
          d.cpiYoy ? (
            <>
              <Badge tone="emerald">رسمي</Badge>
              <a href={d.cpiYoy.source_url ?? "#"} target="_blank" rel="noopener noreferrer" className="hover:text-cyan">إدارة الإحصاء المركزي</a>
              <span>· {fmtPeriod(d.cpiYoy.latest_label ?? "")}</span>
            </>
          ) : (
            <span>بانتظار أول استيراد من CAS</span>
          )
        }
      >
        {d.cpiYoy?.latest_value ? (
          <Stat value={fmtPct(d.cpiYoy.latest_value, 1, false)} className="text-2xl text-amber" />
        ) : (
          <span className="text-sm text-muted">لا بيانات</span>
        )}
        <p className="mt-1 text-[11px] text-muted">مقارنةً بالشهر نفسه من العام السابق</p>
      </KpiShell>

      <KpiShell
        icon={<Landmark className="size-4" />}
        title="نمو الناتج المحلي الحقيقي"
        footer={
          d.growth ? (
            <>
              <Badge tone="emerald">رسمي</Badge>
              <span>صندوق النقد الدولي · سنة {d.growth.latest_label}</span>
              <span className="text-amber">قد تكون تقديراً قابلاً للمراجعة</span>
            </>
          ) : (
            <span>لا بيانات</span>
          )
        }
      >
        {d.growth?.latest_value ? (
          <div className="flex items-end justify-between gap-2">
            <Stat value={fmtPct(d.growth.latest_value, 1)} className={`text-2xl ${Number(d.growth.latest_value) >= 0 ? "text-emerald" : "text-rose"}`} />
            <Sparkline values={d.growthSeries} color="#60a5fa" />
          </div>
        ) : (
          <span className="text-sm text-muted">لا بيانات</span>
        )}
      </KpiShell>

      <KpiShell
        icon={<Database className="size-4" />}
        title="تغطية البيانات وحداثتها"
        footer={<Link href="/sources" className="underline hover:text-cyan">تفاصيل المصادر</Link>}
      >
        <div className="flex items-baseline gap-2">
          <Stat value={`${d.fresh.ok}/${d.fresh.enabled}`} className="text-2xl" />
          <span className="text-xs text-muted">مصادر مفعّلة تعمل</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {d.fresh.failing ? <Badge tone="amber">{d.fresh.failing} بأخطاء</Badge> : null}
          {d.fresh.blocked ? <Badge tone="rose">{d.fresh.blocked} محجوبة</Badge> : null}
          {d.fresh.needsCredentials ? <Badge tone="neutral">{d.fresh.needsCredentials} تحتاج مفتاحاً</Badge> : null}
          {d.fresh.lastSuccess ? <Freshness at={d.fresh.lastSuccess} expectedHours={6} label="آخر مزامنة" /> : null}
        </div>
      </KpiShell>
    </div>
  );
}
