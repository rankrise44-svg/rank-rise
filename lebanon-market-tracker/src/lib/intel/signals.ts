/**
 * Statistical helpers for trend signals. Coverage-volume signals measure how much is being
 * written about a subject — not the economic magnitude of what happened.
 */
export type VolumeSignal = {
  current: number;
  baseline: number; // expected count for the current window
  changePct: number | null;
  zscore: number;
  direction: "up" | "down" | "flat";
  significance: "low" | "medium" | "high";
};

/** Poisson z-score of the current window count against the average of previous windows. */
export function volumeSignal(current: number, previousWindows: number[]): VolumeSignal {
  const baseline = previousWindows.length ? previousWindows.reduce((a, b) => a + b, 0) / previousWindows.length : 0;
  const lambda = Math.max(baseline, 0.5);
  const z = (current - lambda) / Math.sqrt(lambda);
  const changePct = baseline > 0 ? ((current - baseline) / baseline) * 100 : null;
  const direction = Math.abs(z) < 1 ? "flat" : z > 0 ? "up" : "down";
  const enough = current + baseline >= 5 && previousWindows.length >= 2;
  const significance = !enough ? "low" : Math.abs(z) >= 3 ? "high" : Math.abs(z) >= 2 ? "medium" : "low";
  return { current, baseline: Math.round(baseline * 100) / 100, changePct: changePct === null ? null : Math.round(changePct * 10) / 10, zscore: Math.round(z * 100) / 100, direction, significance };
}

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

export function stdev(xs: number[]) {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** Compares the latest change in a series with the distribution of its historical changes. */
export function changeSignal(values: number[]): { change: number; changePct: number | null; zscore: number | null; direction: "up" | "down" | "flat"; significance: "low" | "medium" | "high" } | null {
  if (values.length < 2) return null;
  const diffs = values.slice(1).map((v, i) => v - values[i]);
  const last = diffs[diffs.length - 1];
  const prev = values[values.length - 2];
  const hist = diffs.slice(0, -1);
  const sd = stdev(hist);
  const z = Number.isFinite(sd) && sd > 0 ? (last - mean(hist)) / sd : null;
  const changePct = prev !== 0 ? (last / Math.abs(prev)) * 100 : null;
  const direction = last === 0 ? "flat" : last > 0 ? "up" : "down";
  const significance = z === null || hist.length < 5 ? "low" : Math.abs(z) >= 2.5 ? "high" : Math.abs(z) >= 1.5 ? "medium" : "low";
  return { change: last, changePct: changePct === null ? null : Math.round(changePct * 100) / 100, zscore: z === null ? null : Math.round(z * 100) / 100, direction, significance };
}
