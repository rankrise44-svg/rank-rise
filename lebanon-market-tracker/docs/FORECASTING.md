# Forecasting methodology

The forecasting engine is separate from the LLM and lives in `analytics/` (Python: pandas, NumPy, scikit-learn). The
assistant may *request* a forecast (`run_forecast` tool) and *report* stored results. It never makes up a probability.
Full technical detail: [`analytics/README.md`](../analytics/README.md).

## What can be forecast

Only well-defined events about measured series:

| Event | Definition (t = last observed period at the data cutoff, h = horizon in periods) |
|---|---|
| `increase` / `decrease` | `y[t+h] > y[t]` / `y[t+h] < y[t]` |
| `above_threshold` / `below_threshold` | `y[t+h] > X` / `y[t+h] < X` |

Each stored forecast records the exact event definition, horizon, data cutoff, model and version, training period,
features, probability (if published), bootstrap interval, baseline probability, full backtest metrics, limitations,
and later the outcome.

## Leakage prevention

- **Data cutoff.** Only observations whose period had ended (`observed_at ≤ cutoff`) and were collected by then
  (`collected_at ≤ cutoff`) are used. A revised value is read from the vintage valid at the cutoff. Projections and
  synthetic rows are excluded.
- **Backtest.** Rolling origin with an expanding window. An example trains a prediction only if its label was already
  observable at that origin. The code asserts this, and a test instruments it.
- **Known limitation:** World Bank and IMF series are collected today, so earlier vintages are unavailable. Backtests
  therefore use current, revised history, which can flatter results. Every affected forecast lists this limitation.
  The platform keeps revisions from now on, so future backtests can use real vintages.

## Models and evaluation

Three candidate models: the historical base rate (Laplace-smoothed), a persistence rule, and L2 logistic regression on
past-only features. They are compared on rolling-origin Brier score and log loss, with 5-bin reliability tables.
Calibration utilities (Brier, log loss, reliability, skill score) are in `calibration.py` and have unit tests.

## When a probability is shown

A number is published only if **all** gates pass:

1. ≥ 15 labelled training examples;
2. ≥ 10 backtest predictions;
3. the selected model is at least as good as the base rate in backtesting;
4. the selected model's Brier is **below 0.25**, so it beats a constant 50/50 forecast.

Otherwise the forecast is stored as `insufficient_data`. The UI then shows a qualitative Arabic scenario analysis
(base, upside and downside conditions) with no probability, and states the reason. For example, on 2026-10-11 the
question "will Lebanese inflation (IMF, annual) decrease next year?" had 46 years of data. The best model scored a
Brier of 0.262, worse than a coin flip, so no number is shown.

## Interpreting probabilities

- A probability is a statistical frequency estimate conditional on history, not a certainty. It is shown with the
  bootstrap 10–90% interval and the base rate.
- Annual series give few examples, and one new observation can move estimates a lot.
- Political, security and geopolitical shocks are not modelled. For rare political or security events the platform
  shows no numeric probabilities, because historical frequencies are not meaningful.

## Outcome tracking

`npm run analytics -- resolve` (also run by the worker) scores forecasts once the target period is observed in data
collected after the cutoff. It stores the outcome, Brier score and baseline Brier. The Analytics page shows the running
track record against the baseline.
