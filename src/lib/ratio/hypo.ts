import { isWithinDays } from "./eligibility";
import type { RatioMeal } from "./types";

export const HYPO_ALERT_DAYS = 7;
export const HYPO_ALERT_COUNT = 2;

/**
 * Whether to kindly invite her to talk with her medical team: at least two
 * treated hypos in the last 7 days, whatever the meal moment.
 */
export function shouldSuggestMedicalTalk(meals: RatioMeal[], now: Date): boolean {
  const treated = meals.filter(
    (meal) => meal.hypoTreated === true && isWithinDays(meal, now, HYPO_ALERT_DAYS),
  );
  return treated.length >= HYPO_ALERT_COUNT;
}
