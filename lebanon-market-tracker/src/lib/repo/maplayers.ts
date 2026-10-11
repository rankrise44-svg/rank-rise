import "server-only";
import type { MapLayer } from "@/components/map/LebanonMapInner";
import { fmtNum, fmtPeriod } from "../format";
import { cpiByRegion } from "./indicators";
import { newsCountsByArea } from "./news";
import { latestPricesByMarket, listCommodities } from "./prices";

/**
 * CAS publishes CPI for six historical regions. Governorates created later are shaded with the CAS
 * region that contains them; the tooltip says so explicitly.
 */
const CAS_REGION_COVERS: Record<string, string[]> = {
  beirut: ["beirut"],
  mount_lebanon: ["mount_lebanon", "keserwan_jbeil"],
  north: ["north", "akkar"],
  beqaa: ["beqaa", "baalbek_hermel"],
  south: ["south"],
  nabatieh: ["nabatieh"],
};

export async function buildMapLayers(opts: { commodity?: string } = {}): Promise<{ layers: MapLayer[]; commodity: string | null; commodities: string[] }> {
  const layers: MapLayer[] = [];
  const [cpi, commodities, news] = await Promise.all([cpiByRegion(), listCommodities(), newsCountsByArea(30)]);

  if (cpi.length) {
    const values: Record<string, { value: number; display: string; note?: string }> = {};
    let period = "";
    for (const r of cpi) {
      if (!r.area_key || r.area_key === "lebanon") continue;
      period = r.period_label;
      for (const gov of CAS_REGION_COVERS[r.area_key] ?? []) {
        const notes = [];
        if (gov !== r.area_key) notes.push(`قيمة منطقة CAS «${r.region}» التي تضم هذه المحافظة`);
        if (r.quality_status === "provisional") notes.push("مبني بمعظمه على أسعار مُقدّرة (imputed) وفق CAS");
        values[gov] = { value: Number(r.value), display: `${Number(r.value) > 0 ? "+" : ""}${Number(r.value).toFixed(2)}%`, note: notes.join(" · ") || undefined };
      }
    }
    layers.push({
      id: "cpi-mom",
      kind: "choropleth",
      label: "التغير الشهري لمؤشر الأسعار",
      values,
      legend: `التغير الشهري في مؤشر أسعار الاستهلاك (${fmtPeriod(period)})`,
      source: "إدارة الإحصاء المركزي (CAS)",
      sourceUrl: "https://www.cas.gov.lb/economic-statistics/cpi/",
      asOf: `الفترة: ${fmtPeriod(period)}`,
    });
  }

  const commodity = opts.commodity && commodities.some((c) => c.commodity === opts.commodity) ? opts.commodity : commodities[0]?.commodity ?? null;
  if (commodity) {
    const rows = await latestPricesByMarket(commodity);
    const markers = rows
      .filter((r) => r.latitude !== null && r.longitude !== null)
      .map((r) => ({
        lat: r.latitude!,
        lon: r.longitude!,
        title: `${r.market}${r.admin1 ? ` — ${r.admin1}` : ""}`,
        value: Number(r.price),
        lines: [
          `${commodity} (${r.unit}): ${fmtNum(r.price)} ل.ل.${r.usd_price ? ` ≈ ${fmtNum(r.usd_price, { digits: 2 })} $` : ""}`,
          `تاريخ الرصد: ${r.observed_date}${r.price_flag && r.price_flag !== "actual" ? ` (${r.price_flag})` : ""}`,
        ],
      }));
    const last = rows.reduce((m, r) => (r.observed_date > m ? r.observed_date : m), "");
    layers.push({
      id: "wfp-markets",
      kind: "markers",
      label: `أسواق WFP: ${commodity}`,
      markers,
      legend: `آخر سعر مرصود لكل سوق (إحداثيات من WFP؛ ${markers.length} سوقاً)`,
      source: "WFP / HDX (CC BY-IGO)",
      sourceUrl: "https://data.humdata.org/dataset/wfp-food-prices-for-lebanon",
      asOf: `آخر رصد: ${last}`,
    });
  }

  if (news.length) {
    const values: Record<string, { value: number; display: string }> = {};
    for (const r of news) values[r.area] = { value: Number(r.n), display: `${r.n} خبراً` };
    layers.push({
      id: "news-mentions",
      kind: "choropleth",
      label: "ذِكر المحافظات في الأخبار",
      values,
      legend: "عدد الأخبار التي ذكرت المحافظة (آخر 30 يوماً) — حجم تغطية وليس حجم أثر",
      source: "مصنّف آلي على الأخبار المجمّعة",
      asOf: "آخر 30 يوماً",
      inferred: true,
    });
  }
  return { layers, commodity, commodities: commodities.map((c) => c.commodity) };
}
