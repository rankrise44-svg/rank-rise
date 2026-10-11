import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth/guard";
import { getEnv } from "@/lib/env";
import { setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const validTz = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const PUT = adminRoute("settings.update", async (req) => {
  const b = z
    .object({
      timezone: z.string().max(60).refine(validTz, "Unknown IANA timezone").optional(),
      min_relevance: z.number().min(0).max(1).optional(),
      watchlist: z.array(z.string().regex(/^[A-Z]{3}\/[A-Z]{3}$|^[A-Z]{2,10}$/)).max(30).optional(),
      demo_mode: z.boolean().optional(),
    })
    .parse(await req.json());
  if (b.demo_mode && getEnv().NODE_ENV === "production") throw new HttpError(400, "Demo mode is not available in production", "forbidden");
  if (b.timezone) await setSetting("timezone", b.timezone);
  if (b.min_relevance !== undefined) await setSetting("min_relevance", b.min_relevance);
  if (b.watchlist) await setSetting("watchlist", b.watchlist);
  if (b.demo_mode !== undefined) await setSetting("demo_mode", b.demo_mode);
  return { body: { ok: true }, audit: { details: b } };
});
