import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth/guard";
import { getSourceByKey } from "@/lib/repo/sources";
import { deleteSourceCredential, saveSourceCredential } from "@/lib/secrets";

export const dynamic = "force-dynamic";

/** Stores an API key encrypted (AES-256-GCM). The key is never returned; only its last 4 characters. */
export const PUT = adminRoute<{ key: string }>(
  "sources.credential_set",
  async (req, { key }) => {
    const { secret } = z.object({ secret: z.string().trim().min(8).max(400) }).parse(await req.json());
    const s = await getSourceByKey(key);
    if (!s) throw new HttpError(404, "Unknown source", "not_found");
    if (s.auth_required === "none") throw new HttpError(400, "This source does not use credentials", "invalid");
    await saveSourceCredential(s.id, secret);
    return { body: { ok: true, hint: `••••${secret.slice(-4)}` }, audit: { target: { type: "source", id: s.id }, details: { key } } };
  },
  { capacity: 5, perMinute: 5 },
);

export const DELETE = adminRoute<{ key: string }>("sources.credential_delete", async (_req, { key }) => {
  const s = await getSourceByKey(key);
  if (!s) throw new HttpError(404, "Unknown source", "not_found");
  await deleteSourceCredential(s.id);
  return { body: { ok: true }, audit: { target: { type: "source", id: s.id }, details: { key } } };
});
