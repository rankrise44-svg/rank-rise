"""Structured JSON log lines on stdout."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from typing import Any

from .jsonutil import to_jsonable


def log(event: str, level: str = "info", **fields: Any) -> None:
    rec = {"ts": datetime.now(timezone.utc).isoformat(timespec="seconds"), "level": level, "event": event}
    rec.update(fields)
    sys.stdout.write(json.dumps(to_jsonable(rec), ensure_ascii=False, allow_nan=False) + "\n")
    sys.stdout.flush()
