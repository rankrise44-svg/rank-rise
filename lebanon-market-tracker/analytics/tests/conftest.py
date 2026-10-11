import os
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _env_from_files(key: str) -> str | None:
    """Read a single key from .env.local / .env (without exporting anything else)."""
    for name in (".env.local", ".env"):
        f = REPO_ROOT / name
        if not f.exists():
            continue
        for line in f.read_text().splitlines():
            line = line.strip()
            if line.startswith("export "):
                line = line[7:]
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


@pytest.fixture(scope="session")
def test_db_url() -> str | None:
    return os.environ.get("DATABASE_URL_TEST") or _env_from_files("DATABASE_URL_TEST")


def make_series(values, start_year: int = 1980) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "period_date": pd.to_datetime([f"{start_year + i}-01-01" for i in range(len(values))]),
            "value": np.asarray(values, dtype=float),
            "period_label": [str(start_year + i) for i in range(len(values))],
        }
    )
