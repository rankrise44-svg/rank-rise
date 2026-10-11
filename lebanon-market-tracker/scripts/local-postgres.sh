#!/usr/bin/env bash
# Starts a throwaway local PostgreSQL cluster for development (no Docker needed).
# Data lives in ./.data/pg (git-ignored). Usage: npm run db:local [stop]
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
DATA_DIR="${LMT_PGDATA:-$PWD/.data/pg}"
PORT="${LMT_PGPORT:-5433}"
RUN_AS=""
if [ "$(id -u)" = "0" ]; then
  # postgres refuses to run as root; use the postgres system user when present.
  id postgres >/dev/null 2>&1 || useradd -r -m postgres
  RUN_AS="runuser -u postgres --"
fi
if [ "${1:-start}" = "stop" ]; then
  $RUN_AS "$PGBIN/pg_ctl" -D "$DATA_DIR" stop -m fast; exit 0
fi
if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
  mkdir -p "$DATA_DIR"
  [ -n "$RUN_AS" ] && chown -R postgres "$(dirname "$DATA_DIR")"
  $RUN_AS "$PGBIN/initdb" -D "$DATA_DIR" -U lmt --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null
fi
if ! $RUN_AS "$PGBIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
  $RUN_AS "$PGBIN/pg_ctl" -D "$DATA_DIR" -o "-p $PORT -k /tmp" -l "$DATA_DIR/server.log" start >/dev/null
fi
for db in lmt lmt_test; do
  psql -h 127.0.0.1 -p "$PORT" -U lmt -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
    || psql -h 127.0.0.1 -p "$PORT" -U lmt -d postgres -c "CREATE DATABASE $db" >/dev/null
done
echo "PostgreSQL running on 127.0.0.1:$PORT (databases: lmt, lmt_test)"
echo "DATABASE_URL=postgres://lmt@127.0.0.1:$PORT/lmt"
