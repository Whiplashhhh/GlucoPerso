import type { Outcome } from "@/lib/glucose";

/** What the stats need to know about each (non-deleted) meal of a dish. */
export type DishMealFacts = {
  eatenAt: Date;
  carbsGrams: number;
  /** Total rapid units, correction included. */
  insulinUnits: number;
  correctionUnits: number;
  outcome: Outcome | null;
};

/** Carbs and meal bolus (correction excluded), ready to prefill the form. */
export type DoseValues = { carbsGrams: number; units: number };

export type BestDose = DoseValues & {
  /** How many « pile poil » meals had exactly these values. */
  times: number;
  /** Grams per unit of that dose, null for a zero-unit meal. */
  gramsPerUnit: number | null;
};

export type DishStats = {
  count: number;
  lastEatenAt: Date | null;
  /** Rounded to the gram; null without meals. */
  averageCarbs: number | null;
  /** Meals with a feedback. */
  rated: number;
  perfect: number;
  /** Share of « pile poil » among rated meals, 0–100; null when nothing is rated. */
  perfectPercent: number | null;
  /** The values that worked best: the most frequent among « pile poil » meals. */
  bestDose: BestDose | null;
  /** Values of the latest meal, used when nothing was « pile poil » yet. */
  lastDose: DoseValues | null;
  /** Outcomes of the most recent meals, newest first. */
  recentOutcomes: (Outcome | null)[];
};

const roundHalf = (value: number) => Math.round(value * 2) / 2;

/** Bolus for the food only: correction units are excluded, as in the ratio. */
export function mealBolus(meal: Pick<DishMealFacts, "insulinUnits" | "correctionUnits">): number {
  return roundHalf(Math.max(0, meal.insulinUnits - meal.correctionUnits));
}

export function dishStats(meals: readonly DishMealFacts[], recent = 5): DishStats {
  const sorted = [...meals].sort((a, b) => b.eatenAt.getTime() - a.eatenAt.getTime());
  const count = sorted.length;
  const rated = sorted.filter((meal) => meal.outcome !== null);
  const perfectMeals = sorted.filter((meal) => meal.outcome === "PERFECT");
  const last = sorted[0];

  return {
    count,
    lastEatenAt: last?.eatenAt ?? null,
    averageCarbs: count
      ? Math.round(sorted.reduce((sum, meal) => sum + meal.carbsGrams, 0) / count)
      : null,
    rated: rated.length,
    perfect: perfectMeals.length,
    perfectPercent: rated.length ? Math.round((perfectMeals.length / rated.length) * 100) : null,
    bestDose: bestDose(perfectMeals),
    lastDose: last ? { carbsGrams: Math.round(last.carbsGrams), units: mealBolus(last) } : null,
    recentOutcomes: sorted.slice(0, recent).map((meal) => meal.outcome),
  };
}

/** Most frequent (carbs, bolus) pair; ties go to the most recent one. */
function bestDose(perfectNewestFirst: readonly DishMealFacts[]): BestDose | null {
  const groups = new Map<string, BestDose>();
  for (const meal of perfectNewestFirst) {
    const carbsGrams = Math.round(meal.carbsGrams);
    const units = mealBolus(meal);
    const key = `${carbsGrams}|${units}`;
    const group = groups.get(key);
    if (group) group.times += 1;
    else {
      groups.set(key, {
        carbsGrams,
        units,
        times: 1,
        gramsPerUnit: units > 0 ? Math.round((carbsGrams / units) * 10) / 10 : null,
      });
    }
  }
  let best: BestDose | null = null;
  // Map keeps insertion order (newest first), so `>` keeps the most recent on ties.
  for (const group of groups.values()) if (!best || group.times > best.times) best = group;
  return best;
}

/** Values offered by « Manger ça » and the favourite chips. */
export function dishPrefill(stats: Pick<DishStats, "bestDose" | "lastDose">): DoseValues | null {
  if (stats.bestDose) return { carbsGrams: stats.bestDose.carbsGrams, units: stats.bestDose.units };
  return stats.lastDose;
}

/** Short, always positive wording of the « pile poil » rate. */
export function perfectSummary(stats: Pick<DishStats, "rated" | "perfect" | "perfectPercent">) {
  if (stats.rated === 0) return "Pas encore de retour";
  if (stats.perfect === 0) return "On apprend ce plat ✨";
  if (stats.perfect === stats.rated)
    return stats.rated > 1 ? "Toujours pile poil 🎯" : "Pile poil 🎯";
  return `${stats.perfectPercent} % pile poil 🎯`;
}

/** « Mangé 1 fois », « Mangé 4 fois ». */
export function timesEaten(count: number): string {
  return `Mangé ${count} fois`;
}
