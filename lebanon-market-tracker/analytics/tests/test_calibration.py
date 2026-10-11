import math

import numpy as np
import pytest

from lmt_analytics.calibration import brier_score, brier_skill_score, log_loss, reliability_table
from lmt_analytics.models import BaseRateModel, PersistenceModel
from lmt_analytics.events import EventSpec
import pandas as pd


def test_brier():
    assert brier_score([0.2, 0.8], [0, 1]) == pytest.approx(0.04)
    assert brier_score([1, 0], [0, 1]) == pytest.approx(1.0)
    assert brier_score([0.5] * 4, [0, 1, 0, 1]) == pytest.approx(0.25)


def test_log_loss_and_clipping():
    assert log_loss([0.5], [1]) == pytest.approx(math.log(2))
    assert log_loss([0.9, 0.2], [1, 0]) == pytest.approx(-(math.log(0.9) + math.log(0.8)) / 2)
    assert log_loss([0.0], [1]) == pytest.approx(-math.log(1e-6))
    assert np.isfinite(log_loss([1.0], [0]))


def test_reliability_table():
    t = reliability_table([0.1, 0.1, 0.5, 0.9, 1.0], [0, 1, 1, 1, 0], n_bins=5)
    assert [b["count"] for b in t] == [2, 0, 1, 0, 2]
    assert t[0]["mean_predicted"] == pytest.approx(0.1) and t[0]["observed_frequency"] == pytest.approx(0.5)
    assert t[1]["mean_predicted"] is None and t[1]["observed_frequency"] is None
    assert t[4]["mean_predicted"] == pytest.approx(0.95) and t[4]["observed_frequency"] == pytest.approx(0.5)
    assert t[0]["bin_low"] == 0.0 and t[4]["bin_high"] == 1.0


def test_skill_sign():
    assert brier_skill_score(0.1, 0.25) > 0
    assert brier_skill_score(0.3, 0.25) < 0
    assert brier_skill_score(0.25, 0.25) == 0
    assert math.isnan(brier_skill_score(0.1, 0.0))


def test_base_rate_laplace():
    X = pd.DataFrame({"last_change_sign": [1, 1, -1]})
    assert BaseRateModel().fit(X, np.array([1, 1, 0])).p == pytest.approx(3 / 5)


def test_persistence_conditional_rates():
    spec = EventSpec("increase", 1)
    X = pd.DataFrame({"last_change_sign": [1, 1, 1, -1, -1, 0]})
    y = np.array([1, 1, 0, 0, 0, 1])
    m = PersistenceModel(spec).fit(X, y)
    p = m.predict_proba(pd.DataFrame({"last_change_sign": [1, -1, 0]}))
    assert p[0] == pytest.approx((2 + 1) / (3 + 2))
    assert p[1] == pytest.approx((0 + 1) / (2 + 2))
    assert p[2] == pytest.approx((3 + 1) / (6 + 2))  # zero change -> base rate


def test_persistence_threshold_side():
    spec = EventSpec("above_threshold", 1, 5.0)
    X = pd.DataFrame({"last_value": [6, 7, 8, 1, 2]})
    y = np.array([1, 1, 0, 0, 1])
    m = PersistenceModel(spec).fit(X, y)
    p = m.predict_proba(pd.DataFrame({"last_value": [9.0, 0.0]}))
    assert p[0] == pytest.approx((2 + 1) / (3 + 2))  # stays above
    assert p[1] == pytest.approx((1 + 1) / (2 + 2))  # crosses up from below
