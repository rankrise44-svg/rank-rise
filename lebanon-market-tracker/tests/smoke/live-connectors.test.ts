/**
 * OPTIONAL live smoke tests — hit real public APIs. Skipped unless LMT_LIVE_SMOKE=1 (npm run test:smoke).
 * They run fetch → validate → normalize in memory and never write to a database.
 */
import { describe, expect, it } from "vitest";
import { httpGet, httpGetJson } from "@/lib/ingestion/http";
import { createLogger } from "@/lib/ingestion/runner";
import { CONNECTORS, RSS_SOURCES, SYSTEM_SOURCES } from "@/lib/ingestion/registry";
import type { ConnectorContext, SourceRow } from "@/lib/ingestion/types";

const live = process.env.LMT_LIVE_SMOKE === "1";

function ctxFor(key: string): ConnectorContext {
  const def = [...SYSTEM_SOURCES, ...RSS_SOURCES].find((s) => s.key === key)!;
  const source = { id: "smoke", ...def, status: "never_run", last_attempt_at: null, last_success_at: null, last_error: null, last_error_at: null, is_system: true, schedule_minutes: def.schedule_minutes } as unknown as SourceRow;
  return { source, credential: null, log: createLogger({ smoke: key }, false), since: null, mode: "test", now: new Date(), http: { get: (u, o) => httpGet(u, o), getJson: (u, o) => httpGetJson(u, o) } };
}

describe.skipIf(!live)("live public connectors", () => {
  for (const key of ["imf-datamapper", "worldbank-indicators", "ecb-frankfurter", "bdl-official-rate", "gold-api", "cas", "rss-naharnet-lebanon"]) {
    it(`${key} returns valid normalized records`, async () => {
      const ctx = ctxFor(key);
      const c = CONNECTORS[ctx.source.connector];
      const raw = await c.fetch(ctx);
      const { items } = c.validate(raw.raw, ctx);
      const recs = c.normalize(items, ctx);
      expect(recs.length).toBeGreaterThan(0);
    }, 180_000);
  }
});
