import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { adminRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Runs the Python forecasting engine locally (only where the analytics environment exists, e.g. a dev
 * machine or a VM). On serverless hosts the worker/cron runs it instead.
 */
export const POST = adminRoute("forecasts.process", async () => {
  if (process.env.VERCEL || !existsSync("scripts/analytics.sh")) throw new HttpError(501, "The forecasting engine runs in the background worker on this deployment", "unavailable");
  const run = (cmd: string) =>
    new Promise<string>((resolve, reject) =>
      execFile("bash", ["scripts/analytics.sh", cmd], { timeout: 280_000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) =>
        err ? reject(new HttpError(500, `Forecast engine failed: ${(stderr || err.message).slice(-300)}`, "engine_failed")) : resolve(stdout),
      ),
    );
  const out = await run("forecast");
  await run("resolve").catch(() => "");
  return { body: { ok: true, log: out.split("\n").slice(-8) } };
}, { capacity: 3, perMinute: 3 });
