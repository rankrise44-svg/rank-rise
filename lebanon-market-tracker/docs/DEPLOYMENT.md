# Deployment

The repository root is the Rank Rise marketing site, published by Netlify. **Deploy this app separately.**
`netlify.toml` returns 404 for `/lebanon-market-tracker/*` so its source is never served from the marketing site.

## Option A — Vercel + managed PostgreSQL (lowest operations)

1. Create a PostgreSQL database (e.g. Supabase or Neon free tiers; check their current limits). Set `DATABASE_SSL=true`
   if TLS is required.
2. Run the migrations from your machine: `DATABASE_URL=… npm run db:migrate`, then `npm run ingest -- --sync`.
3. Import the repo into Vercel with **Root Directory = `lebanon-market-tracker`**.
4. Set env vars (Production): `DATABASE_URL`, `DATABASE_SSL`, `SESSION_SECRET`, `ADMIN_PASSWORD`,
   `SECRETS_ENCRYPTION_KEY`, `CRON_SECRET`, optional `LLM_*`, `TWELVEDATA_API_KEY`, `ALPHAVANTAGE_API_KEY`.
5. `vercel.json` schedules `GET /api/cron` every 2 hours. Vercel sends `Authorization: Bearer $CRON_SECRET`
   automatically when `CRON_SECRET` is set. Check your plan's cron frequency and function duration limits; the tick
   stops after about 240 s and continues on the next run.
6. The Python forecasting engine **does not run on Vercel**. Run `npm run worker` (or just
   `npm run analytics -- forecast` / `resolve` on a schedule) on a small VM, or locally against the same database.

## Option B — Docker Compose on a VM (everything included)

```bash
cd lebanon-market-tracker
cp .env.example .env    # set SESSION_SECRET, ADMIN_PASSWORD, SECRETS_ENCRYPTION_KEY, CRON_SECRET, POSTGRES_PASSWORD
docker compose up -d --build
```

Services: `db` (PostgreSQL 16), `worker` (migrations, source sync, scheduler loop, Python forecasts), and `web`
(Next.js standalone on port 3000). Put a TLS reverse proxy (Caddy/nginx) in front of `web`.

## Secrets

- Generate with `openssl rand -hex 32` (session) and `openssl rand -base64 32` (encryption key).
- Never commit `.env*` files (git-ignored). Third-party API keys can be entered in the UI, where they are encrypted at rest.
- Rotating `SECRETS_ENCRYPTION_KEY` makes stored keys unreadable: re-enter them after rotating.
- Changing `SESSION_SECRET` logs out every session.

## Background worker requirements

- Needs Node ≥ 20 and, for forecasts, Python ≥ 3.11 (`scripts/analytics.sh` builds `analytics/.venv`).
- One worker only. Ticks also take a PostgreSQL advisory lock, so overlapping cron and worker runs are safe.
- Respect source rate limits. Schedules are per source (`schedule_minutes`); GDELT is spaced ≥ 6 s per request.

## Backups and recovery

- Daily logical backup: `pg_dump -Fc "$DATABASE_URL" > lmt-$(date +%F).dump`. Keep 14 daily and 8 weekly copies off-site.
- Managed providers: also enable their point-in-time recovery if available.
- Restore: create an empty database, then `pg_restore -d "$NEW_DATABASE_URL" --no-owner lmt-YYYY-MM-DD.dump`, and
  point `DATABASE_URL` at it. Migrations are recorded in `schema_migrations`, so `npm run db:migrate` is a no-op on a
  restored database.
- Raw payloads expire automatically after `RAW_PAYLOAD_RETENTION_DAYS`. Historical observations are never overwritten.
- Test a restore at least once.

## Health and monitoring

- `GET /api/health` (public) returns `{ok, db}` with HTTP 503 when the DB is unreachable.
- "المصادر والبيانات" shows each source's last success, last error and run logs. The "فشل المصادر" alert rule creates
  in-app notifications on source failures.
