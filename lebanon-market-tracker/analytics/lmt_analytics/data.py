"""Loading indicator series as they were known at a data cutoff (strict leakage prevention).

The vintage rule: a row is visible at time T iff
    collected_at <= T  AND  (superseded_at IS NULL OR superseded_at > T)
and the observation is usable iff it is a real (non-synthetic), non-projection,
non-null value whose period had already finished (observed_at <= T).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

RAW_COLUMNS = [
    "observation_id",
    "period_date",
    "period_label",
    "value",
    "is_projection",
    "is_synthetic",
    "observed_at",
    "collected_at",
    "superseded_at",
    "is_current",
    "quality_status",
]

SERIES_COLUMNS = ["period_date", "value", "observation_id", "period_label", "collected_at"]


def _utc(x) -> pd.Timestamp:
    ts = pd.Timestamp(x)
    return ts.tz_localize("UTC") if ts.tzinfo is None else ts.tz_convert("UTC")


def _utc_series(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, utc=True)


def series_as_of(df: pd.DataFrame, cutoff) -> pd.DataFrame:
    """Pure function: the series exactly as it was knowable at ``cutoff``.

    ``df`` holds raw observation rows (all vintages) for ONE indicator with at least the
    columns period_date, value, is_projection, is_synthetic, observed_at, collected_at,
    superseded_at. Returns one row per period (sorted by period_date) with columns
    period_date (naive Timestamp), value (float), observation_id, period_label, collected_at.
    """
    cutoff = _utc(cutoff)
    if df is None or len(df) == 0:
        return pd.DataFrame(columns=SERIES_COLUMNS)
    d = df.copy()
    for col, default in (("observation_id", None), ("period_label", None), ("quality_status", "ok")):
        if col not in d.columns:
            d[col] = default
    d["observed_at"] = _utc_series(d["observed_at"])
    d["collected_at"] = _utc_series(d["collected_at"])
    d["superseded_at"] = _utc_series(d["superseded_at"])
    d["value"] = pd.to_numeric(d["value"], errors="coerce")

    mask = (
        (~d["is_synthetic"].astype(bool))
        & (~d["is_projection"].astype(bool))
        & d["value"].notna()
        & (d["observed_at"] <= cutoff)  # the period had finished
        & (d["collected_at"] <= cutoff)  # we had collected it
        & (d["superseded_at"].isna() | (d["superseded_at"] > cutoff))  # vintage still valid at cutoff
        & (d["quality_status"].fillna("ok") != "rejected")
    )
    d = d.loc[mask].copy()
    if d.empty:
        return pd.DataFrame(columns=SERIES_COLUMNS)
    pdates = pd.to_datetime(d["period_date"])
    if pdates.dt.tz is not None:
        pdates = pdates.dt.tz_localize(None)
    d["period_date"] = pdates.dt.normalize()
    # Defensive: if two vintages overlap at the cutoff, the most recently collected one wins.
    d = d.sort_values(["period_date", "collected_at"]).drop_duplicates("period_date", keep="last")
    out = d[SERIES_COLUMNS].reset_index(drop=True)
    out["value"] = out["value"].astype(float)
    return out


def has_revisions(df: pd.DataFrame) -> bool:
    """True when any (real) row of the series has ever been superseded by a revision."""
    if df is None or len(df) == 0 or "superseded_at" not in df.columns:
        return False
    real = df[~df["is_synthetic"].astype(bool)] if "is_synthetic" in df.columns else df
    return bool(real["superseded_at"].notna().any())


# ---------------------------------------------------------------------------
# Database access (psycopg 3)
# ---------------------------------------------------------------------------


@dataclass
class Indicator:
    id: str
    code: str
    country_code: str
    frequency: str
    unit: str | None
    name_en: str
    name_ar: str | None
    source_key: str | None = None


def load_observations(conn, indicator_id: str) -> pd.DataFrame:
    """All vintages of all observations for an indicator (no filtering — see series_as_of)."""
    with conn.cursor() as cur:
        cur.execute(
            """SELECT id::text AS observation_id, period_date, period_label, value::float8 AS value,
                      is_projection, is_synthetic, observed_at, collected_at, superseded_at,
                      is_current, quality_status
                 FROM indicator_observations
                WHERE indicator_id = %s
                ORDER BY period_date, collected_at""",
            (indicator_id,),
        )
        rows = cur.fetchall()
        cols = [c.name for c in cur.description]
    return pd.DataFrame([_row_tuple(r, cols) for r in rows], columns=cols)


def _row_tuple(r: Any, cols: list[str]) -> tuple:
    if isinstance(r, dict):
        return tuple(r[c] for c in cols)
    return tuple(r)


def load_series(conn, indicator_id: str, cutoff) -> tuple[pd.DataFrame, bool]:
    """(series as of cutoff, whether the indicator has any revision history)."""
    raw = load_observations(conn, indicator_id)
    return series_as_of(raw, cutoff), has_revisions(raw)


_IND_SELECT = """SELECT i.id::text AS id, i.code, i.country_code, i.frequency, i.unit, i.name_en, i.name_ar, s.key AS source_key
                   FROM economic_indicators i JOIN sources s ON s.id = i.source_id"""


def get_indicator(conn, indicator_id: str) -> Indicator | None:
    with conn.cursor() as cur:
        cur.execute(_IND_SELECT + " WHERE i.id = %s", (indicator_id,))
        r = cur.fetchone()
        cols = [c.name for c in cur.description]
    return Indicator(**dict(zip(cols, _row_tuple(r, cols)))) if r else None


def find_indicator(conn, code: str, country: str = "LBN", source_key: str | None = None) -> Indicator | None:
    """Resolve an indicator by code/country; with several sources, prefer the longest real history."""
    sql = (
        _IND_SELECT
        + """ LEFT JOIN indicator_observations o ON o.indicator_id = i.id AND o.is_current AND NOT o.is_projection
                   AND NOT o.is_synthetic AND o.value IS NOT NULL
             WHERE i.code = %s AND i.country_code = %s AND NOT i.is_synthetic"""
    )
    params: list[Any] = [code, country]
    if source_key:
        sql += " AND s.key = %s"
        params.append(source_key)
    sql += " GROUP BY i.id, i.code, i.country_code, i.frequency, i.unit, i.name_en, i.name_ar, s.key ORDER BY count(o.id) DESC LIMIT 1"
    with conn.cursor() as cur:
        cur.execute(sql, params)
        r = cur.fetchone()
        cols = [c.name for c in cur.description]
    return Indicator(**dict(zip(cols, _row_tuple(r, cols)))) if r else None


def connect(url: str):
    import psycopg

    return psycopg.connect(url, autocommit=False)
