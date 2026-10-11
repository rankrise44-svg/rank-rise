"""Qualitative Arabic scenario analysis — used when no numeric probability is justified.

The text describes the data (last value, recent trend, volatility of changes, how common the
event has been historically) as base / upside / downside scenarios. It deliberately contains NO
numeric probability and no percent signs.
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd

from .events import EventSpec
from .periods import PERIOD_WORD_AR, UnsupportedFrequency, period_positions

EVENT_AR = {
    "above_threshold": "أن تتجاوز القيمة العتبة",
    "below_threshold": "أن تنخفض القيمة دون العتبة",
    "increase": "أن ترتفع القيمة مقارنةً بآخر قيمة",
    "decrease": "أن تنخفض القيمة مقارنةً بآخر قيمة",
}


def fmt_num(x: float | None) -> str:
    if x is None or not math.isfinite(float(x)):
        return "غير متاح"
    x = float(x)
    if abs(x) >= 1000:
        s = f"{x:,.0f}"
    elif abs(x) >= 1:
        s = f"{x:,.2f}".rstrip("0").rstrip(".")
    else:
        s = f"{x:.4g}"
    return s.replace("%", "")


def consecutive_changes(series: pd.DataFrame, frequency: str) -> np.ndarray:
    """Changes between calendar-consecutive periods only (a gap in the series is not a one-period change)."""
    vals = series["value"].astype(float).to_numpy()
    d = np.diff(vals)
    try:
        pos = period_positions(list(series["period_date"]), frequency)
    except UnsupportedFrequency:
        return d
    return d[np.diff(pos) == 1]


def _frequency_word(rate: float) -> str:
    if rate < 0.15:
        return "نادراً"
    if rate < 0.4:
        return "أحياناً، لكن في أقلية من الحالات"
    if rate <= 0.6:
        return "في قرابة نصف الحالات"
    if rate < 0.85:
        return "في معظم الحالات"
    return "في كل الحالات تقريباً"


def _period_label(series: pd.DataFrame) -> str:
    last = series.iloc[-1]
    lab = last.get("period_label") if hasattr(last, "get") else None
    if lab is None or (isinstance(lab, float) and math.isnan(lab)):
        return pd.Timestamp(last["period_date"]).date().isoformat()
    return str(lab)


def _relation(spec: EventSpec, value: float, last: float) -> str:
    if spec.event == "above_threshold":
        return "وتكون القيمة في هذه الحالة أعلى من العتبة" if value > spec.threshold else "وتبقى القيمة في هذه الحالة دون العتبة أو عندها"
    if spec.event == "below_threshold":
        return "وتكون القيمة في هذه الحالة دون العتبة" if value < spec.threshold else "وتبقى القيمة في هذه الحالة عند العتبة أو فوقها"
    if value > last:
        return "أي أعلى من آخر قيمة"
    if value < last:
        return "أي أدنى من آخر قيمة"
    return "أي قريبة جداً من آخر قيمة"


def build_scenario_text(
    series: pd.DataFrame,
    spec: EventSpec,
    frequency: str,
    reasons: list[str],
    labels: np.ndarray | None = None,
) -> str:
    unit = PERIOD_WORD_AR.get(frequency, "فترة")
    h = spec.horizon
    lines: list[str] = ["تحليل سيناريوهات نوعي (من دون احتمالية رقمية)."]
    if reasons:
        lines.append("سبب عدم نشر احتمالية: " + "؛ ".join(reasons) + ".")

    if series is None or len(series) == 0:
        lines.append("لا تتوفر أي مشاهدات فعلية لهذا المؤشر حتى تاريخ القطع، لذلك لا يمكن وصف المسار أو بناء سيناريوهات مبنية على البيانات.")
        return "\n".join(lines)

    vals = series["value"].astype(float).to_numpy()
    last = float(vals[-1])
    lines.append(f"آخر قيمة متاحة: {fmt_num(last)} (الفترة {_period_label(series)})، وعدد المشاهدات المتاحة {len(vals)}.")
    if spec.is_threshold:
        side = "أعلى من" if last > spec.threshold else ("أدنى من" if last < spec.threshold else "مساوية لـ")
        lines.append(f"القيمة الحالية {side} العتبة المحددة ({fmt_num(spec.threshold)}).")

    changes = consecutive_changes(series, frequency)
    trend = None
    std = None
    if len(changes) >= 1:
        recent = changes[-3:]
        trend = float(np.mean(recent))
        std = float(np.std(changes, ddof=1)) if len(changes) >= 2 else None
        scale = std if std else abs(trend)
        if scale and abs(trend) < 0.25 * scale:
            tdesc = "مستقر نسبياً"
        elif trend > 0:
            tdesc = "صاعد"
        elif trend < 0:
            tdesc = "هابط"
        else:
            tdesc = "مستقر"
        basis = "آخر تغيّر بين فترتين متتاليتين" if len(recent) == 1 else f"متوسط آخر {len(recent)} تغيّرات بين فترات متتالية"
        lines.append(f"الاتجاه الأخير ({basis}): {tdesc}، بتغيّر قدره {fmt_num(trend)} لكل {unit}.")
    else:
        lines.append("لا تتوفر فترتان متتاليتان لحساب التغيّر، لذا لا يمكن تحديد اتجاه.")

    if std is not None and std > 0:
        level = float(np.mean(np.abs(vals))) or 1.0
        ratio = std / level
        vdesc = "مرتفع" if ratio > 0.5 else ("متوسط" if ratio > 0.15 else "منخفض")
        lines.append(f"التذبذب التاريخي للتغيّرات {vdesc} (الانحراف المعياري للتغيّر بين فترتين متتاليتين نحو {fmt_num(std)}).")
    elif len(changes) == 1:
        lines.append("تتوفر مشاهدة تغيّر واحدة فقط، لذا لا يمكن تقدير التذبذب التاريخي.")

    if labels is not None and len(labels) >= 3:
        lines.append(
            f"تاريخياً، وبأفق {h} {unit}، حدث هذا النوع من الأحداث ({EVENT_AR[spec.event]}) {_frequency_word(float(np.mean(labels)))} "
            f"ضمن عيّنة صغيرة من {len(labels)} حالة لا تكفي لاستخلاص احتمالية موثوقة."
        )
    else:
        lines.append("لا تتوفر حالات تاريخية كافية لمعرفة مدى تكرار هذا الحدث في الماضي.")

    lines.append("السيناريوهات:")
    if trend is not None and std is not None and std > 0:
        base = last + h * trend
        spread = math.sqrt(h) * std
        up, down = base + spread, base - spread
        lines.append(f"- السيناريو الأساسي: استمرار المسار الأخير، فتقترب القيمة بعد {h} {unit} من {fmt_num(base)} {_relation(spec, base, last)}.")
        lines.append(f"- السيناريو الصعودي: تسارع بمقدار تذبذب معتاد واحد، فتقترب القيمة من {fmt_num(up)} {_relation(spec, up, last)}.")
        lines.append(f"- السيناريو الهبوطي: تراجع بمقدار تذبذب معتاد واحد، فتقترب القيمة من {fmt_num(down)} {_relation(spec, down, last)}.")
    elif trend is not None:
        base = last + h * trend
        lines.append(
            f"- السيناريو الأساسي: استمرار آخر تغيّر مرصود، فتقترب القيمة بعد {h} {unit} من {fmt_num(base)} {_relation(spec, base, last)}، "
            "مع التنبيه إلى أن تغيّراً واحداً لا يكفي لتأكيد اتجاه."
        )
    else:
        lines.append(f"- السيناريو الأساسي: بقاء القيمة قريبة من آخر مستوى ({fmt_num(last)}) في غياب معلومات عن الاتجاه.")
    if not (trend is not None and std is not None and std > 0):
        lines.append("- السيناريو الصعودي: ارتفاع القيمة إذا ظهرت عوامل دافعة للصعود أو صدمة جديدة.")
        lines.append("- السيناريو الهبوطي: تراجع القيمة إذا ظهرت عوامل ضاغطة نحو الانخفاض.")
    lines.append(
        "هذه سيناريوهات وصفية مبنية على البيانات التاريخية فقط، وليست تنبؤاً احتمالياً، ولا تأخذ في الحسبان الصدمات السياسية أو الأمنية أو قرارات السياسة النقدية المقبلة."
    )
    return "\n".join(lines)
