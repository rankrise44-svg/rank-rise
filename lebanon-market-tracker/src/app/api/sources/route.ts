import { z } from "zod";
import { adminRoute } from "@/lib/api";
import { HttpError } from "@/lib/auth/guard";
import { queryOne } from "@/lib/db";
import { httpGet } from "@/lib/ingestion/http";
import { parseFeed } from "@/lib/ingestion/connectors/rss";
import { listSources } from "@/lib/repo/sources";

export const dynamic = "force-dynamic";

export const GET = adminRoute("sources.list", async () => {
  const rows = await listSources();
  // Never return credential material; only the masked hint.
  return { body: rows.map((r) => ({ ...r, credential_hint: r.credential_hint ? `••••${r.credential_hint}` : null })), audit: false };
});

const newFeed = z.object({
  name: z.string().trim().min(2).max(120),
  url: z.string().url().max(500).refine((u) => u.startsWith("https://") || u.startsWith("http://"), "http(s) only"),
  language: z.enum(["ar", "en", "fr"]).optional(),
  topics: z.array(z.string().max(30)).max(8).default(["news"]),
  terms_note: z.string().max(500).optional(),
});

/** Adds a user RSS/Atom feed after verifying that the URL really returns a parseable feed. */
export const POST = adminRoute("sources.add_rss", async (req) => {
  const b = newFeed.parse(await req.json());
  const u = new URL(b.url);
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname) || u.hostname.endsWith(".internal")) {
    throw new HttpError(400, "Private network addresses are not allowed", "invalid_url");
  }
  let items = 0;
  try {
    const res = await httpGet(b.url, { timeoutMs: 20_000, retries: 1 });
    items = parseFeed(res.text).items.length;
  } catch (e) {
    throw new HttpError(422, `The URL did not return a valid RSS/Atom feed: ${(e as Error).message.slice(0, 160)}`, "invalid_feed");
  }
  const key = `rss-user-${u.hostname.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}`.toLowerCase();
  const exists = await queryOne("SELECT 1 FROM sources WHERE endpoint_url = $1", [b.url]);
  if (exists) throw new HttpError(409, "This feed is already registered", "duplicate");
  const row = await queryOne<{ id: string }>(
    `INSERT INTO sources (key, connector, name, name_ar, domain, endpoint_url, homepage_url, source_type, provenance, terms_of_use, topics,
        update_schedule, schedule_minutes, coverage_notes, language, config, enabled, status)
     VALUES ($1,'rss',$2,$2,$3,$4,$5,'rss','third_party',$6,$7,'Every hour',60,'User-added feed',$8,'{"country":"Lebanon","_user_modified":"true"}',true,'never_run')
     RETURNING id`,
    [key, b.name, u.hostname, b.url, `${u.protocol}//${u.host}`, b.terms_note ?? "User-added publisher feed; store metadata and short excerpts only.", b.topics, b.language ?? null],
  );
  return { body: { ok: true, key, items_in_feed: items }, status: 201, audit: { target: { type: "source", id: row!.id }, details: { url: b.url } } };
});

