import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth/guard";
import { requestForecast } from "@/lib/forecasting/requests";

export const dynamic = "force-dynamic";
export const POST = adminRoute("forecasts.request", async (req) => {
  const b = z
    .object({
      indicator_code: z.string().min(2).max(60),
      country: z.string().regex(/^[A-Z]{3}$/).default("LBN"),
      source_key: z.string().max(80).optional(),
      event: z.enum(["above_threshold", "below_threshold", "increase", "decrease"]),
      threshold: z.number().nullable().default(null),
      horizon_periods: z.number().int().min(1).max(5).default(1),
    })
    .parse(await req.json());
  const r = await requestForecast({ indicatorCode: b.indicator_code, country: b.country, sourceKey: b.source_key, event: b.event, threshold: b.threshold, horizonPeriods: b.horizon_periods, via: "ui" });
  if ("error" in r) throw new HttpError(400, r.error, r.error);
  return { body: r, status: 201, audit: { target: { type: "forecast", id: r.id } } };
});
