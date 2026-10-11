"""Helpers to turn numpy/pandas values into strict JSON (no NaN/Infinity)."""

from __future__ import annotations

import math
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import numpy as np
import pandas as pd


def to_jsonable(obj: Any) -> Any:
    if obj is None or isinstance(obj, (bool, str)):
        return obj
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (float, np.floating, Decimal)):
        f = float(obj)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(obj, pd.Timestamp):
        if pd.isna(obj):
            return None
        return obj.date().isoformat() if obj == obj.normalize() and obj.tzinfo is None else obj.isoformat()
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {str(k): to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, np.ndarray, pd.Series)):
        return [to_jsonable(v) for v in list(obj)]
    return str(obj)
