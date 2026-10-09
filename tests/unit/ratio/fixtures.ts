import { DAY_MS, evaluate, type EvaluatedMeal } from "@/lib/ratio";
import type { Outcome, RatioMeal } from "@/lib/ratio";

export const NOW = new Date("2026-10-10T19:00:00Z");

export function daysAgo(days: number, now: Date = NOW): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

let counter = 0;

/** A dinner of 60 g with 5 U (effective ratio 12), evaluated PERFECT, eaten 1 day ago. */
export function meal(overrides: Partial<RatioMeal> = {}): RatioMeal {
  counter += 1;
  return {
    id: `meal-${counter}`,
    name: "Pâtes",
    eatenAt: daysAgo(1),
    moment: "DINNER",
    carbsGrams: 60,
    insulinUnits: 5,
    correctionUnits: 0,
    tags: [],
    outcome: "PERFECT",
    hypoTreated: null,
    ...overrides,
  };
}

/** Meals with the given outcomes, newest first (1 day apart, starting 1 day ago). */
export function series(outcomes: Outcome[], overrides: Partial<RatioMeal> = {}): RatioMeal[] {
  return outcomes.map((outcome, index) =>
    meal({ outcome, eatenAt: daysAgo(index + 1), ...overrides }),
  );
}

/** Same as `series`, already evaluated (all meals are eligible). */
export function evaluatedSeries(outcomes: Outcome[]): EvaluatedMeal[] {
  return series(outcomes).map((item) => {
    const evaluated = evaluate(item);
    if (evaluated === null) throw new Error("fixture meal should be eligible");
    return evaluated;
  });
}
