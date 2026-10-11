"""Forecast computation with validation gates, and the DB worker that processes pending forecasts."""

from __future__ import annotations

import json
import traceback
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import numpy as np
import pandas as pd

from . import MODEL_VERSION
from .backtest import DEFAULT_MIN_TRAIN, public_backtest, ranked_models, rolling_origin_backtest
from .events import EventSpec, ExampleSet, build_examples
from .jsonutil import to_jsonable
from .log import log
from .models import make_model
from .periods import UnsupportedFrequency, add_periods
from .scenario import build_scenario_text

# --- validation gates -------------------------------------------------------------------------
MIN_TRAINING_EXAMPLES = 15
MIN_BACKTEST_PREDICTIONS = 10
# A constant 50% forecast scores Brier 0.25 on binary events; a model that cannot beat it has shown no skill.
UNINFORMATIVE_BRIER = 0.25
N_BOOTSTRAP = 200
BOOTSTRAP_SEED = 20261011
INTERVAL_METHOD = "bootstrap-p10-p90"

# --- Arabic limitation texts --------------------------------------------------------------------
LIM_VINTAGE = "القيم التاريخية المستخدمة في الاختبار الرجعي هي الإصدار الحالي من البيانات وليس ما كان متاحاً وقتها، ما قد يُحسّن النتائج ظاهرياً"
LIM_VINTAGE_REVISED = (
    "تتضمن السلسلة مراجعات تاريخية؛ استُخدم في الاختبار الرجعي الإصدار المتاح عند تاريخ القطع لكل الفترات "
    "وليس الإصدار الذي كان متاحاً عند كل نقطة اختبار، ما قد يُحسّن النتائج ظاهرياً"
)
LIM_POLITICAL = "النموذج إحصائي بحت ولا يأخذ الصدمات السياسية أو الأمنية في الحسبان"
LIM_ANNUAL = (
    "السلسلة سنوية: عدد المشاهدات قليل والفاصل بين التحديثات طويل، وقد تتغير الظروف الاقتصادية جذرياً خلال أفق التنبؤ "
    "كما أن آخر سنة قد تكون تقديراً أولياً قابلاً للمراجعة"
)
LIM_BASE_RATE = "النموذج المختار هو معدل التكرار التاريخي للحدث، أي أنه لا يستفيد من الحالة الراهنة للمؤشر"


def lim_small_sample(n_train: int, n_pred: int) -> str:
    return (
        f"عيّنة صغيرة: {n_train} مثالاً تاريخياً قابلاً للتدريب و{n_pred} تنبؤاً في الاختبار الرجعي؛ "
        "تقديرات الاحتمال ومقاييس المعايرة غير مستقرة وقد تتغير بوضوح عند إضافة مشاهدة جديدة"
    )


@dataclass
class ForecastResult:
    status: str  # complete | insufficient_data
    probability: float | None = None
    probability_interval: dict | None = None
    baseline_probability: float | None = None
    model_name: str | None = None
    model_version: str | None = None
    training_start: date | None = None
    training_end: date | None = None
    features: list[str] = field(default_factory=list)
    backtest: dict = field(default_factory=dict)
    limitations: list[str] = field(default_factory=list)
    scenario_analysis: str | None = None
    target_period_date: date | None = None
    gate_failures: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return to_jsonable(self.__dict__)


def _d(ts) -> date | None:
    return None if ts is None else pd.Timestamp(ts).date()


def _bootstrap_interval(ex: ExampleSet, model_name: str, x_now: pd.DataFrame, n: int = N_BOOTSTRAP, seed: int = BOOTSTRAP_SEED) -> dict:
    rng = np.random.default_rng(seed)
    m_ex = len(ex)
    preds = np.empty(n)
    for b in range(n):
        idx = rng.integers(0, m_ex, m_ex)
        m = make_model(model_name, ex.spec).fit(ex.X.iloc[idx], ex.y[idx])
        preds[b] = m.predict_proba(x_now)[0]
    lo, hi = np.percentile(preds, [10, 90])
    return {"low": round(float(lo), 4), "high": round(float(hi), 4), "method": INTERVAL_METHOD, "n_resamples": n, "seed": seed}


