import numpy as np
import pandas as pd
import pytest

from lmt_analytics.events import EventSpec, build_examples, feature_frame
from lmt_analytics.periods import add_periods

from .conftest import make_series

V = [10, 12, 11, 15, 9, 9, 20]


@pytest.mark.parametrize(
    "event,threshold,h,expected",
    [
        ("increase", None, 1, [1, 0, 0, 1]),
        ("decrease", None, 1, [0, 1, 0, 0]),
        ("above_threshold", 10, 1, [1, 0, 0, 1]),
        ("below_threshold", 10, 1, [0, 1, 1, 0]),
        ("increase", None, 2, [0, 0, 1]),
        ("decrease", None, 2, [1, 1, 0]),
        ("above_threshold", 10, 2, [0, 0, 1]),
        ("below_threshold", 10, 2, [1, 1, 0]),
        ("increase", None, 3, [0, 1]),
    ],
)
def test_labels(event, threshold, h, expected):
    ex = build_examples(make_series(V), EventSpec(event, h, threshold), "annual")
    assert list(ex.y) == expected
    # first usable origin is index 2 (needs two changes for the rolling std)
    assert list(ex.origin_pos) == list(range(2, 2 + len(expected)))
    assert list(ex.label_pos) == [p + h for p in ex.origin_pos]


def test_threshold_required():
    with pytest.raises(ValueError):
        EventSpec("above_threshold", 1, None)
    with pytest.raises(ValueError):
        EventSpec("sideways", 1)


def test_features_only_use_past():
    s = make_series(np.arange(30, dtype=float) ** 1.3)
    spec = EventSpec("above_threshold", 2, 50.0)
    f1 = feature_frame(s["value"], spec)
    s2 = s.copy()
    s2.loc[20:, "value"] = -999.0  # change the future only
    f2 = feature_frame(s2["value"], spec)
    pd.testing.assert_frame_equal(f1.iloc[:20], f2.iloc[:20])


def test_feature_values():
    ex = build_examples(make_series(V), EventSpec("above_threshold", 1, 10.0), "annual")
    x = ex.X.iloc[1]  # origin index 3 (value 15)
    assert x["last_value"] == 15
    assert x["last_change"] == 4
    assert x["mean_change_3"] == pytest.approx((2 - 1 + 4) / 3)
    assert x["std_change_5"] == pytest.approx(np.std([2, -1, 4], ddof=1))
    assert x["last_change_sign"] == 1
    assert x["distance_to_threshold"] == 5
    assert ex.current_value == 20 and ex.current_date == pd.Timestamp("1986-01-01")


def test_gaps_use_calendar_positions():
    s = make_series(range(10)).drop(index=5).reset_index(drop=True)  # 1985 missing
    ex = build_examples(s, EventSpec("increase", 1), "annual")
    # no example may straddle the gap: origin 1984 (label 1985 missing) and 1985 are absent
    years = [d.year for d in ex.origin_dates]
    assert 1984 not in years and 1985 not in years


def test_add_periods():
    assert add_periods("2025-01-01", "annual", 2) == pd.Timestamp("2027-01-01")
    assert add_periods("2026-08-01", "monthly", 1) == pd.Timestamp("2026-09-01")
    assert add_periods("2026-11-01", "monthly", 3) == pd.Timestamp("2027-02-01")
    assert add_periods("2026-07-01", "quarterly", 2) == pd.Timestamp("2027-01-01")
