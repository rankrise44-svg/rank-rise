"""End-to-end against DATABASE_URL_TEST: process a pending forecast, then resolve it.

Creates its own source / indicator / observations / forecast and deletes all of them at the end.
Skipped when the test database is not reachable.
"""

import json
import uuid
from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

psycopg = pytest.importorskip("psycopg")

from lmt_analytics.engine import process_pending  # noqa: E402
from lmt_analytics.resolve import resolve_outcomes  # noqa: E402


@pytest.fixture()
def conn(test_db_url):
    if not test_db_url:
        pytest.skip("DATABASE_URL_TEST not set")
    try:
        c = psycopg.connect(test_db_url, connect_timeout=3, autocommit=False)
    except Exception as e:  # noqa: BLE001
        pytest.skip(f"test database unreachable: {e}")
    yield c
    c.close()


def test_process_pending_then_resolve(conn):
    tag = uuid.uuid4().hex[:10]
    source_id = indicator_id = forecast_id = None
    rng = np.random.default_rng(42)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO sources (key, connector, name, source_type, provenance)
                   VALUES (%s, 'manual', %s, 'api', 'official') RETURNING id::text""",
                (f"pytest-analytics-{tag}", f"pytest analytics {tag}"),
            )
            source_id = cur.fetchone()[0]
            code = f"PYTEST_AR1_{tag}"
            cur.execute(
                """INSERT INTO economic_indicators (source_id, code, country_code, name_en, frequency, unit)
                   VALUES (%s, %s, 'LBN', 'pytest synthetic AR(1)', 'annual', 'index') RETURNING id::text""",
                (source_id, code),
            )
            indicator_id = cur.fetchone()[0]
            # 40 annual observations 1980..2019, all collected 2020-06-01
            y, mu = 5.0, 5.0
            values = []
            for i in range(40):
                y = mu + 0.5 * (y - mu) + rng.normal(0, 1.0)
                values.append(round(float(y), 4))
            for i, v in enumerate(values):
                year = 1980 + i
                cur.execute(
                    """INSERT INTO indicator_observations (indicator_id, source_id, period_date, period_label, value,
                                 observed_at, collected_at, is_current)
                       VALUES (%s, %s, %s, %s, %s, %s, '2020-06-01T00:00:00Z', true)""",
                    (indicator_id, source_id, f"{year}-01-01", str(year), v, f"{year}-12-31T23:59:59Z"),
                )
            # a projection for 2020 that must be ignored by the engine
            cur.execute(
                """INSERT INTO indicator_observations (indicator_id, source_id, period_date, period_label, value,
                             observed_at, collected_at, is_current, is_projection)
                   VALUES (%s, %s, '2020-01-01', '2020', 999, '2020-12-31T23:59:59Z', '2020-06-01T00:00:00Z', true, true)""",
                (indicator_id, source_id),
            )
            ev = {
                "indicator_id": indicator_id,
                "code": code,
                "country": "LBN",
                "event": "increase",
                "threshold": None,
                "horizon_periods": 1,
                "frequency": "annual",
                "last_observed_period": "2019-01-01",
            }
            cur.execute(
                """INSERT INTO forecasts (question, event_definition, target_indicator_id, horizon_periods, data_cutoff, requested_via)
                   VALUES ('pytest question', %s, %s, 1, '2020-07-01T00:00:00Z', 'pytest') RETURNING id::text""",
                (json.dumps(ev), indicator_id),
            )
            forecast_id = cur.fetchone()[0]
        conn.commit()

        out = process_pending(conn, ids=[forecast_id])
        assert [o["forecast_id"] for o in out] == [forecast_id]

        with conn.cursor() as cur:
            cur.execute(
                """SELECT status, probability::float8, baseline_probability::float8, model_name, model_version,
                          training_start::text, training_end::text, target_period_date::text, backtest, limitations,
                          probability_interval, features, error_message
                     FROM forecasts WHERE id = %s""",
                (forecast_id,),
            )
            (status, p, base_p, model, version, t0, t1, target, backtest, limitations, interval, features, err) = cur.fetchone()
        assert err is None
        assert status == "complete"
        assert 0 < p < 1 and 0 < base_p < 1
        assert model in ("base_rate", "persistence", "logistic") and version == "1.0.0"
        assert target == "2020-01-01"
        assert t0 == "1982-01-01" and t1 == "2018-01-01"
        assert backtest["n_predictions"] >= 10 and backtest["event_origin"]["value"] == values[-1]
        assert interval["method"] == "bootstrap-p10-p90"
        assert isinstance(features, list)
        assert any("الصدمات السياسية" in x for x in limitations)

        # not observable yet -> nothing resolved
        assert resolve_outcomes(conn, ids=[forecast_id]) == []

        # the 2020 actual arrives after the cutoff
        actual = values[-1] + 1.0
        arrival = datetime.now(timezone.utc) - timedelta(minutes=1)
        with conn.cursor() as cur:
            # the actual replaces the projection vintage for 2020 (revision mechanics of the app)
            cur.execute(
                """UPDATE indicator_observations SET is_current = false, superseded_at = %s
                    WHERE indicator_id = %s AND period_date = '2020-01-01' AND is_current""",
                (arrival, indicator_id),
            )
            cur.execute(
                """INSERT INTO indicator_observations (indicator_id, source_id, period_date, period_label, value,
                             observed_at, collected_at, is_current)
                   VALUES (%s, %s, '2020-01-01', '2020', %s, '2020-12-31T23:59:59Z', %s, true)""",
                (indicator_id, source_id, actual, arrival),
            )
        conn.commit()
        resolved = resolve_outcomes(conn, ids=[forecast_id])
        assert len(resolved) == 1
        with conn.cursor() as cur:
            cur.execute(
                "SELECT outcome, observed_value::float8, brier_score::float8, baseline_brier::float8, observation_id FROM forecast_outcomes WHERE forecast_id = %s",
                (forecast_id,),
            )
            outcome, observed, brier, base_brier, obs_id = cur.fetchone()
        assert outcome is True
        assert observed == pytest.approx(actual)
        assert brier == pytest.approx((p - 1.0) ** 2)
        assert base_brier == pytest.approx((base_p - 1.0) ** 2)
        assert obs_id is not None
        # idempotent
        assert resolve_outcomes(conn, ids=[forecast_id]) == []
    finally:
        conn.rollback()
        with conn.cursor() as cur:
            if forecast_id:
                cur.execute("DELETE FROM forecasts WHERE id = %s", (forecast_id,))  # outcomes cascade
            if source_id:
                cur.execute("DELETE FROM sources WHERE id = %s", (source_id,))  # indicator + observations cascade
        conn.commit()
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM sources WHERE key = %s", (f"pytest-analytics-{tag}",))
            assert cur.fetchone()[0] == 0


def test_unknown_indicator_marks_forecast_failed(conn):
    fid = None
    try:
        ev = {"indicator_id": str(uuid.uuid4()), "code": "NOPE", "country": "LBN", "event": "increase", "threshold": None,
              "horizon_periods": 1, "frequency": "annual", "last_observed_period": "2019-01-01"}
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO forecasts (question, event_definition, horizon_periods, data_cutoff, requested_via)
                   VALUES ('pytest failing question', %s, 1, now(), 'pytest') RETURNING id::text""",
                (json.dumps(ev),),
            )
            fid = cur.fetchone()[0]
        conn.commit()
        out = process_pending(conn, ids=[fid])
        assert out[0]["status"] == "failed"
        with conn.cursor() as cur:
            cur.execute("SELECT status, error_message, probability FROM forecasts WHERE id = %s", (fid,))
            status, err, p = cur.fetchone()
        assert status == "failed" and "not found" in err and p is None
    finally:
        conn.rollback()
        if fid:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM forecasts WHERE id = %s", (fid,))
            conn.commit()
