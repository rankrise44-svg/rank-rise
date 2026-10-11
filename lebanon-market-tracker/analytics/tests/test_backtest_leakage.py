import numpy as np
import pytest

import lmt_analytics.backtest as bt_mod
from lmt_analytics.backtest import LeakageError, rolling_origin_backtest
from lmt_analytics.events import EVENTS, EventSpec, build_examples
from lmt_analytics.models import make_models
from lmt_analytics.selftest import ar1_series


@pytest.mark.parametrize("event", EVENTS)
@pytest.mark.parametrize("h", [1, 2, 4])
def test_training_never_contains_labels_at_or_after_origin(event, h):
    s = ar1_series(45, seed=3)
    thr = float(s["value"].median())
    ex = build_examples(s, EventSpec(event, h, thr if "threshold" in event else None), "annual")
    calls = []

    def hook(k, origin_pos, train):
        calls.append((k, origin_pos, train))

    # instrument the models too: record the exact rows they are fitted on
    fitted_rows = []

    def factory(spec):
        models = make_models(spec)
        for m in models:
            orig = m.fit

            def fit(X, y, _orig=orig):
                fitted_rows.append(X.index.to_numpy().copy())
                return _orig(X, y)

            m.fit = fit
        return models

    res = rolling_origin_backtest(ex, min_train=12, model_factory=factory, on_fit=hook)
    assert res["n_predictions"] == len(calls) > 0
    for k, origin_pos, train in calls:
        assert origin_pos == ex.origin_pos[k]
        assert k not in train
        assert np.all(ex.label_pos[train] <= origin_pos), "label period at/after origin used for training"
        assert np.all(ex.origin_pos[train] + h <= origin_pos)
        assert len(train) >= 12
    # models were fitted only on the rows the hook saw (3 models per origin)
    assert len(fitted_rows) == 3 * len(calls)
    for i, (k, origin_pos, train) in enumerate(calls):
        for rows in fitted_rows[3 * i : 3 * i + 3]:
            assert set(rows) == set(ex.X.index[train])


def test_first_origin_respects_min_train_and_horizon():
    h = 3
    ex = build_examples(ar1_series(40), EventSpec("increase", h), "annual")
    calls = []
    rolling_origin_backtest(ex, min_train=12, on_fit=lambda k, p, tr: calls.append((k, tr)))
    k0, tr0 = calls[0]
    assert len(tr0) == 12
    assert np.all(ex.origin_pos[tr0] + h <= ex.origin_pos[k0])
    # the origin just before the first one would have had fewer than 12 usable examples
    assert np.sum(ex.origin_pos + h <= ex.origin_pos[k0 - 1]) < 12
    # every labelled example from the first origin onwards is predicted exactly once
    assert [k for k, _ in calls] == list(range(k0, len(ex)))


def test_leakage_assertion_fires_if_training_selection_is_broken(monkeypatch):
    ex = build_examples(ar1_series(40), EventSpec("increase", 1), "annual")
    monkeypatch.setattr(bt_mod, "training_indices", lambda ex, k: np.arange(len(ex)))
    with pytest.raises(LeakageError):
        rolling_origin_backtest(ex, min_train=12)
