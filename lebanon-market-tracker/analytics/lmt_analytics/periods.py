"""Period arithmetic by indicator frequency (period_date = period START)."""

from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd

_OFFSETS = {
    "annual": pd.DateOffset(years=1),
    "quarterly": pd.DateOffset(months=3),
    "monthly": pd.DateOffset(months=1),
    "weekly": pd.DateOffset(weeks=1),
    "daily": pd.DateOffset(days=1),
}

SUPPORTED_FREQUENCIES = tuple(_OFFSETS)

PERIOD_WORD_AR = {"annual": "سنة", "quarterly": "ربع سنة", "monthly": "شهر", "weekly": "أسبوع", "daily": "يوم"}


class UnsupportedFrequency(ValueError):
    pass


def add_periods(d, frequency: str, n: int) -> pd.Timestamp:
    """Period-start date ``n`` periods after ``d`` (n may be negative)."""
    if frequency not in _OFFSETS:
        raise UnsupportedFrequency(f"unsupported frequency: {frequency!r}")
    ts = pd.Timestamp(d)
    if n == 0:
        return ts
    return ts + _OFFSETS[frequency] * n


def period_positions(dates: Iterable, frequency: str) -> np.ndarray:
    """Integer position of each period on a regular calendar grid starting at the first date.

    Gaps in the series produce gaps in the positions, so ``pos + h`` always means
    "h calendar periods later" rather than "h observations later".
    """
    ds = [pd.Timestamp(d) for d in dates]
    if not ds:
        return np.zeros(0, dtype=int)
    if frequency not in _OFFSETS:
        raise UnsupportedFrequency(f"unsupported frequency: {frequency!r}")
    first, last = ds[0], ds[-1]
    grid: dict[pd.Timestamp, int] = {}
    k, cur = 0, first
    while cur <= last:
        grid[cur] = k
        k += 1
        cur = add_periods(first, frequency, k)
    try:
        return np.array([grid[d] for d in ds], dtype=int)
    except KeyError as e:  # a period not aligned with the frequency grid
        raise UnsupportedFrequency(f"period {e.args[0]} is not aligned with a {frequency} grid") from None
