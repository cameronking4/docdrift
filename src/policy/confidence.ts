import { Signal } from "../model/types";

const tierWeight: Record<number, number> = {
  0: 1,
  1: 0.9,
  2: 0.6,
  3: 0.35
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function scoreSignals(signals: Signal[]): number {
  if (!signals.length) {
    return 0;
  }

  let complement = 1;
  for (const signal of signals) {
    const weight = tierWeight[signal.tier] ?? 0.3;
    const weighted = clamp01(signal.confidence * weight);
    complement *= 1 - weighted;
  }

  return clamp01(1 - complement);
}

export function combineWithDevinPlan(detectorConfidence: number, devinPlanConfidence?: number): number {
  if (typeof devinPlanConfidence !== "number") {
    return detectorConfidence;
  }

  return clamp01(detectorConfidence * 0.65 + devinPlanConfidence * 0.35);
}
