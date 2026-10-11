"""Resolve forecasts whose target period has since been observed, and score them."""

from __future__ import annotations

import json
from typing import Any

import pandas as pd

from .events import EventSpec
from .log import log
from .periods import add_periods


def outcome_for(spec: EventSpec, origin_value: float | None, target_value: float) -> bool:
    if spec.is_threshold:
        return bool(spec.label(float("nan"), float(target_value)))
    if origin_value is None:
        raise ValueError("origin value required for increase/decrease events")
    return bool(spec.label(float(origin_value), float(target_value)))


def _origin_value(conn, f: dict, spec: EventSpec, frequency: str | None) -> float | None:
    """The origin value as it was known at the data cutoff (recorded by the engine when available)."""
    bt = f.get("backtest") or {}
    if isinstance(bt, str):
        bt = json.loads(bt)
    eo = bt.get("event_origin") or {}
    if eo.get("value") is not None:
        return float(eo["value"])
    from .data import load_series

    series, _ = load_series(conn, f["indicator_id"], f["data_cutoff"])
    if series.empty or frequency is None:
        return None
    origin_date = add_periods(f["target_period_date"], frequency, -spec.horizon)
    m = series[series["period_date"] == pd.Timestamp(origin_date)]
    return float(m["value"].iloc[0]) if len(m) else None


def resolve_outcomes(conn, ids: list[str] | None = None) -> list[dict]:
    sql = """SELECT f.id::text AS id, f.event_definition, f.horizon_periods, f.target_period_date, f.data_cutoff,
                    f.probability::float8 AS probability, f.baseline_probability::float8 AS baseline_probability, f.backtest,
                    COALESCE(f.target_indicator_id::text, f.event_definition->>'indicator_id') AS indicator_id, f.is_synthetic,
                    i.frequency
               FROM forecasts f
               LEFT JOIN forecast_outcomes fo ON fo.forecast_id = f.id
               LEFT JOIN economic_indicators i ON i.id = COALESCE(f.target_indicator_id, (f.event_definition->>'indicator_id')::uuid)
              WHERE f.status IN ('complete', 'insufficient_data') AND fo.id IS NULL AND f.target_period_date IS NOT NULL"""
    params: list[Any] = []
    if ids:
        sql += " AND f.id = ANY(%s::uuid[])"
        params.append(ids)
    sql += " ORDER BY f.target_period_date, f.created_at"
    with conn.cursor() as cur:
        cur.execute(sql, params)
        cols = [c.name for c in cur.description]
        forecasts = [dict(zip(cols, r)) for r in cur.fetchall()]

    resolved: list[dict] = []
    for f in forecasts:
        ev = f["event_definition"] if isinstance(f["event_definition"], dict) else json.loads(f["event_definition"])
        spec = EventSpec.from_definition(ev, horizon=f["horizon_periods"])
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id::text, value::float8 FROM indicator_observations
                    WHERE indicator_id = %s AND period_date = %s AND is_current AND NOT is_projection
                      AND value IS NOT NULL AND collected_at > %s AND (NOT is_synthetic OR %s)
                      AND quality_status <> 'rejected'
                    ORDER BY collected_at DESC LIMIT 1""",
                (f["indicator_id"], f["target_period_date"], f["data_cutoff"], bool(f["is_synthetic"])),
            )
            obs = cur.fetchone()
        if not obs:
            log("resolve_skipped", forecast_id=f["id"], reason="target period not yet observed", target_period=f["target_period_date"])
            continue
        obs_id, value = obs[0], float(obs[1])
        try:
            origin = None if spec.is_threshold else _origin_value(conn, f, spec, f["frequency"] or ev.get("frequency"))
            outcome = outcome_for(spec, origin, value)
        except ValueError as e:
            log("resolve_skipped", level="warning", forecast_id=f["id"], reason=str(e))
            continue
        y = 1.0 if outcome else 0.0
        brier = None if f["probability"] is None else (f["probability"] - y) ** 2
        base_brier = None if (f["probability"] is None or f["baseline_probability"] is None) else (f["baseline_probability"] - y) ** 2
        ref = f"العتبة {spec.threshold}" if spec.is_threshold else f"قيمة الأساس {origin}"
        notes = f"القيمة المرصودة {value} للفترة {f['target_period_date']} مقارنةً بـ{ref}؛ النتيجة: {'تحقق الحدث' if outcome else 'لم يتحقق الحدث'}"
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO forecast_outcomes (forecast_id, outcome, observed_value, observation_id, brier_score, baseline_brier, notes)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (forecast_id) DO NOTHING""",
                (f["id"], outcome, value, obs_id, brier, base_brier, notes),
            )
        conn.commit()
        rec = {"forecast_id": f["id"], "outcome": outcome, "observed_value": value, "brier_score": brier, "baseline_brier": base_brier}
        log("forecast_resolved", **rec)
        resolved.append(rec)
    conn.commit()
    return resolved
