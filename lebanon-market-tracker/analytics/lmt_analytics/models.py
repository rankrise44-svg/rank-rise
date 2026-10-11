"""Candidate probability models, ordered from simplest to most complex.

Every model exposes:
  name, complexity, fit(X, y) -> self, predict_proba(X) -> ndarray, can_predict(x_row) -> bool,
  fitted (bool: False when the model fell back to the base rate), used_features (list[str]).
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .events import EventSpec

LOGISTIC_MIN_EXAMPLES = 15
LOGISTIC_CLIP = (0.01, 0.99)  # avoid near-certain outputs from a small-sample linear model


def laplace(successes: float, n: float) -> float:
    return (float(successes) + 1.0) / (float(n) + 2.0)


class BaseRateModel:
    """Frequency of the event among training labels, Laplace-smoothed: (k + 1) / (n + 2)."""

    name = "base_rate"
    complexity = 0

    def __init__(self, spec: EventSpec | None = None) -> None:
        self.spec = spec
        self.p = 0.5
        self.fitted = False

    @property
    def used_features(self) -> list[str]:
        return []

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "BaseRateModel":
        y = np.asarray(y, dtype=float)
        self.p = laplace(y.sum(), len(y))
        self.fitted = True
        return self

    def can_predict(self, x: pd.Series) -> bool:
        return True

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        return np.full(len(X), self.p, dtype=float)


class PersistenceModel:
    """Conditional event frequency given the current 'state', Laplace-smoothed.

    increase/decrease : state = sign of the last change. P(event | last change had the current
                        sign), e.g. how often an increase followed an increase. A zero last change
                        falls back to the base rate.
    threshold events  : state = whether the current value already satisfies the event (is on the
                        event side of the threshold). P(event | current side), i.e. the smoothed
                        rate at which the current side of the threshold persists (or is left).
    Unseen states fall back to the base rate.
    """

    name = "persistence"
    complexity = 1

    def __init__(self, spec: EventSpec) -> None:
        self.spec = spec
        self.table: dict[int, float] = {}
        self.base = BaseRateModel(spec)
        self.fitted = False

    @property
    def used_features(self) -> list[str]:
        return ["last_value"] if self.spec.is_threshold else ["last_change_sign"]

    def _state(self, X: pd.DataFrame) -> np.ndarray:
        if self.spec.is_threshold:
            v = X["last_value"].to_numpy(dtype=float)
            if self.spec.event == "above_threshold":
                st = (v > self.spec.threshold).astype(float)
            else:
                st = (v < self.spec.threshold).astype(float)
            st[np.isnan(v)] = np.nan
            return st
        return X["last_change_sign"].to_numpy(dtype=float)

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "PersistenceModel":
        y = np.asarray(y, dtype=float)
        self.base.fit(X, y)
        st = self._state(X)
        self.table = {}
        for s in (0.0, 1.0) if self.spec.is_threshold else (-1.0, 1.0):
            m = st == s
            if m.any():
                self.table[int(s)] = laplace(y[m].sum(), m.sum())
        self.fitted = bool(self.table)
        return self

    def can_predict(self, x: pd.Series) -> bool:
        return all(pd.notna(x.get(f)) for f in self.used_features)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        st = self._state(X)
        out = np.empty(len(X), dtype=float)
        for i, s in enumerate(st):
            if np.isnan(s) or (not self.spec.is_threshold and s == 0) or int(s) not in self.table:
                out[i] = self.base.p
            else:
                out[i] = self.table[int(s)]
        return out


class LogisticModel:
    """L2-regularised logistic regression on standardised features (sklearn, C=1, no class weights).

    Only fitted with >= 15 training examples and both classes present; otherwise it falls back
    to the base rate and ``fitted`` is False.
    """

    name = "logistic"
    complexity = 2

    def __init__(self, spec: EventSpec, min_examples: int = LOGISTIC_MIN_EXAMPLES) -> None:
        self.spec = spec
        self.min_examples = min_examples
        self.base = BaseRateModel(spec)
        self.pipe = None
        self.fitted = False

    @property
    def used_features(self) -> list[str]:
        return list(self.spec.feature_names)

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "LogisticModel":
        y = np.asarray(y, dtype=int)
        self.base.fit(X, y)
        self.pipe = None
        self.fitted = False
        if len(y) >= self.min_examples and len(np.unique(y)) == 2:
            pipe = make_pipeline(StandardScaler(), LogisticRegression(C=1.0, class_weight=None, max_iter=2000))
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                pipe.fit(X[self.used_features].to_numpy(dtype=float), y)
            self.pipe = pipe
            self.fitted = True
        return self

    def can_predict(self, x: pd.Series) -> bool:
        return all(pd.notna(x.get(f)) for f in self.used_features)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        if not self.fitted:
            return self.base.predict_proba(X)
        A = X[self.used_features].to_numpy(dtype=float)
        out = self.base.predict_proba(X)
        ok = ~np.isnan(A).any(axis=1)
        if ok.any():
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                out[ok] = np.clip(self.pipe.predict_proba(A[ok])[:, 1], *LOGISTIC_CLIP)
        return out


MODEL_CLASSES = (BaseRateModel, PersistenceModel, LogisticModel)
MODEL_NAMES = tuple(c.name for c in MODEL_CLASSES)
COMPLEXITY = {c.name: c.complexity for c in MODEL_CLASSES}


def make_model(name: str, spec: EventSpec):
    for c in MODEL_CLASSES:
        if c.name == name:
            return c(spec)
    raise KeyError(name)


def make_models(spec: EventSpec) -> list:
    return [c(spec) for c in MODEL_CLASSES]
