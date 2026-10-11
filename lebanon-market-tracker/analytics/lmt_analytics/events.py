"""Event definitions and labelled examples built from a single series.

For an origin period i (positions on a regular calendar grid) and horizon h:
  features  — computed ONLY from y[..i]
  label     — event outcome evaluated on y[i+h] (and y[i] for increase/decrease)

Event semantics (t = origin, h = horizon):
  above_threshold : y[t+h] >  threshold
  below_threshold : y[t+h] <  threshold
  increase        : y[t+h] >  y[t]
  decrease        : y[t+h] <  y[t]
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from .periods import period_positions

EVENTS = ("above_threshold", "below_threshold", "increase", "decrease")
THRESHOLD_EVENTS = ("above_threshold", "below_threshold")

BASE_FEATURES = ["last_value", "last_change", "mean_change_3", "std_change_5", "last_change_sign"]


@dataclass(frozen=True)
class EventSpec:
    event: str
    horizon: int = 1
    threshold: float | None = None

    def __post_init__(self) -> None:
        if self.event not in EVENTS:
            raise ValueError(f"unknown event {self.event!r}; expected one of {EVENTS}")
        if int(self.horizon) < 1:
            raise ValueError("horizon must be >= 1")
        if self.event in THRESHOLD_EVENTS and (self.threshold is None or not np.isfinite(float(self.threshold))):
            raise ValueError(f"event {self.event} requires a numeric threshold")

    @property
    def is_threshold(self) -> bool:
        return self.event in THRESHOLD_EVENTS

    @property
    def feature_names(self) -> list[str]:
        return BASE_FEATURES + (["distance_to_threshold"] if self.is_threshold else [])

    @classmethod
    def from_definition(cls, d: dict[str, Any], horizon: int | None = None) -> "EventSpec":
        thr = d.get("threshold")
        return cls(
            event=str(d.get("event")),
            horizon=int(horizon if horizon is not None else d.get("horizon_periods", 1)),
            threshold=None if thr is None else float(thr),
        )

    def label(self, y_origin: float, y_target: float) -> int:
        if self.event == "above_threshold":
            return int(y_target > self.threshold)
        if self.event == "below_threshold":
            return int(y_target < self.threshold)
        if self.event == "increase":
            return int(y_target > y_origin)
        return int(y_target < y_origin)

    def holds_now(self, y: float) -> int:
        """For threshold events: does the CURRENT value already satisfy the event condition?"""
        if self.event == "above_threshold":
            return int(y > self.threshold)
        if self.event == "below_threshold":
            return int(y < self.threshold)
        raise ValueError("holds_now is only defined for threshold events")


@dataclass
class ExampleSet:
    spec: EventSpec
    feature_names: list[str]
    X: pd.DataFrame  # one row per labelled example, complete features
    y: np.ndarray  # 0/1 labels
    origin_pos: np.ndarray  # grid position of each example's origin
    origin_dates: list[pd.Timestamp]
    label_pos: np.ndarray  # = origin_pos + h
    current_pos: int | None = None  # the last observed period (the live origin)
    current_date: pd.Timestamp | None = None
    current_value: float | None = None
    current_x: pd.Series | None = None  # may contain NaN when history is too short
    grid_values: pd.Series = field(default_factory=lambda: pd.Series(dtype=float))  # value by grid position (NaN = gap)
    grid_dates: dict[int, pd.Timestamp] = field(default_factory=dict)

    def __len__(self) -> int:
        return len(self.y)

    @property
    def horizon(self) -> int:
        return self.spec.horizon


def feature_frame(values: pd.Series, spec: EventSpec) -> pd.DataFrame:
    """Features for every grid position i using only values at positions <= i.

    All operations are backward-looking (diff, trailing rolling windows) so row i never
    depends on later values.
    """
    v = values.astype(float)
    d = v.diff()
    f = pd.DataFrame(index=v.index)
    f["last_value"] = v
    f["last_change"] = d
    f["mean_change_3"] = d.rolling(3, min_periods=1).mean().where(d.notna())
    f["std_change_5"] = d.rolling(5, min_periods=2).std(ddof=1)
    f["last_change_sign"] = np.sign(d)
    if spec.is_threshold:
        f["distance_to_threshold"] = v - float(spec.threshold)
    return f[spec.feature_names]


def build_examples(series: pd.DataFrame, spec: EventSpec, frequency: str) -> ExampleSet:
    """Labelled examples for every origin i with y[i+h] available.

    ``series`` has columns period_date, value (one row per period, as returned by series_as_of).
    """
    s = series.sort_values("period_date")
    dates = [pd.Timestamp(x) for x in s["period_date"]]
    vals = s["value"].astype(float).to_numpy()
    names = spec.feature_names
    empty = ExampleSet(spec, names, pd.DataFrame(columns=names), np.zeros(0, dtype=int), np.zeros(0, dtype=int), [], np.zeros(0, dtype=int))
    if len(dates) == 0:
        return empty

    pos = period_positions(dates, frequency)
    n_grid = int(pos[-1]) + 1
    grid = pd.Series(np.nan, index=pd.RangeIndex(n_grid), dtype=float)
    grid.iloc[pos] = vals
    grid_dates = {int(p): d for p, d in zip(pos, dates)}
    feats = feature_frame(grid, spec)

    h = spec.horizon
    rows, labels, opos = [], [], []
    for i in range(n_grid - h):
        yi, yt = grid.iloc[i], grid.iloc[i + h]
        if np.isnan(yi) or np.isnan(yt):
            continue
        x = feats.iloc[i]
        if x.isna().any():
            continue
        rows.append(x.to_numpy(dtype=float))
        labels.append(spec.label(yi, yt))
        opos.append(i)

    X = pd.DataFrame(rows, columns=names) if rows else pd.DataFrame(columns=names, dtype=float)
    opos_a = np.array(opos, dtype=int)
    cur = n_grid - 1
    return ExampleSet(
        spec=spec,
        feature_names=names,
        X=X,
        y=np.array(labels, dtype=int),
        origin_pos=opos_a,
        origin_dates=[grid_dates[int(p)] for p in opos_a],
        label_pos=opos_a + h,
        current_pos=cur,
        current_date=grid_dates[cur],
        current_value=float(grid.iloc[cur]),
        current_x=feats.iloc[cur].copy(),
        grid_values=grid,
        grid_dates=grid_dates,
    )
