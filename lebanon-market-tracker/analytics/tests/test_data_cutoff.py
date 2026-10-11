import pandas as pd

from lmt_analytics.data import has_revisions, series_as_of

UTC = "UTC"


def row(period, value, collected, superseded=None, projection=False, synthetic=False, observed=None, oid=None):
    year = int(period[:4])
    return {
        "observation_id": oid or f"{period}-{collected}",
        "period_date": pd.Timestamp(period),
        "period_label": str(year),
        "value": value,
        "is_projection": projection,
        "is_synthetic": synthetic,
        "observed_at": pd.Timestamp(observed or f"{year}-12-31T23:59:59Z"),
        "collected_at": pd.Timestamp(collected),
        "superseded_at": pd.Timestamp(superseded) if superseded else pd.NaT,
    }


def raw_frame():
    return pd.DataFrame(
        [
            row("2016-01-01", None, "2017-02-01T00:00:00Z"),  # provider-missing value
            row("2017-01-01", 7.0, "2018-02-01T00:00:00Z", synthetic=True),  # synthetic
            row("2018-01-01", 1.0, "2019-02-01T00:00:00Z"),
            # 2019: first vintage, revised on 2020-06-01
            row("2019-01-01", 2.0, "2020-02-01T00:00:00Z", superseded="2020-06-01T00:00:00Z", oid="v1"),
            row("2019-01-01", 2.5, "2020-06-01T00:00:00Z", oid="v2"),
            # 2020: a row collected before its period ended (observed_at in the future at collection)
            row("2020-01-01", 3.0, "2020-05-01T00:00:00Z", oid="early"),
            # 2021 projection collected early
            row("2021-01-01", 4.0, "2020-01-01T00:00:00Z", projection=True),
        ]
    )


def test_excludes_synthetic_projection_null_and_unfinished_periods():
    s = series_as_of(raw_frame(), "2020-07-01T00:00:00Z")
    assert list(s["period_date"].dt.year) == [2018, 2019]
    assert s["value"].notna().all()


def test_revised_value_uses_vintage_valid_at_cutoff():
    before = series_as_of(raw_frame(), "2020-03-01T00:00:00Z")
    after = series_as_of(raw_frame(), "2020-07-01T00:00:00Z")
    assert before.set_index(before["period_date"].dt.year).loc[2019, "value"] == 2.0
    assert before.set_index(before["period_date"].dt.year).loc[2019, "observation_id"] == "v1"
    assert after.set_index(after["period_date"].dt.year).loc[2019, "value"] == 2.5
    assert after.set_index(after["period_date"].dt.year).loc[2019, "observation_id"] == "v2"


def test_rows_collected_after_cutoff_are_excluded():
    s = series_as_of(raw_frame(), "2019-03-01T00:00:00Z")
    assert list(s["period_date"].dt.year) == [2018]
    # exactly at the cutoff is allowed (collected_at <= cutoff)
    s2 = series_as_of(raw_frame(), "2019-02-01T00:00:00Z")
    assert list(s2["period_date"].dt.year) == [2018]
    assert len(series_as_of(raw_frame(), "2019-01-31T23:59:59Z")) == 0


def test_observed_at_after_cutoff_is_excluded_even_if_collected_before():
    s = series_as_of(raw_frame(), "2020-12-30T00:00:00Z")
    assert 2020 not in set(s["period_date"].dt.year)
    s = series_as_of(raw_frame(), "2021-01-01T00:00:00Z")
    assert 2020 in set(s["period_date"].dt.year)


def test_superseded_vintage_excluded_after_supersession():
    s = series_as_of(raw_frame(), "2030-01-01T00:00:00Z")
    assert "v1" not in set(s["observation_id"])
    assert s["period_date"].is_unique


def test_naive_cutoff_treated_as_utc_and_has_revisions():
    s = series_as_of(raw_frame(), "2020-07-01")
    assert list(s["period_date"].dt.year) == [2018, 2019]
    assert has_revisions(raw_frame())
    assert not has_revisions(raw_frame().query("observation_id != 'v1'"))


def test_empty_input():
    assert series_as_of(pd.DataFrame(), "2020-01-01").empty
