/**
 * DEVELOPMENT-ONLY synthetic demo data.
 *   npm run db:seed:demo            insert
 *   npm run db:seed:demo -- --clear remove all synthetic rows
 * Every row is written with is_synthetic = true and titles prefixed "[تجريبي]". Synthetic rows are hidden
 * everywhere unless demo mode is enabled in Settings (impossible in production). Refuses to run when
 * NODE_ENV=production or when DATABASE_URL does not look like a local database.
 */
import "./_env";
import { Pool } from "pg";

const SYNTHETIC_TABLES = ["opportunity_evidence", "opportunities", "news_articles", "events", "market_observations", "indicator_observations", "economic_indicators", "trend_signals", "reports", "forecasts"];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed synthetic data in production");
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && process.env.ALLOW_DEMO_SEED !== "1") throw new Error("DATABASE_URL is not local; set ALLOW_DEMO_SEED=1 to override deliberately");
  const pool = new Pool({ connectionString: url });
  try {
    if (process.argv.includes("--clear")) {
      for (const t of SYNTHETIC_TABLES) await pool.query(`DELETE FROM ${t} WHERE is_synthetic`);
      console.log(JSON.stringify({ level: "info", msg: "synthetic rows removed" }));
      return;
    }
    const src = await pool.query<{ id: string }>(
      `INSERT INTO sources (key, connector, name, name_ar, source_type, provenance, coverage_notes, enabled, status)
       VALUES ('demo-synthetic','manual','SYNTHETIC demo data','بيانات تجريبية اصطناعية','manual','inferred','Fabricated for UI development only. Never real.', false, 'disabled')
       ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    );
    const sid = src.rows[0].id;
    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      await pool.query(
        `INSERT INTO news_articles (source_id, url, canonical_url, url_hash, title, title_fingerprint, summary, language, source_name, published_at, topics, sectors, areas,
            lebanon_relevance, impact, classification_method, is_synthetic)
         VALUES ($1,$2,$2,md5($2),$3,$3,$4,'ar','مصدر تجريبي',$5,$6,$7,'{lebanon}',0.9,$8,'synthetic',true) ON CONFLICT (url_hash) DO NOTHING`,
        [sid, `https://synthetic.invalid/news/${i}`, `[تجريبي] خبر اصطناعي رقم ${i + 1} لاختبار الواجهة`, "نص اصطناعي لا يمثل أي حدث حقيقي.", new Date(now - i * 3 * 3600_000),
          [["economy"], ["currency"], ["business"]][i % 3], [["energy"], ["tourism"], ["banking"]][i % 3], ["positive", "negative", "uncertain"][i % 3]],
      );
    }
    for (let d = 0; d < 30; d++) {
      await pool.query(
        `INSERT INTO market_observations (source_id, instrument, instrument_type, rate_type, provider, currency, unit, observed_at, value, granularity, is_synthetic)
         VALUES ($1,'DEMO/USD','fx','user_entered','Synthetic generator','USD','synthetic units',$2,$3,'daily',true) ON CONFLICT DO NOTHING`,
        [sid, new Date(now - d * 86400_000), 100 + Math.sin(d / 4) * 5],
      );
    }
    const opp = await pool.query<{ id: string }>(
      `INSERT INTO opportunities (title, sector_key, problem, data_gaps, confidence, status, origin, overall_score, is_synthetic, scores)
       VALUES ('[تجريبي] فرضية اصطناعية لعرض الواجهة','energy','مثال اصطناعي فقط.','كل شيء — هذه بيانات تجريبية.','unvalidated','candidate','user',55,true,'{"disclaimer":"بيانات تجريبية"}') RETURNING id`,
    );
    await pool.query(
      "INSERT INTO opportunity_evidence (opportunity_id, stance, evidence_type, summary, is_synthetic) VALUES ($1,'supports','note','دليل اصطناعي',true)",
      [opp.rows[0].id],
    );
    console.log(JSON.stringify({ level: "info", msg: "synthetic demo data inserted (hidden unless demo mode is on in Settings)" }));
  } finally {
    await pool.end();
  }
}
main().catch((e) => {
  console.error(JSON.stringify({ level: "error", msg: (e as Error).message }));
  process.exit(1);
});
