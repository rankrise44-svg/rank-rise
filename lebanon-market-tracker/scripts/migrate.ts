import "./_env";
import { Client } from "pg";
import { runMigrations } from "../src/lib/migrations";

async function main() {
  const url = process.argv[2] === "--test" ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const res = await runMigrations(client);
    console.log(JSON.stringify({ level: "info", msg: "migrations complete", ...res }));
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(JSON.stringify({ level: "error", msg: (e as Error).message }));
  process.exit(1);
});
