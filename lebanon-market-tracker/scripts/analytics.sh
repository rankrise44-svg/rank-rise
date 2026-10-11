#!/usr/bin/env bash
# Runs the Python statistical forecasting engine (analytics/lmt_analytics).
#   bash scripts/analytics.sh forecast | resolve | selftest
#   bash scripts/analytics.sh backtest --code PCPIPCH --event increase [--country LBN] [--horizon 1] [--threshold X]
# Loads .env.local then .env (like Next.js: variables already set in the environment win,
# .env.local wins over .env). Values are exported but never printed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

load_env_file() {
  local file="$1" line key val
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line#export }"
    [[ "$line" == *=* ]] || continue
    key="${line%%=*}"
    key="${key%"${key##*[![:space:]]}"}"
    val="${line#*=}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    # strip matching surrounding quotes
    if [[ "$val" =~ ^\"(.*)\"$ ]] || [[ "$val" =~ ^\'(.*)\'$ ]]; then
      val="${BASH_REMATCH[1]}"
    fi
    if [ -z "${!key+x}" ]; then
      export "$key=$val"
    fi
  done < "$file"
}

load_env_file .env.local
load_env_file .env

VENV="analytics/.venv"
PY="${PYTHON:-python3}"
if [ ! -x "$VENV/bin/python" ]; then
  echo '{"event":"venv_create","path":"analytics/.venv"}'
  "$PY" -m venv "$VENV"
  "$VENV/bin/python" -m pip install --quiet --upgrade pip
  "$VENV/bin/python" -m pip install --quiet -r analytics/requirements.txt
elif [ analytics/requirements.txt -nt "$VENV/.requirements-installed" ]; then
  "$VENV/bin/python" -m pip install --quiet -r analytics/requirements.txt
fi
touch "$VENV/.requirements-installed"

export PYTHONPATH="$ROOT/analytics${PYTHONPATH:+:$PYTHONPATH}"
exec "$VENV/bin/python" -m lmt_analytics "$@"
