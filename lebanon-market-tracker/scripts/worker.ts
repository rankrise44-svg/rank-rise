/**
 * Long-running background worker for hosts without reliable cron:
 *   npm run worker            (loop every WORKER_INTERVAL_MINUTES, default 5)
 *   npm run worker -- --once  (single tick)
 * Also runs the Python forecasting engine (pending forecasts + outcome resolution) when available.
 */
import "./_env";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { Pool } from "pg";
import { schedulerTick } from "../src/lib/jobs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const minutes = Number(process.env.WORKER_INTERVAL_MINUTES ?? 5);

function runAnalytics(cmd: string) {
  return new Promise<void>((resolve) => {
    if (!existsSync("scripts/analytics.sh") || process.env.ANALYTICS_DISABLED === "1") return resolve();
    execFile("bash", ["scripts/analytics.sh", cmd], { timeout: 10 * 60_000 }, (err, stdout, stderr) => {
      if (err) console.error(JSON.stringify({ level: "warn", msg: `analytics ${cmd} failed`, error: (stderr || err.message).slice(-400) }));
      else if (stdout.trim()) console.log(stdout.trim().split("\n").slice(-3).join("\n"));
      resolve();
    });
  });
}

async function tick() {
  try {
    const out = await schedulerTick(pool, { budgetMs: 15 * 60_000 });
    console.log(JSON.stringify({ level: "info", msg: "scheduler tick", ...out }));
    await runAnalytics("forecast");
    await runAnalytics("resolve");
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "tick failed", error: (e as Error).message }));
  }
}

(async () => {
  await tick();
  if (process.argv.includes("--once")) return pool.end();
  setInterval(tick, minutes * 60_000);
})();
