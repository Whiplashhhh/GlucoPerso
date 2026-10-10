import { ageInDays, recencyWeight, type EvaluatedMeal } from "./eligibility";
import type { Outcome, RatioBounds, Signal } from "./types";

/** The direction is read on this many most recent eligible meals. */
export const RECENT_MEALS = 5;
/** Meals needed in the same direction for a clear majority. */
export const MIN_SAME_DIRECTION = 3;
/** Meals allowed in the opposite direction among the recent ones. */
export const MAX_OPPOSITE = 1;
/** A suggestion never moves the ratio by more than this share of its value. */
export const MAX_CHANGE = 0.1;
/** Suggested ratios are multiples of this many grams. */
export const RATIO_STEP = 0.5;
export const DEFAULT_BOUNDS: RatioBounds = { min: 3, max: 50 };

/**
 * Soft bounds per outcome: a meal with too much insulin means the true ratio is
 * larger than its effective ratio (about 10 % larger), not enough means smaller.
 */
export const OUTCOME_FACTOR: Record<Outcome, number> = {
  TOO_MUCH: 1.1,
  PERFECT: 1,
  NOT_ENOUGH: 0.9,
};

export type DetectedSignal = { signal: Signal; mealIds: string[]; count: number; total: number };

const OPPOSITE: Record<Signal, Signal> = { TOO_MUCH: "NOT_ENOUGH", NOT_ENOUGH: "TOO_MUCH" };

/**
 * A clear and recent majority among `recent` (eligible meals, newest first, at
 * most RECENT_MEALS): at least 3 in one direction, beating the other one, which
 * has at most 1 meal. So 3/3, 3/4, 4/5 or 3/5 with one opposite qualify.
 */
export function detectSignal(recent: EvaluatedMeal[]): DetectedSignal | null {
  for (const signal of ["TOO_MUCH", "NOT_ENOUGH"] as const) {
    const same = recent.filter(({ outcome }) => outcome === signal);
    const opposite = recent.filter(({ outcome }) => outcome === OPPOSITE[signal]).length;
    if (same.length >= MIN_SAME_DIRECTION && same.length > opposite && opposite <= MAX_OPPOSITE) {
      return {
        signal,
        mealIds: same.map(({ meal }) => meal.id),
        count: same.length,
        total: recent.length,
      };
    }
  }
  return null;
}

/** Recency-weighted estimate of the true ratio; expects at least one meal. */
export function weightedEstimate(meals: EvaluatedMeal[], now: Date): number {
  let sum = 0;
  let weights = 0;
  for (const { meal, ratio, outcome } of meals) {
    const weight = recencyWeight(ageInDays(meal, now));
    sum += weight * ratio * OUTCOME_FACTOR[outcome];
    weights += weight;
  }
  return sum / weights;
}

/** Rounds `value` to a multiple of `step`, toward `current` (never past the value). */
export function roundTowards(value: number, current: number, step = RATIO_STEP): number {
  // Drop floating noise (10 × 1.1 = 11.000000000000002) before flooring.
  const steps = Math.round((value / step) * 1e9) / 1e9;
  return (value > current ? Math.floor(steps) : Math.ceil(steps)) * step;
}

/**
 * Suggested ratio for `signal`, or null when it would not change anything.
 *
 * 1. Start from the weighted estimate.
 * 2. Keep it on the signalled side: when the estimate disagrees with the recent
 *    majority, nudge by one step only.
 * 3. Cap the change to ±10 % of the current ratio.
 * 4. Round to 0.5 g toward the current ratio, so the cap is never exceeded.
 * 5. Clamp to the absolute bounds.
 */
export function targetRatio(
  current: number,
  signal: Signal,
  estimate: number,
  bounds: RatioBounds = DEFAULT_BOUNDS,
): number | null {
  const up = signal === "TOO_MUCH";
  // At least one step in the signalled direction, so stronger evidence can
  // never produce "no suggestion" where weaker evidence produces one.
  let target = up
    ? Math.max(estimate, current + RATIO_STEP)
    : Math.min(estimate, current - RATIO_STEP);
  const limit = current * MAX_CHANGE;
  target = up ? Math.min(target, current + limit) : Math.max(target, current - limit);
  target = roundTowards(target, current);
  target = Math.min(bounds.max, Math.max(bounds.min, target));
  // Rounding may land back on the current ratio, clamping may even cross it.
  return (up ? target > current : target < current) ? target : null;
}
