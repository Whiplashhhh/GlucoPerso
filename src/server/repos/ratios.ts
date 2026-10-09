import "server-only";
import { db } from "@/lib/db";
import type { RatioMoment } from "@/lib/moments";
import {
  type RatioAnalysis,
  type RatioMeal,
  analyzeAllRatios,
  shouldSuggestMedicalTalk,
} from "@/lib/ratio";
import { getRatioTable } from "@/server/repos/settings";

const WINDOW_MS = 22 * 24 * 60 * 60 * 1000;

type Bounds = { ratioMin: number; ratioMax: number };
export type Decision = "ACCEPTED" | "DISMISSED" | "DOCTOR";

/** Everything the home screen needs about ratios, computed server-side. */
export async function ratioInsights(userId: string, bounds: Bounds, now = new Date()) {
  const [ratios, rows, last] = await Promise.all([
    getRatioTable(userId),
    db.meal.findMany({
      where: { userId, deletedAt: null, eatenAt: { gte: new Date(now.getTime() - WINDOW_MS) } },
      select: {
        id: true,
        name: true,
        eatenAt: true,
        moment: true,
        carbsGrams: true,
        insulinUnits: true,
        correctionUnits: true,
        tags: true,
        outcome: true,
        hypoTreated: true,
      },
    }),
    db.ratioSuggestion.groupBy({
      by: ["moment"],
      where: { userId },
      _max: { createdAt: true },
    }),
  ]);

  const meals: RatioMeal[] = rows.flatMap((row) =>
    row.moment === "DEFAULT" ? [] : [{ ...row, moment: row.moment }],
  );
  const lastSuggestionAt: Partial<Record<RatioMoment, Date>> = {};
  for (const entry of last) {
    if (entry._max.createdAt) lastSuggestionAt[entry.moment] = entry._max.createdAt;
  }

  const analyses: RatioAnalysis[] = analyzeAllRatios({
    ratios,
    meals,
    now,
    lastSuggestionAt,
    bounds: { min: bounds.ratioMin, max: bounds.ratioMax },
  });

  return {
    ratios,
    analyses,
    medicalTalk: shouldSuggestMedicalTalk(meals, now),
    mealNames: Object.fromEntries(rows.map((row) => [row.id, row.name])) as Record<string, string>,
  };
}

/**
 * Records her answer to a suggestion. The suggestion is recomputed here, so a
 * client can never push an arbitrary ratio: only what the engine proposes.
 */
export async function decideSuggestion(
  userId: string,
  bounds: Bounds,
  key: RatioMoment,
  decision: Decision,
  now = new Date(),
): Promise<boolean> {
  const { analyses } = await ratioInsights(userId, bounds, now);
  const suggestion = analyses.find((analysis) => analysis.key === key)?.suggestion;
  if (!suggestion) return false;

  await db.$transaction([
    db.ratioSuggestion.create({
      data: {
        userId,
        moment: key,
        fromValue: suggestion.fromValue,
        toValue: suggestion.toValue,
        signal: suggestion.signal,
        mealIds: suggestion.mealIds,
        explanation: suggestion.explanation,
        status: decision,
        decidedAt: now,
      },
    }),
    ...(decision === "ACCEPTED"
      ? [
          db.ratio.update({
            where: { userId_moment: { userId, moment: key } },
            data: { gramsPerUnit: suggestion.toValue },
          }),
          db.ratioChange.create({
            data: {
              userId,
              moment: key,
              fromValue: suggestion.fromValue,
              toValue: suggestion.toValue,
              origin: "SUGGESTION",
              justification: suggestion.explanation,
            },
          }),
        ]
      : []),
  ]);
  return true;
}
