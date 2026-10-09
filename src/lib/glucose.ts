import { formatNumber } from "@/lib/format";

export type GlucoseUnit = "G_L" | "MG_DL";
export type Outcome = "TOO_MUCH" | "PERFECT" | "NOT_ENOUGH";

export const GLUCOSE_UNIT_LABEL: Record<GlucoseUnit, string> = { G_L: "g/L", MG_DL: "mg/dL" };

/** Plausible readings, in g/L (glucometers read roughly 0.2–6 g/L). */
export const GLUCOSE_MIN_GL = 0.2;
export const GLUCOSE_MAX_GL = 6;

/** Readings are stored in g/L; this converts for display. */
export function toUnit(gPerL: number, unit: GlucoseUnit): number {
  return unit === "MG_DL" ? Math.round(gPerL * 100) : Math.round(gPerL * 100) / 100;
}

/** Converts what she typed in her unit back to g/L. */
export function fromUnit(value: number, unit: GlucoseUnit): number {
  return unit === "MG_DL" ? value / 100 : value;
}

export function formatGlucose(gPerL: number, unit: GlucoseUnit): string {
  const value = toUnit(gPerL, unit);
  return `${formatNumber(value, unit === "MG_DL" ? 0 : 2)} ${GLUCOSE_UNIT_LABEL[unit]}`;
}

export type GlucoseReadings = {
  after?: number | null;
  low?: number | null;
  high?: number | null;
  hypoTreated?: boolean | null;
};

export type GlucoseThresholds = { hypo: number; high: number };

/**
 * Most likely outcome from readings after the meal (all in g/L). Returns null
 * when nothing was measured; she always has the final say.
 */
export function suggestOutcome(
  readings: GlucoseReadings,
  thresholds: GlucoseThresholds,
): Outcome | null {
  const values = [readings.after, readings.low, readings.high].filter(
    (value): value is number => typeof value === "number",
  );
  if (readings.hypoTreated) return "TOO_MUCH";
  if (values.length === 0) return null;
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  if (lowest < thresholds.hypo) return "TOO_MUCH";
  if (highest > thresholds.high) return "NOT_ENOUGH";
  return "PERFECT";
}
