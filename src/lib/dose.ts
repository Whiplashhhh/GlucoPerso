/** Rounds to the pen increment (0.5 U or 1 U), avoiding float noise. */
export function roundToIncrement(units: number, increment: number): number {
  const steps = Math.round(units / increment);
  return Math.round(steps * increment * 1000) / 1000;
}

export type DoseHint = { exact: number; rounded: number };

/**
 * Indicative meal dose: carbs / ratio, rounded to the pen increment.
 * Returns null when there is nothing meaningful to compute.
 */
export function doseHint(carbs: number, gramsPerUnit: number, increment: number): DoseHint | null {
  if (!(carbs > 0) || !(gramsPerUnit > 0) || !(increment > 0)) return null;
  const exact = carbs / gramsPerUnit;
  return { exact, rounded: roundToIncrement(exact, increment) };
}

/** Bolus that covered the carbs: injected units minus the correction part. */
export function mealBolus(insulinUnits: number, correctionUnits: number): number {
  return Math.max(0, insulinUnits - correctionUnits);
}
