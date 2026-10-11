"""Rolling-origin (expanding window) backtest with an explicit no-leakage assertion.

For each labelled example k (in time order) the models are trained ONLY on examples j whose
label period is already observed at origin k, i.e. ``origin_pos[j] + h <= origin_pos[k]``,
and then predict example k. Origins with fewer than ``min_train`` eligible training examples
are skipped. When a model cannot be fitted at an origin (e.g. logistic with < 15 examples or a
single class) it falls back to the base rate there, so every model is scored on exactly the
same origins; ``n_fitted`` reports how often each model was genuinely fitted.
"""

from __future__ import annotations

from typing import Callable

import numpy as np

from .calibration import brier_score, brier_skill_score, log_loss, reliability_table
from .events import ExampleSet
from .models import COMPLEXITY, make_models

DEFAULT_MIN_TRAIN = 12
METHOD = "rolling-origin expanding window"

FitHook = Callable[[int, int, np.ndarray], None]  # (example index k, origin position, train example indices)


class LeakageError(AssertionError):
    pass


def training_indices(ex: ExampleSet, k: int) -> np.ndarray:
    """Examples whose label period ends no later than origin k (usable at prediction time k)."""
    return np.flatnonzero(ex.origin_pos + ex.horizon <= ex.origin_pos[k])


def rolling_origin_backtest(
    ex: ExampleSet,
    min_train: int = DEFAULT_MIN_TRAIN,
    model_factory: Callable = make_models,
    on_fit: FitHook | None = None,
) -> dict:
    h = ex.horizon
    names: list[str] | None = None
    preds: dict[str, list[float]] = {}
    fitted: dict[str, int] = {}
    outcomes: list[int] = []
    origins: list[int] = []

    for k in range(len(ex)):
        train = training_indices(ex, k)
        if len(train) < min_train:
            continue
        # --- leakage guard: every training label must be observable at the prediction origin ---
        if not np.all(ex.origin_pos[train] + h <= ex.origin_pos[k]) or np.any(train == k):
            raise LeakageError(f"training set for origin {k} contains an example labelled at/after the origin")
        assert np.all(ex.label_pos[train] <= ex.origin_pos[k])
        if on_fit is not None:
            on_fit(k, int(ex.origin_pos[k]), train.copy())

        Xtr, ytr = ex.X.iloc[train], ex.y[train]
        Xk = ex.X.iloc[[k]]
        models = model_factory(ex.spec)
        if names is None:
            names = [m.name for m in models]
            preds = {n: [] for n in names}
            fitted = {n: 0 for n in names}
        for m in models:
            m.fit(Xtr, ytr)
            preds[m.name].append(float(m.predict_proba(Xk)[0]))
            fitted[m.name] += int(bool(m.fitted))
        outcomes.append(int(ex.y[k]))
        origins.append(k)

    n = len(outcomes)
    res: dict = {
        "method": METHOD,
        "min_train": min_train,
        "horizon": h,
        "n_examples": len(ex),
        "n_predictions": n,
        "brier": {},
        "log_loss": {},
        "brier_skill_vs_base_rate": {},
        "n_fitted": fitted,
        "reliability_by_model": {},
        "event_rate_backtest": float(np.mean(outcomes)) if n else None,
        "first_origin": ex.origin_dates[origins[0]] if n else None,
        "last_origin": ex.origin_dates[origins[-1]] if n else None,
        "_predictions": {k: np.array(v) for k, v in preds.items()},
        "_outcomes": np.array(outcomes, dtype=int),
        "_origins": np.array(origins, dtype=int),
    }
    if n == 0:
        return res
    y = res["_outcomes"]
    for name, p in res["_predictions"].items():
        res["brier"][name] = brier_score(p, y)
        res["log_loss"][name] = log_loss(p, y)
        res["reliability_by_model"][name] = reliability_table(p, y, n_bins=5)
    base = res["brier"].get("base_rate")
    for name in res["brier"]:
        res["brier_skill_vs_base_rate"][name] = brier_skill_score(res["brier"][name], base)
    return res


def ranked_models(bt: dict) -> list[str]:
    """Models by backtest Brier ascending; ties (to 1e-12) go to the simpler model."""
    return sorted(bt["brier"], key=lambda m: (round(bt["brier"][m], 12), COMPLEXITY.get(m, 99)))


def public_backtest(bt: dict, selected: str | None) -> dict:
    """JSON-safe view of a backtest result (internal arrays dropped)."""
    out = {k: v for k, v in bt.items() if not k.startswith("_") and k != "reliability_by_model"}
    rel_model = selected if selected in bt.get("reliability_by_model", {}) else ("base_rate" if "base_rate" in bt.get("reliability_by_model", {}) else None)
    out["reliability_model"] = rel_model
    out["reliability"] = bt["reliability_by_model"].get(rel_model, []) if rel_model else []
    out["reliability_by_model"] = bt.get("reliability_by_model", {})
    return out
