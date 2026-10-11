import "server-only";
import { cache } from "react";
import { getEnv } from "./env";
import { query } from "./db";

export type AppSettings = { timezone: string; demoMode: boolean; minRelevance: number; watchlist: string[] };

const DEFAULTS = (): AppSettings => ({ timezone: getEnv().DEFAULT_TIMEZONE, demoMode: false, minRelevance: 0.35, watchlist: ["XAU/USD", "USD/LBP", "USD/EUR"] });

/** Settings are per request-cached. Demo (synthetic) data can never be enabled in production. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const s = DEFAULTS();
  try {
    const rows = await query<{ key: string; value: unknown }>("SELECT key, value FROM user_settings WHERE user_key = 'owner'");
    for (const r of rows) {
      if (r.key === "timezone" && typeof r.value === "string") s.timezone = r.value;
      if (r.key === "demo_mode" && typeof r.value === "boolean") s.demoMode = r.value;
      if (r.key === "min_relevance" && typeof r.value === "number") s.minRelevance = r.value;
      if (r.key === "watchlist" && Array.isArray(r.value)) s.watchlist = r.value.filter((x): x is string => typeof x === "string");
    }
  } catch {
    /* DB unavailable: defaults */
  }
  const env = getEnv();
  s.demoMode = env.NODE_ENV !== "production" && (s.demoMode || env.DEMO_MODE);
  return s;
});

export async function setSetting(key: string, value: unknown) {
  await query(
    `INSERT INTO user_settings (user_key, key, value) VALUES ('owner', $1, $2)
     ON CONFLICT (user_key, key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value)],
  );
}
