import type { Queryable } from "../ingestion/store";
import { AREAS } from "./lexicon";
import CENTROIDS from "./centroids.json";

/**
 * Governorate centroids are computed from the geoBoundaries ADM1 polygons shipped in
 * public/geo/lebanon-adm1.geojson (public domain; see docs/DATA_SOURCES.md) and stored in centroids.json.
 */
export async function seedAreas(db: Queryable, centroids: Record<string, [number, number]> = CENTROIDS as unknown as Record<string, [number, number]>) {
  for (const a of AREAS) {
    await db.query(
      `INSERT INTO geographic_areas (key, name_ar, name_en, level, aliases, centroid_lat, centroid_lon)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (key) DO UPDATE SET name_ar=EXCLUDED.name_ar, name_en=EXCLUDED.name_en, aliases=EXCLUDED.aliases,
          centroid_lat=COALESCE(EXCLUDED.centroid_lat, geographic_areas.centroid_lat),
          centroid_lon=COALESCE(EXCLUDED.centroid_lon, geographic_areas.centroid_lon)`,
      [a.key, a.name_ar, a.name_en, a.level, a.aliases, centroids[a.key]?.[0] ?? null, centroids[a.key]?.[1] ?? null],
    );
  }
  await db.query(
    `UPDATE geographic_areas c SET parent_id = p.id FROM geographic_areas p WHERE p.key = 'lebanon' AND c.level = 'governorate' AND c.parent_id IS NULL`,
  );
}
