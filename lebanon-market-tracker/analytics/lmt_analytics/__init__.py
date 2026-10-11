"""Lebanon Market Tracker — statistical forecasting engine.

Computes calibrated event probabilities for well-defined questions about economic
indicator series, with strict data-cutoff (no look-ahead) guarantees, rolling-origin
backtests and validation gates. When the gates fail it produces a qualitative Arabic
scenario analysis instead of a number.
"""

__version__ = "1.0.0"
MODEL_VERSION = __version__
