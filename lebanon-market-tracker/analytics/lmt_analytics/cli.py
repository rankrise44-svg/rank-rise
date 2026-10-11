"""Command line: python -m lmt_analytics {forecast|resolve|backtest|selftest}."""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone

from .log import log


def _db_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        log("config_error", level="error", error="DATABASE_URL is not set")
        sys.exit(2)
    return url


def cmd_forecast(args) -> int:
    from .data import connect
    from .engine import process_pending

    with connect(_db_url()) as conn:
        res = process_pending(conn, limit=args.limit)
    log("forecast_run_done", processed=len(res), statuses={s: sum(1 for r in res if r["status"] == s) for s in {r["status"] for r in res}})
    return 0


def cmd_resolve(args) -> int:
    from .data import connect
    from .resolve import resolve_outcomes

    with connect(_db_url()) as conn:
        res = resolve_outcomes(conn)
    log("resolve_run_done", resolved=len(res))
    return 0


def cmd_backtest(args) -> int:
    """Read-only diagnostics for an indicator/event as of now (or --cutoff)."""
    from .data import connect, find_indicator, load_series
    from .engine import compute_forecast
    from .events import EventSpec

    spec = EventSpec(args.event, args.horizon, args.threshold)
    cutoff = args.cutoff or datetime.now(timezone.utc).isoformat()
    with connect(_db_url()) as conn:
        conn.read_only = True
        ind = find_indicator(conn, args.code, args.country, args.source)
        if ind is None:
            log("indicator_not_found", level="error", code=args.code, country=args.country, source=args.source)
            return 1
        series, revised = load_series(conn, ind.id, cutoff)
        conn.rollback()
    res = compute_forecast(series, spec, ind.frequency, has_revisions=revised, min_train=args.min_train)
    out = res.to_dict()
    log(
        "backtest_result",
        indicator={"id": ind.id, "code": ind.code, "country": ind.country_code, "source": ind.source_key, "frequency": ind.frequency},
        data_cutoff=cutoff,
        n_observations=len(series),
        first_period=series["period_date"].iloc[0] if len(series) else None,
        last_period=series["period_date"].iloc[-1] if len(series) else None,
        result=out,
    )
    return 0


def cmd_selftest(args) -> int:
    from .selftest import run

    return run()


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="lmt_analytics", description="Lebanon Market Tracker statistical forecasting engine")
    sub = p.add_subparsers(dest="command", required=True)

    f = sub.add_parser("forecast", help="process pending forecasts")
    f.add_argument("--limit", type=int, default=20)
    f.set_defaults(func=cmd_forecast)

    r = sub.add_parser("resolve", help="resolve forecasts whose target period is now observed")
    r.set_defaults(func=cmd_resolve)

    b = sub.add_parser("backtest", help="print backtest diagnostics for an indicator/event (read-only)")
    b.add_argument("--code", required=True)
    b.add_argument("--country", default="LBN")
    b.add_argument("--source", default=None, help="source key when the code exists in several sources")
    b.add_argument("--event", required=True, choices=["increase", "decrease", "above_threshold", "below_threshold"])
    b.add_argument("--threshold", type=float, default=None)
    b.add_argument("--horizon", type=int, default=1)
    b.add_argument("--min-train", dest="min_train", type=int, default=12)
    b.add_argument("--cutoff", default=None, help="ISO timestamp; defaults to now")
    b.set_defaults(func=cmd_backtest)

    s = sub.add_parser("selftest", help="run the in-memory self test (no database)")
    s.set_defaults(func=cmd_selftest)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return int(args.func(args) or 0)
    except ValueError as e:
        log("error", level="error", error=str(e))
        return 2
