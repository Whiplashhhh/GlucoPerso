import type { MealMoment, RatioMoment } from "@/lib/moments";

/** How the meal went, as evaluated by the user afterwards. */
export type Outcome = "TOO_MUCH" | "PERFECT" | "NOT_ENOUGH";

/** Direction of a suggestion: the two outcomes that call for a change. */
export type Signal = Exclude<Outcome, "PERFECT">;

export type MealTag =
  "SLOW_ABSORPTION" | "SPORT" | "SICK" | "PERIOD" | "ALCOHOL" | "STRESS" | "ATYPICAL";

/** The slice of a logged meal the ratio engine needs. */
export type RatioMeal = {
  id: string;
  name: string;
  eatenAt: Date;
  moment: MealMoment;
  carbsGrams: number;
  /** Total insulin injected for the meal, correction included. */
  insulinUnits: number;
  /** Part of `insulinUnits` meant to correct a high glucose, not to cover carbs. */
  correctionUnits: number;
  tags: MealTag[];
  outcome: Outcome | null;
  hypoTreated: boolean | null;
};

export type Confidence = "low" | "medium" | "good";

/** Absolute limits for a suggested ratio, in grams per unit. */
export type RatioBounds = { min: number; max: number };

export type RatioSuggestion = {
  key: RatioMoment;
  fromValue: number;
  toValue: number;
  signal: Signal;
  /** Recent meals that went in the signalled direction, newest first. */
  mealIds: string[];
  explanation: string;
  question: string;
};

export type RatioAnalysis = {
  key: RatioMoment;
  confidence: Confidence;
  /** Eligible evaluated meals of the window for this key, newest first. */
  consideredMealIds: string[];
  /** PERIOD / STRESS tags present among the considered meals. */
  flaggedTags: MealTag[];
  suggestion: RatioSuggestion | null;
};
