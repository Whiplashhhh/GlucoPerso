import { MEAL_MOMENTS, resolveRatio, type RatioMoment, type RatioTable } from "@/lib/moments";
import {
  DAY_MS,
  WINDOW_DAYS,
  confidenceFor,
  evaluate,
  flaggedTagsOf,
  isWithinDays,
  newestFirst,
  type EvaluatedMeal,
} from "./eligibility";
import { buildExplanation, buildQuestion } from "./explain";
import {
  DEFAULT_BOUNDS,
  RECENT_MEALS,
  detectSignal,
  targetRatio,
  weightedEstimate,
} from "./suggest";
import type { RatioAnalysis, RatioBounds, RatioMeal, RatioSuggestion } from "./types";

/** At most one suggestion per ratio every 7 days, so she is never nagged. */
export const COOLDOWN_DAYS = 7;

export type AnalyzeRatioInput = {
  key: RatioMoment;
  currentRatio: number;
  meals: RatioMeal[];
  ratios: RatioTable;
  now: Date;
  lastSuggestionAt: Date | null;
  bounds?: RatioBounds;
};

/** Eligible meals of the window whose ratio is `key`, newest first. */
export function consideredMeals(
  key: RatioMoment,
  meals: RatioMeal[],
  ratios: RatioTable,
  now: Date,
): EvaluatedMeal[] {
  return newestFirst(meals)
    .filter((meal) => resolveRatio(meal.moment, ratios)?.key === key)
    .filter((meal) => isWithinDays(meal, now, WINDOW_DAYS))
    .map(evaluate)
    .filter((evaluated) => evaluated !== null);
}

/** Whether a suggestion was already made for this ratio less than 7 days ago. */
export function inCooldown(lastSuggestionAt: Date | null, now: Date): boolean {
  if (lastSuggestionAt === null) return false;
  return now.getTime() - lastSuggestionAt.getTime() < COOLDOWN_DAYS * DAY_MS;
}

function suggest(input: AnalyzeRatioInput, considered: EvaluatedMeal[]): RatioSuggestion | null {
  if (inCooldown(input.lastSuggestionAt, input.now)) return null;
  // Needs 3 meals in the same direction, hence at least 3 considered meals.
  const detected = detectSignal(considered.slice(0, RECENT_MEALS));
  if (detected === null) return null;

  const { key, currentRatio } = input;
  const estimate = weightedEstimate(considered, input.now);
  const toValue = targetRatio(currentRatio, detected.signal, estimate, input.bounds);
  if (toValue === null) return null;

  const tags = flaggedTagsOf(considered.map(({ meal }) => meal));
  return {
    key,
    fromValue: currentRatio,
    toValue,
    signal: detected.signal,
    mealIds: detected.mealIds,
    explanation: buildExplanation(key, detected.signal, detected.count, detected.total, tags),
    question: buildQuestion(currentRatio, toValue),
  };
}

/** Confidence, considered meals and maybe a suggestion for one ratio. */
export function analyzeRatio(input: AnalyzeRatioInput): RatioAnalysis {
  const considered = consideredMeals(input.key, input.meals, input.ratios, input.now);
  return {
    key: input.key,
    confidence: confidenceFor(considered.length),
    consideredMealIds: considered.map(({ meal }) => meal.id),
    flaggedTags: flaggedTagsOf(considered.map(({ meal }) => meal)),
    suggestion: suggest(input, considered),
  };
}

export type AnalyzeAllRatiosInput = {
  ratios: RatioTable;
  meals: RatioMeal[];
  now: Date;
  lastSuggestionAt: Partial<Record<RatioMoment, Date>>;
  bounds?: RatioBounds;
};

/** One analysis per defined ratio, general one first, then in meal order. */
export function analyzeAllRatios(input: AnalyzeAllRatiosInput): RatioAnalysis[] {
  const keys: RatioMoment[] = ["DEFAULT", ...MEAL_MOMENTS];
  return keys.flatMap((key) => {
    const currentRatio = input.ratios[key];
    if (currentRatio === undefined) return [];
    return [
      analyzeRatio({
        key,
        currentRatio,
        meals: input.meals,
        ratios: input.ratios,
        now: input.now,
        lastSuggestionAt: input.lastSuggestionAt[key] ?? null,
        bounds: input.bounds ?? DEFAULT_BOUNDS,
      }),
    ];
  });
}
