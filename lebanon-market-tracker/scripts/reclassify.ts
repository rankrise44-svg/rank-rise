// Re-runs classification and clustering over stored articles (after lexicon changes).
import "./_env";
import { Pool } from "pg";
import { classifyArticles, clusterArticles, computeNewsSignals } from "../src/lib/intel/pipeline";
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const ids = (await pool.query<{ id: string }>("SELECT id FROM news_articles")).rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 500) await classifyArticles(pool, ids.slice(i, i + 500));
  await clusterArticles(pool, ids);
  console.log(JSON.stringify({ level: "info", msg: "reclassified", articles: ids.length, signals: await computeNewsSignals(pool) }));
  await pool.end();
})();