def compute_forecast(
    series: pd.DataFrame,
    spec: EventSpec,
    frequency: str,
    has_revisions: bool = False,
    min_train: int = DEFAULT_MIN_TRAIN,
    fallback_origin: Any = None,
) -> ForecastResult:
    """Pure computation (no DB): backtest candidate models, apply gates, produce the result.

    ``series`` must already be restricted to what was knowable at the data cutoff (series_as_of).
    """
    limitations: list[str] = [LIM_VINTAGE_REVISED if has_revisions else LIM_VINTAGE]
    reasons: list[str] = []
    n_obs = 0 if series is None else len(series)

    try:
        ex = build_examples(series, spec, frequency)
    except UnsupportedFrequency as e:
        ex = None
        reasons.append("تواتر السلسلة غير منتظم أو غير مدعوم في النموذج الإحصائي")
        log("unsupported_frequency", level="warning", detail=str(e))

    origin = ex.current_date if ex is not None and ex.current_date is not None else (pd.Timestamp(fallback_origin) if fallback_origin else None)
    target = None
    if origin is not None:
        try:
            target = _d(add_periods(origin, frequency, spec.horizon))
        except UnsupportedFrequency:
            target = None

    n_train = len(ex) if ex is not None else 0
    bt = rolling_origin_backtest(ex, min_train=min_train) if ex is not None and n_train > min_train else None
    n_pred = bt["n_predictions"] if bt else 0

    if n_obs == 0:
        reasons.append("لا توجد مشاهدات فعلية متاحة حتى تاريخ القطع")
    if ex is not None and n_train < MIN_TRAINING_EXAMPLES:
        reasons.append(f"عدد الأمثلة التاريخية القابلة للتدريب ({n_train}) أقل من الحد الأدنى المطلوب ({MIN_TRAINING_EXAMPLES})")
    if ex is not None and n_pred < MIN_BACKTEST_PREDICTIONS:
        reasons.append(f"عدد تنبؤات الاختبار الرجعي ({n_pred}) أقل من الحد الأدنى المطلوب ({MIN_BACKTEST_PREDICTIONS})")

    selected = None
    beats_base = None
    if bt and n_pred > 0 and ex is not None and ex.current_x is not None:
        eligible = [m for m in ranked_models(bt) if make_model(m, spec).can_predict(ex.current_x)]
        if eligible:
            selected = eligible[0]
            beats_base = bool(bt["brier"][selected] <= bt["brier"]["base_rate"] + 1e-12)
            if not beats_base:
                reasons.append("أفضل نموذج متاح لم يتفوّق على معدل التكرار التاريخي في الاختبار الرجعي")
            if bt["brier"][selected] >= UNINFORMATIVE_BRIER:
                reasons.append(
                    f"أفضل نموذج (Brier {bt['brier'][selected]:.3f}) لم يتفوّق على تنبؤ ثابت «نصف-نصف» (Brier {UNINFORMATIVE_BRIER}) في الاختبار الرجعي؛ لا مهارة تنبؤية مثبتة"
                )
        else:
            reasons.append("لا يمكن حساب خصائص الفترة الحالية")

    limitations.append(lim_small_sample(n_train, n_pred))
    limitations.append(LIM_POLITICAL)
    if frequency == "annual":
        limitations.append(LIM_ANNUAL)

    bt_json: dict = public_backtest(bt, selected) if bt else {"method": "rolling-origin expanding window", "min_train": min_train, "n_predictions": 0, "n_examples": n_train}
    bt_json.update(
        {
            "engine_version": MODEL_VERSION,
            "selected_model": selected,
            "n_training_examples": n_train,
            "n_observations": n_obs,
            "gates": {
                "min_training_examples": MIN_TRAINING_EXAMPLES,
                "min_backtest_predictions": MIN_BACKTEST_PREDICTIONS,
                "best_brier_le_base_rate": beats_base,
                "max_brier_uninformative": UNINFORMATIVE_BRIER,
                "passed": False,
            },
            "event_origin": {"period_date": _d(origin), "value": ex.current_value if ex is not None else None} if origin is not None else None,
            "current_features": to_jsonable(ex.current_x.to_dict()) if ex is not None and ex.current_x is not None else None,
            "event": {"event": spec.event, "threshold": spec.threshold, "horizon_periods": spec.horizon, "frequency": frequency},
        }
    )

    res = ForecastResult(
        status="insufficient_data",
        model_version=MODEL_VERSION,
        target_period_date=target,
        limitations=limitations,
        gate_failures=reasons,
    )
    if ex is not None and n_train:
        res.training_start = _d(ex.origin_dates[0])
        res.training_end = _d(ex.origin_dates[-1])

    if not reasons and selected is not None:
        x_now = ex.current_x.to_frame().T.astype(float)
        model = make_model(selected, spec).fit(ex.X, ex.y)
        p = float(model.predict_proba(x_now)[0])
        base = make_model("base_rate", spec).fit(ex.X, ex.y)
        res.status = "complete"
        res.model_name = selected
        res.probability = round(p, 4)
        res.baseline_probability = round(float(base.predict_proba(x_now)[0]), 4)
        res.probability_interval = _bootstrap_interval(ex, selected, x_now)
        res.features = list(model.used_features)
        bt_json["gates"]["passed"] = True
        if selected == "base_rate":
            res.limitations.append(LIM_BASE_RATE)
    else:
        res.model_name = None
        res.model_version = None
        res.scenario_analysis = build_scenario_text(series, spec, frequency, reasons, labels=ex.y if ex is not None else None)
    bt_json["gate_failures"] = reasons
    res.backtest = to_jsonable(bt_json)
    return res


