import type { Pool } from "pg";
import { decryptSecret } from "../secrets-core";
import { afterStore } from "../intel/pipeline";
import { CONNECTORS } from "./registry";
import type { RunnerDeps } from "./runner";
import type { SourceRow } from "./types";

/** Wires the real dependencies for the ingestion runner (used by API routes, the worker and the CLI). */
export function realDeps(pool: Pool, env: NodeJS.ProcessEnv = process.env): RunnerDeps {
  return {
    db: pool,
    connectors: CONNECTORS,
    retentionDays: Number(env.RAW_PAYLOAD_RETENTION_DAYS ?? 30),
    afterStore: (db, stats) => afterStore(db, stats),
    async getCredential(source: SourceRow) {
      const r = await pool.query<{ ciphertext: string; iv: string; auth_tag: string }>(
        "SELECT ciphertext, iv, auth_tag FROM source_credentials WHERE source_id = $1",
        [source.id],
      );
      if (r.rows[0] && env.SECRETS_ENCRYPTION_KEY) {
        return decryptSecret({ ciphertext: r.rows[0].ciphertext, iv: r.rows[0].iv, authTag: r.rows[0].auth_tag }, Buffer.from(env.SECRETS_ENCRYPTION_KEY, "base64"));
      }
      if (source.connector === "twelvedata") return env.TWELVEDATA_API_KEY || null;
      if (source.connector === "alphavantage") return env.ALPHAVANTAGE_API_KEY || null;
      return null;
    },
  };
}
