"use client";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import L from "leaflet";
import { AREA_LABELS } from "@/lib/nav";

export type ChoroplethLayer = {
  id: string;
  kind: "choropleth";
  label: string;
  values: Record<string, { value: number; display: string; note?: string }>;
  legend: string;
  source: string;
  sourceUrl?: string;
  asOf: string;
  inferred?: boolean;
};
export type MarkerLayer = {
  id: string;
  kind: "markers";
  label: string;
  markers: { lat: number; lon: number; title: string; lines: string[]; value?: number }[];
  legend: string;
  source: string;
  sourceUrl?: string;
  asOf: string;
  inferred?: boolean;
};
export type MapLayer = ChoroplethLayer | MarkerLayer;

const LEBANON_BOUNDS: L.LatLngBoundsExpression = [
  [33.05, 35.1],
  [34.69, 36.62],
];

function color(t: number) {
  // cyan → amber → rose ramp for 0..1
  const stops = [
    [34, 211, 238],
    [251, 191, 36],
    [248, 113, 113],
  ];
  const x = Math.max(0, Math.min(1, t)) * 2;
  const i = Math.min(1, Math.floor(x));
  const f = x - i;
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
  return `rgb(${c.join(",")})`;
}

function FitTo({ areaKey, geo }: { areaKey: string; geo: FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geo) return;
    if (!areaKey) {
      map.fitBounds(LEBANON_BOUNDS);
      return;
    }
    const f = geo.features.find((x) => x.properties?.area_key === areaKey);
    if (f) map.fitBounds(L.geoJSON(f as Feature<Geometry>).getBounds(), { padding: [20, 20] });
  }, [areaKey, geo, map]);
  return null;
}

export default function LebanonMapInner({ layers, height = 420 }: { layers: MapLayer[]; height?: number }) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [active, setActive] = useState<string[]>(layers.slice(0, 2).map((l) => l.id));
  const [area, setArea] = useState("");

  useEffect(() => {
    fetch("/geo/lebanon-adm1.geojson")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setGeo)
      .catch(() => setGeoError(true));
  }, []);

  const choro = layers.find((l): l is ChoroplethLayer => l.kind === "choropleth" && active.includes(l.id));
  const range = useMemo(() => {
    const vals = choro ? Object.values(choro.values).map((v) => v.value) : [];
    return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null;
  }, [choro]);

  const style = (f?: Feature) => {
    const key = f?.properties?.area_key as string | undefined;
    const v = key && choro ? choro.values[key] : undefined;
    const t = v && range ? (range.max === range.min ? 0.5 : (v.value - range.min) / (range.max - range.min)) : null;
    return {
      color: key === area ? "#e7ecf6" : "#3b5079",
      weight: key === area ? 2 : 1,
      fillColor: t === null ? "#0f192c" : color(t),
      fillOpacity: t === null ? 0.25 : 0.42,
    };
  };

  const toggle = (id: string, kind: MapLayer["kind"]) =>
    setActive((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      // Only one choropleth at a time; markers can stack.
      const others = kind === "choropleth" ? cur.filter((x) => layers.find((l) => l.id === x)?.kind !== "choropleth") : cur;
      return [...others, id];
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1 text-muted">
          المحافظة
          <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded-md border border-line-strong bg-panel-2 px-2 py-1 text-ink">
            <option value="">كل لبنان</option>
            {Object.entries(AREA_LABELS)
              .filter(([k]) => k !== "lebanon")
              .map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
          </select>
        </label>
        {layers.map((l) => (
          <label key={l.id} className="flex cursor-pointer items-center gap-1 rounded-md border border-line bg-panel-2 px-2 py-1 text-ink-2">
            <input type="checkbox" checked={active.includes(l.id)} onChange={() => toggle(l.id, l.kind)} className="accent-cyan" />
            {l.label}
            {l.inferred ? <span className="text-violet">(مستنتج)</span> : null}
          </label>
        ))}
      </div>
      <div className="relative overflow-hidden rounded-lg border border-line" style={{ height }}>
        <MapContainer bounds={LEBANON_BOUNDS} minZoom={7} maxZoom={14} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }} attributionControl>
          <TileLayer
            className="dark-tiles"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Boundaries: geoBoundaries (public domain)'
          />
          {geo ? (
            <GeoJSON
              key={`${choro?.id ?? "none"}-${area}`}
              data={geo}
              style={style}
              onEachFeature={(f, layer) => {
                const key = f.properties?.area_key as string;
                const v = choro?.values[key];
                layer.bindTooltip(
                  `<div dir="rtl" style="font-size:12px"><b>${AREA_LABELS[key] ?? key}</b>${v ? `<br/>${choro!.legend}: ${v.display}${v.note ? `<br/><span style="color:#a78bfa">${v.note}</span>` : ""}` : choro ? "<br/>لا بيانات" : ""}</div>`,
                  { sticky: true },
                );
              }}
            />
          ) : null}
          {layers
            .filter((l): l is MarkerLayer => l.kind === "markers" && active.includes(l.id))
            .flatMap((l) =>
              l.markers.map((m, i) => (
                <CircleMarker key={`${l.id}-${i}`} center={[m.lat, m.lon]} radius={6} pathOptions={{ color: "#e7ecf6", weight: 1, fillColor: "#22d3ee", fillOpacity: 0.85 }}>
                  <Popup>
                    <div dir="rtl" className="text-xs">
                      <div className="font-semibold">{m.title}</div>
                      {m.lines.map((x, k) => (
                        <div key={k}>{x}</div>
                      ))}
                      <div className="mt-1 text-[10px] opacity-70">المصدر: {l.source}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              )),
            )}
          <FitTo areaKey={area} geo={geo} />
        </MapContainer>
        {geoError ? <div className="absolute inset-x-0 top-0 bg-rose/20 p-2 text-center text-xs text-rose">تعذّر تحميل حدود المحافظات</div> : null}
      </div>
      <div className="grid gap-1 text-[11px] text-muted">
        {layers
          .filter((l) => active.includes(l.id))
          .map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-x-2">
              <span className="text-ink-2">{l.label}:</span>
              <span>{l.legend}</span>
              {l.kind === "choropleth" && range ? (
                <span className="inline-flex items-center gap-1" dir="ltr">
                  <span className="ltr-num">{range.min.toFixed(2)}</span>
                  <span className="inline-block h-2 w-20 rounded" style={{ background: `linear-gradient(90deg, ${color(0)}, ${color(0.5)}, ${color(1)})` }} />
                  <span className="ltr-num">{range.max.toFixed(2)}</span>
                </span>
              ) : null}
              <span>· المصدر: {l.sourceUrl ? <a className="underline hover:text-cyan" href={l.sourceUrl} target="_blank" rel="noopener noreferrer">{l.source}</a> : l.source}</span>
              <span>· {l.asOf}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