# ---------------------------------------------------------------------------------------------
# DB worker
# ---------------------------------------------------------------------------------------------


def _claim_next(conn, ids: list[str] | None) -> dict | None:
    sql = "SELECT id::text AS id FROM forecasts WHERE status = 'pending'"
    params: list[Any] = []
    if ids:
        sql += " AND id = ANY(%s::uuid[])"
        params.append(ids)
    sql += " ORDER BY created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED"
    with conn.cursor() as cur:
        cur.execute(sql, params)
        r = cur.fetchone()
        if not r:
            conn.commit()
            return None
        fid = r[0] if not isinstance(r, dict) else r["id"]
        cur.execute(
            """UPDATE forecasts SET status = 'running', error_message = NULL WHERE id = %s
               RETURNING id::text, event_definition, target_indicator_id::text, horizon_periods, data_cutoff""",
            (fid,),
        )
        row = cur.fetchone()
        cols = [c.name for c in cur.description]
    conn.commit()
    return dict(zip(cols, row)) if not isinstance(row, dict) else row


def _write_result(conn, fid: str, r: ForecastResult) -> None:
    from psycopg.types.json import Jsonb

    with conn.cursor() as cur:
        cur.execute(
            """UPDATE forecasts SET status = %s, model_name = %s, model_version = %s, training_start = %s, training_end = %s,
                      features = %s, probability = %s, probability_interval = %s, baseline_probability = %s, backtest = %s,
                      limitations = %s, scenario_analysis = %s, target_period_date = %s, error_message = NULL
                WHERE id = %s""",
            (
                r.status,
                r.model_name,
                r.model_version,
                r.training_start,
                r.training_end,
                Jsonb(to_jsonable(r.features)),
                r.probability,
                Jsonb(to_jsonable(r.probability_interval)) if r.probability_interval else None,
                r.baseline_probability,
                Jsonb(to_jsonable(r.backtest)),
                list(r.limitations),
                r.scenario_analysis,
                r.target_period_date,
                fid,
            ),
        )


def run_forecast_row(conn, row: dict) -> ForecastResult:
    from .data import get_indicator, load_series

    ev = row["event_definition"]
    if isinstance(ev, str):
        ev = json.loads(ev)
    indicator_id = row.get("target_indicator_id") or ev.get("indicator_id")
    if not indicator_id:
        raise ValueError("forecast has no target indicator")
    ind = get_indicator(conn, indicator_id)
    if ind is None:
        raise ValueError(f"indicator {indicator_id} not found")
    spec = EventSpec.from_definition(ev, horizon=row.get("horizon_periods"))
    series, revised = load_series(conn, ind.id, row["data_cutoff"])
    return compute_forecast(series, spec, ind.frequency or ev.get("frequency"), has_revisions=revised, fallback_origin=ev.get("last_observed_period"))


def process_pending(conn, limit: int = 20, ids: list[str] | None = None) -> list[dict]:
    """Process up to ``limit`` pending forecasts, oldest first. Returns a summary per forecast."""
    done: list[dict] = []
    for _ in range(limit):
        row = _claim_next(conn, ids)
        if row is None:
            break
        fid = row["id"]
        log("forecast_started", forecast_id=fid, data_cutoff=row["data_cutoff"])
        try:
            res = run_forecast_row(conn, row)
            _write_result(conn, fid, res)
            conn.commit()
            summary = {
                "forecast_id": fid,
                "status": res.status,
                "model": res.model_name,
                "probability": res.probability,
                "baseline_probability": res.baseline_probability,
                "n_backtest": res.backtest.get("n_predictions"),
                "gate_failures": res.gate_failures,
            }
            log("forecast_finished", **summary)
            done.append(summary)
        except Exception as e:  # noqa: BLE001 — any failure marks the forecast failed
            conn.rollback()
            msg = f"{type(e).__name__}: {e}"
            with conn.cursor() as cur:
                cur.execute("UPDATE forecasts SET status = 'failed', error_message = %s WHERE id = %s", (msg[:2000], fid))
            conn.commit()
            log("forecast_failed", level="error", forecast_id=fid, error=msg, trace=traceback.format_exc(limit=3))
            done.append({"forecast_id": fid, "status": "failed", "error": msg})
    return done
