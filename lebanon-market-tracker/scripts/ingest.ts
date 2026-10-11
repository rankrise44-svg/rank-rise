/**
 * Connector CLI.
 *   npm run ingest -- --sync            register built-in sources + reference data
 *   npm run ingest -- --list            list sources and their status
 *   npm run ingest -- <source-key>      run one source (stores data)
 *   npm run ingest -- --due             run every enabled source whose schedule is due
 *   npm run connector:test -- <key>     dry run: fetch + validate + normalize, store nothing
 */
import "./_env";
import { Pool } from "pg";
import { realDeps } from "../src/lib/ingestion/deps";
import { syncSystemSources } from "../src/lib/ingestion/registry";
import { runConnector } from "../src/lib/ingestion/runner";
import type { SourceRow } from "../src/lib/ingestion/types";
import { seedAreas } from "../src/lib/intel/areas";
import { seedReferenceData } from "../src/lib/intel/pipeline";
import { evaluateAlerts, seedDefaultAlerts } from "../src/lib/alerts/evaluate";

async function main() {
  const args = process.argv.slice(2);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (args.includes("--sync")) {
      await syncSystemSources(pool);
      await seedReferenceData(pool);
      await seedAreas(pool);
      await seedDefaultAlerts(pool);
      console.log(JSON.stringify({ level: "info", msg: "system sources and reference data synced" }));
      return;
    }
    if (args.includes("--list")) {
      const r = await pool.query("SELECT key, connector, enabled, status, last_success_at, last_error FROM sources ORDER BY key");
      console.table(r.rows);
      return;
    }
    const test = args.includes("--test");
    let sources: SourceRow[];
    if (args.includes("--due")) {
      const r = await pool.query<SourceRow>(
        `SELECT * FROM sources WHERE enabled AND connector NOT IN ('manual','unavailable') AND schedule_minutes IS NOT NULL
           AND (last_attempt_at IS NULL OR last_attempt_at < now() - make_interval(mins => schedule_minutes))
         ORDER BY last_attempt_at NULLS FIRST`,
      );
      sources = r.rows;
    } else {
      const keys = args.filter((a) => !a.startsWith("--"));
      if (!keys.length) throw new Error("Specify a source key, --due, --sync or --list");
      const r = await pool.query<SourceRow>("SELECT * FROM sources WHERE key = ANY($1)", [keys]);
      const missing = keys.filter((k) => !r.rows.some((s) => s.key === k));
      if (missing.length) throw new Error(`Unknown source(s): ${missing.join(", ")} — run with --sync first`);
      sources = r.rows;
    }
    for (const s of sources) {
      const report = await runConnector(s, test ? "test" : args.includes("--due") ? "schedule" : "cli", realDeps(pool));
      const { sample, ...summary } = report;
      console.log(JSON.stringify({ level: report.status === "failed" ? "error" : "info", msg: "run report", ...summary, stats: undefined }));
      if (test) console.log(JSON.stringify(sample.slice(0, 3), null, 2));
    }
    if (!test && sources.length) console.log(JSON.stringify({ level: "info", msg: "alerts evaluated", notifications: await evaluateAlerts(pool) }));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ level: "error", msg: (e as Error).message }));
  process.exit(1);
});
