import "server-only";
import { getEnv } from "./env";
import { query, queryOne } from "./db";

import { decryptSecret, encryptSecret, maskSecret } from "./secrets-core";
export { decryptSecret, encryptSecret, maskSecret };

function key(): Buffer {
  const k = getEnv().SECRETS_ENCRYPTION_KEY;
  if (!k) throw new Error("SECRETS_ENCRYPTION_KEY is not configured; credentials cannot be stored");
  return Buffer.from(k, "base64");
}

export async function saveSourceCredential(sourceId: string, secret: string) {
  const box = encryptSecret(secret, key());
  await query(
    `INSERT INTO source_credentials (source_id, ciphertext, iv, auth_tag, key_hint) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (source_id) DO UPDATE SET ciphertext=EXCLUDED.ciphertext, iv=EXCLUDED.iv, auth_tag=EXCLUDED.auth_tag, key_hint=EXCLUDED.key_hint`,
    [sourceId, box.ciphertext, box.iv, box.authTag, secret.slice(-4)],
  );
}

export async function deleteSourceCredential(sourceId: string) {
  await query("DELETE FROM source_credentials WHERE source_id = $1", [sourceId]);
}

/** Environment variables that can provide a credential for a connector (fallback when none stored). */
const ENV_FALLBACK: Record<string, keyof ReturnType<typeof getEnv>> = {
  twelvedata: "TWELVEDATA_API_KEY",
  alphavantage: "ALPHAVANTAGE_API_KEY",
};

export async function getSourceCredential(sourceId: string, connector: string): Promise<string | null> {
  const row = await queryOne<{ ciphertext: string; iv: string; auth_tag: string }>(
    "SELECT ciphertext, iv, auth_tag FROM source_credentials WHERE source_id = $1",
    [sourceId],
  );
  if (row) return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag }, key());
  const envKey = ENV_FALLBACK[connector];
  const v = envKey ? getEnv()[envKey] : undefined;
  return typeof v === "string" && v ? v : null;
}

export async function credentialHint(sourceId: string, connector: string): Promise<{ configured: boolean; hint: string | null; origin: "db" | "env" | null }> {
  const row = await queryOne<{ key_hint: string }>("SELECT key_hint FROM source_credentials WHERE source_id = $1", [sourceId]);
  if (row) return { configured: true, hint: `••••${row.key_hint}`, origin: "db" };
  const envKey = ENV_FALLBACK[connector];
  const v = envKey ? getEnv()[envKey] : undefined;
  if (typeof v === "string" && v) return { configured: true, hint: maskSecret(v), origin: "env" };
  return { configured: false, hint: null, origin: null };
}
