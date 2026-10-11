import re

import numpy as np
import pytest

from lmt_analytics.engine import LIM_POLITICAL, LIM_VINTAGE, MIN_TRAINING_EXAMPLES, compute_forecast
from lmt_analytics.events import EVENTS, EventSpec
from lmt_analytics.selftest import ar1_series

from .conftest import make_series

PROB_PATTERN = re.compile(r"\d\s*[%٪]|[%٪]\s*\d")


def _assert_no_probability_text(text: str):
    assert "%" not in text and "٪" not in text
    assert not PROB_PATTERN.search(text)
    assert "احتمال" not in text.replace("احتمالية رقمية", "").replace("احتمالية موثوقة", "").replace("تنبؤاً احتمالياً", "").replace("نشر احتمالية", "")


@pytest.mark.parametrize("n", [1, 3, 8, 14])
def test_short_series_is_insufficient_with_arabic_scenarios(n):
    s = make_series(np.linspace(2, 9, n) + np.sin(np.arange(n)))
    r = compute_forecast(s, EventSpec("increase", 1), "annual")
    assert r.status == "insufficient_data"
    assert r.probability is None and r.baseline_probability is None and r.probability_interval is None
    assert r.scenario_analysis and re.search(r"[؀-ۿ]", r.scenario_analysis)
    for word in ("السيناريو الأساسي", "السيناريو الصعودي", "السيناريو الهبوطي"):
        assert word in r.scenario_analysis
    _assert_no_probability_text(r.scenario_analysis)
    assert LIM_POLITICAL in r.limitations and LIM_VINTAGE in r.limitations
    assert r.target_period_date is not None


def test_threshold_scenario_with_percent_unit_has_no_percent_sign():
    s = make_series([150.0, 84.9, 221.3, 45.2])
    r = compute_forecast(s, EventSpec("above_threshold", 2, 50.0), "annual")
    assert r.status == "insufficient_data"
    _assert_no_probability_text(r.scenario_analysis)
    assert "العتبة" in r.scenario_analysis


def test_empty_series_insufficient():
    r = compute_forecast(make_series([]), EventSpec("decrease", 1), "monthly", fallback_origin="2026-08-01")
    assert r.status == "insufficient_data" and r.probability is None
    assert str(r.target_period_date) == "2026-09-01"
    assert r.scenario_analysis


@pytest.mark.parametrize("event", EVENTS)
def test_long_ar1_series_is_complete(event):
    # Each event type needs a series that genuinely carries predictable signal for it: threshold events
    # are predictable in a persistent series, up/down moves in a mean-reverting one.
    s = ar1_series(100, phi=0.9, seed=11) if "threshold" in event else ar1_series(120, phi=0.0, seed=3)
    thr = float(s["value"].median()) if "threshold" in event else None
    r = compute_forecast(s, EventSpec(event, 1, thr), "annual")
    assert r.status == "complete", r.gate_failures
    assert 0 < r.probability < 1
    assert 0 < r.baseline_probability < 1
    iv = r.probability_interval
    assert iv["method"] == "bootstrap-p10-p90" and 0 <= iv["low"] <= iv["high"] <= 1
    bt = r.backtest
    assert bt["n_predictions"] >= 10 and bt["n_training_examples"] >= MIN_TRAINING_EXAMPLES
    assert bt["method"] == "rolling-origin expanding window" and bt["min_train"] == 12
    assert set(bt["brier"]) == {"base_rate", "persistence", "logistic"}
    assert bt["brier"][r.model_name] <= bt["brier"]["base_rate"]
    assert bt["brier"][r.model_name] < 0.25
    assert len(bt["reliability"]) == 5
    assert r.model_version == "1.0.0"
    assert r.training_start < r.training_end
    assert str(r.target_period_date) == f"{s['period_date'].max().year + 1}-01-01"
    assert r.scenario_analysis is None
    assert any("سنوية" in l for l in r.limitations)


def test_selection_tie_prefers_simpler_and_deterministic_interval():
    s = ar1_series(50, seed=5)
    a = compute_forecast(s, EventSpec("increase", 2), "annual")
    b = compute_forecast(s, EventSpec("increase", 2), "annual")
    assert a.probability == b.probability and a.probability_interval == b.probability_interval
    briers = a.backtest["brier"]
    best = min(briers.values())
    from lmt_analytics.models import COMPLEXITY

    tied = sorted([m for m, v in briers.items() if round(v, 12) == round(best, 12)], key=COMPLEXITY.get)
    assert a.model_name == tied[0]


def test_revised_series_uses_revision_limitation():
    r = compute_forecast(ar1_series(40), EventSpec("increase", 1), "annual", has_revisions=True)
    assert LIM_VINTAGE not in r.limitations



def test_no_probability_when_model_does_not_beat_coin_flip():
    """Random-walk increments are coin flips: no model has skill, so no probability may be published."""
    from lmt_analytics.engine import UNINFORMATIVE_BRIER

    rng = np.random.default_rng(7)
    s = make_series(np.cumsum(rng.choice([-1.0, 1.0], size=60)))
    r = compute_forecast(s, EventSpec("increase", 1), "annual")
    assert r.backtest["gates"]["max_brier_uninformative"] == UNINFORMATIVE_BRIER
    best = min(r.backtest["brier"].values())
    assert best >= UNINFORMATIVE_BRIER  # fixed seed: no skill exists in this series
    assert r.status == "insufficient_data" and r.probability is None
    _assert_no_probability_text(r.scenario_analysis)
