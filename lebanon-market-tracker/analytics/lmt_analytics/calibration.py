"""Probability scoring and calibration utilities (pure numpy)."""

from __future__ import annotations

import numpy as np

LOG_LOSS_EPS = 1e-6


def _arrays(p, y) -> tuple[np.ndarray, np.ndarray]:
    p = np.asarray(p, dtype=float).ravel()
    y = np.asarray(y, dtype=float).ravel()
    if p.shape != y.shape:
        raise ValueError("p and y must have the same length")
    return p, y


def brier_score(p, y) -> float:
    """Mean squared error between predicted probabilities and 0/1 outcomes."""
    p, y = _arrays(p, y)
    if p.size == 0:
        return float("nan")
    return float(np.mean((p - y) ** 2))


def log_loss(p, y, eps: float = LOG_LOSS_EPS) -> float:
    """Mean negative log-likelihood, probabilities clipped to [eps, 1 - eps]."""
    p, y = _arrays(p, y)
    if p.size == 0:
        return float("nan")
    p = np.clip(p, eps, 1.0 - eps)
    return float(-np.mean(y * np.log(p) + (1.0 - y) * np.log(1.0 - p)))


def brier_skill_score(brier_model: float, brier_reference: float) -> float:
    """1 - BS_model / BS_ref. Positive = better than the reference; NaN when the reference is 0."""
    if brier_reference is None or not np.isfinite(brier_reference) or brier_reference == 0:
        return float("nan")
    return float(1.0 - brier_model / brier_reference)


def reliability_table(p, y, n_bins: int = 5) -> list[dict]:
    """Equal-width bins over [0, 1]: count, mean predicted probability, observed event frequency.

    Bin k covers [k/n, (k+1)/n) except the last which is closed on the right. Empty bins report
    count 0 and null means.
    """
    p, y = _arrays(p, y)
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    idx = np.clip(np.digitize(p, edges[1:-1], right=False), 0, n_bins - 1)
    out = []
    for k in range(n_bins):
        m = idx == k
        c = int(m.sum())
        out.append(
            {
                "bin_low": float(round(edges[k], 6)),
                "bin_high": float(round(edges[k + 1], 6)),
                "count": c,
                "mean_predicted": float(p[m].mean()) if c else None,
                "observed_frequency": float(y[m].mean()) if c else None,
            }
        )
    return out
