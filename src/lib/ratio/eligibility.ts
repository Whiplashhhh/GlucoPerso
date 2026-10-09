import type { Confidence, MealTag, Outcome, RatioMeal } from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Only meals of the last 21 days feed a ratio. */
export const WINDOW_DAYS = 21;

/**
 * Half-life of a meal's weight. With 10 days, a meal from today counts twice as
 * much as one from 10 days ago and about 4.3 times as much as one at the edge of
 * the 21-day window: recent meals lead, older ones still smooth out the noise.
 */
export const HALF_LIFE_DAYS = 10;

/** Tags that make a meal unrepresentative of the usual insulin needs. */
export const EXCLUDING_TAGS: readonly MealTag[] = ["SPORT", "SICK", "ALCOHOL", "ATYPICAL"];

/** Tags kept in the computation but mentioned in the explanation. */
export const FLAGGED_TAGS: readonly MealTag[] = ["PERIOD", "STRESS"];

/** Insulin that covered the carbs: the correction is not part of the ratio. */
export function mealBolus(meal: RatioMeal): number {
  return meal.insulinUnits - meal.correctionUnits;
}

/** Grams of carbs actually covered by one unit for this meal; null when meaningless. */
export function effectiveRatio(meal: RatioMeal): number | null {
  const bolus = mealBolus(meal);
  if (bolus <= 0 || meal.carbsGrams <= 0) return null;
  return meal.carbsGrams / bolus;
}

/** An eligible meal with what the engine reads from it. */
export type EvaluatedMeal = { meal: RatioMeal; ratio: number; outcome: Outcome };

/**
 * The meal's effective ratio and outcome when it can teach us something about
 * its ratio: evaluated, not tagged as unusual, with carbs and a meal bolus.
 */
export function evaluate(meal: RatioMeal): EvaluatedMeal | null {
  const { outcome } = meal;
  if (outcome === null) return null;
  if (meal.tags.some((tag) => EXCLUDING_TAGS.includes(tag))) return null;
  const ratio = effectiveRatio(meal);
  return ratio === null ? null : { meal, ratio, outcome };
}

export function isEligible(meal: RatioMeal): boolean {
  return evaluate(meal) !== null;
}

/** Age of a meal at `now`, in days (negative for a meal in the future). */
export function ageInDays(meal: RatioMeal, now: Date): number {
  return (now.getTime() - meal.eatenAt.getTime()) / DAY_MS;
}

/** Meals eaten in the `days` before `now`, both edges included. */
export function isWithinDays(meal: RatioMeal, now: Date, days: number): boolean {
  const age = ageInDays(meal, now);
  return age >= 0 && age <= days;
}

/** Exponential decay: 1 for a meal eaten now, 0.5 after one half-life. */
export function recencyWeight(ageDays: number): number {
  return 0.5 ** (ageDays / HALF_LIFE_DAYS);
}

/** How much the eligible evaluated meals of the window can be trusted. */
export function confidenceFor(count: number): Confidence {
  if (count < 3) return "low";
  if (count < 6) return "medium";
  return "good";
}

/** Flagged tags present among `meals`, in FLAGGED_TAGS order. */
export function flaggedTagsOf(meals: RatioMeal[]): MealTag[] {
  return FLAGGED_TAGS.filter((tag) => meals.some((meal) => meal.tags.includes(tag)));
}

/** Newest first, without mutating the input. */
export function newestFirst(meals: RatioMeal[]): RatioMeal[] {
  return [...meals].sort((a, b) => b.eatenAt.getTime() - a.eatenAt.getTime());
}
