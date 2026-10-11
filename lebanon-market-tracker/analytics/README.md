# lmt_analytics — statistical forecasting engine

Python worker that turns the app's well-defined forecast questions (`forecasts` rows with
`status = 'pending'`) into backtested, calibrated probabilities, or into a qualitative Arabic
scenario analysis when the data cannot justify a number. It also scores forecasts once the
target period is observed (`forecast_outcomes`).

## Commands

Everything runs through the wrapper. It loads `.env.local` and `.env`, creates
`analytics/.venv` from `requirements.txt` if needed, then runs `python -m lmt_analytics`:

```bash
bash scripts/analytics.sh forecast            # process up to 20 pending forecasts, oldest first
bash scripts/analytics.sh resolve             # score forecasts whose target period is now observed
bash scripts/analytics.sh backtest --code PCPIPCH --event increase [--country LBN] [--horizon 1] \
     [--threshold X] [--source imf-datamapper] [--cutoff 2024-01-01T00:00:00Z]   # read-only diagnostics
bash scripts/analytics.sh selftest            # synthetic in-memory checks, no database
analytics/.venv/bin/python -m pytest analytics   # tests (the DB test uses DATABASE_URL_TEST, skipped if unreachable)
```

The connection URL comes from `DATABASE_URL`. All output is JSON lines on stdout.

## Methodology

1. **Data as of the cutoff** (`data.py`). Only rows that are not synthetic, not projections, have
   a value, and have `observed_at <= cutoff` (the period had ended) are used. A row must also have
   `collected_at <= cutoff` and `superseded_at IS NULL OR superseded_at > cutoff`, so a revised
   value is read from the vintage that was valid at the cutoff.
2. **Examples** (`events.py`). Each period is placed on a regular calendar grid, so gaps stay
   gaps. For each origin *i*, the features use only `y[..i]`: last value, last change, mean of the
   last 3 changes, std of the last 5 changes, sign of the last change, and, for threshold events,
   the distance to the threshold. The label is the event evaluated at `y[i+h]`:
   - `above_threshold`: `y[t+h] > threshold`
   - `below_threshold`: `y[t+h] < threshold`
   - `increase`: `y[t+h] > y[t]`
   - `decrease`: `y[t+h] < y[t]`
3. **Models** (`models.py`):
   - **BaseRate** is the Laplace-smoothed event frequency, `(k + 1) / (n + 2)`.
   - **Persistence** is the smoothed event frequency given the current state. For
     increase/decrease the state is the sign of the last change. For threshold events it is the
     current side of the threshold.
   - **Logistic** is standardised L2 logistic regression (C = 1, no class weights). It is fitted
     only with at least 15 examples and both classes present. Its outputs are clipped to
     [0.01, 0.99].
4. **Backtest** (`backtest.py`) is rolling-origin with an expanding window. Example *j* trains a
   prediction at origin *k* only if `j + h <= k`, meaning its label was already observed. The code
   asserts this (`LeakageError`). Prediction starts once at least 12 (`min_train`) examples are
   usable. A model that cannot be fitted at an origin falls back to the base rate there, so all
   models are scored on the same origins (`n_fitted` shows how often each was really fitted).
   Reported per model: Brier score, log loss, Brier skill score vs BaseRate, and 5-bin
   reliability tables.
5. **Selection and the published number** (`engine.py`). The model with the lowest backtest Brier
   wins, and ties go to the simpler model. It is refitted on every example available at the
   cutoff and predicts the live origin, which is the last observed period *t*. The
   `target_period_date` is *t + h* periods. The interval is the 10th–90th percentile over 200
   bootstrap refits with a fixed seed (`bootstrap-p10-p90`). `baseline_probability` is the
   BaseRate prediction.
6. **Resolution** (`resolve.py`) uses the current, non-projection observation of the target
   period, and it must have been collected after the data cutoff. Increase/decrease are compared
   with the origin value as known at the cutoff, which is stored in `backtest.event_origin`. It
   writes the outcome, the Brier score and the baseline Brier.

## Gates

A numeric probability is published (`status = 'complete'`) only when all of these hold:

- at least **15** labelled training examples at the cutoff;
- at least **10** backtest predictions;
- the selected model's backtest Brier is **≤ BaseRate's** (BaseRate itself may be selected);
- the selected model's backtest Brier is **< 0.25**, the score of a constant 50% forecast. A model that
  cannot beat a coin flip has shown no skill, so no number is published.

Otherwise `status = 'insufficient_data'`, `probability` and `baseline_probability` are NULL, the
backtest diagnostics are still stored, and `scenario_analysis` holds an Arabic base / upside /
downside description built from the data (last value, recent trend, volatility of changes, how
common the event has been). It contains no numeric probability. Exceptions set
`status = 'failed'` with `error_message`.

`limitations` always lists, in Arabic:
- the vintage caveat (current data, not what was known at each backtest origin);
- a small-sample warning;
- the fact that political and security shocks are not modelled;
- for annual series, a low-frequency note.
