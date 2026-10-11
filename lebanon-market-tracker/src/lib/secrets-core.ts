import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** AES-256-GCM helpers (pure; key passed explicitly). */
export function encryptSecret(plaintext: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
}

export function decryptSecret(box: { ciphertext: string; iv: string; authTag: string }, key: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(box.iv, "base64"));
  decipher.setAuthTag(Buffer.from(box.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(box.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export function maskSecret(secret: string): string {
  return secret.length <= 4 ? "••••" : `••••${secret.slice(-4)}`;
}
