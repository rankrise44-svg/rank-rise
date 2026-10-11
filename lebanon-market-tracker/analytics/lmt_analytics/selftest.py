"""In-memory self test on synthetic data (no database)."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .backtest import rolling_origin_backtest
from .data import series_as_of
from .engine import compute_forecast
from .events import EVENTS, EventSpec, build_examples
from .log import log


def ar1_series(n: int = 50, phi: float = 0.6, mu: float = 5.0, sigma: float = 1.0, seed: int = 7, start_year: int = 1975) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    y = np.empty(n)
    y[0] = mu
    for i in range(1, n):
        y[i] = mu + phi * (y[i - 1] - mu) + rng.normal(0, sigma)
    dates = pd.to_datetime([f"{start_year + i}-01-01" for i in range(n)])
    return pd.DataFrame({"period_date": dates, "value": y, "period_label": [str(start_year + i) for i in range(n)]})


def raw_rows_from_series(series: pd.DataFrame, collected_at: str = "2020-06-01T00:00:00Z") -> pd.DataFrame:
    """Turn a clean annual series into raw observation rows (single vintage)."""
    return pd.DataFrame(
        {
            "observation_id": [f"obs-{i}" for i in range(len(series))],
            "period_date": series["period_date"],
            "period_label": series.get("period_label"),
            "value": series["value"],
            "is_projection": False,
            "is_synthetic": False,
            "observed_at": [pd.Timestamp(d).replace(month=12, day=31, hour=23, minute=59, second=59).tz_localize("UTC") for d in series["period_date"]],
            "collected_at": pd.Timestamp(collected_at),
            "superseded_at": pd.NaT,
        }
    )


def run() -> int:
    failures: list[str] = []

    def check(cond: bool, name: str, **extra) -> None:
        log("selftest_check", name=name, ok=bool(cond), **extra)
        if not cond:
            failures.append(name)

    # 1. cutoff filtering
    s = ar1_series(30, start_year=1990)
    raw = raw_rows_from_series(s)
    extra = raw.iloc[[-1]].copy()
    extra["is_projection"] = True
    extra["period_date"] = pd.Timestamp("2020-01-01")
    raw2 = pd.concat([raw, extra], ignore_index=True)
    asof = series_as_of(raw2, "2021-01-01T00:00:00Z")
    check(len(asof) == 30, "series_as_of excludes projections", n=len(asof))
    check(len(series_as_of(raw2, "2020-01-01T00:00:00Z")) == 0, "series_as_of excludes rows collected after cutoff")

    # 2. backtest leakage guard on every event type
    s = ar1_series(50)
    thr = float(np.median(s["value"]))
    for ev in EVENTS:
        for h in (1, 2):
            spec = EventSpec(ev, h, thr if "threshold" in ev else None)
            ex = build_examples(s, spec, "annual")
            seen: list[bool] = []
            rolling_origin_backtest(ex, on_fit=lambda k, pos, tr: seen.append(bool(np.all(ex.origin_pos[tr] + h <= pos))))
            check(all(seen) and len(seen) > 0, f"no leakage {ev} h={h}", n_origins=len(seen))

    # 3. gating
    long_res = compute_forecast(ar1_series(120, phi=0.0, seed=3), EventSpec("increase", 1), "annual")
    check(long_res.status == "complete" and 0 < (long_res.probability or 0) < 1, "long AR(1) series publishes a probability",
          status=long_res.status, probability=long_res.probability, model=long_res.model_name,
          brier=long_res.backtest.get("brier"))
    short_res = compute_forecast(ar1_series(8), EventSpec("increase", 1), "annual")
    check(short_res.status == "insufficient_data" and short_res.probability is None and bool(short_res.scenario_analysis),
          "short series -> insufficient_data with scenario text", status=short_res.status)
    check("%" not in (short_res.scenario_analysis or ""), "scenario text has no percent signs")

    log("selftest_done", ok=not failures, failures=failures)
    return 0 if not failures else 1
