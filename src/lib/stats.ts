import type { Outcome } from "@/lib/glucose";
import { MEAL_MOMENTS, type MealMoment, type RatioMoment } from "@/lib/moments";

export type OutcomeCounts = Record<Outcome, number>;

export type MomentStats = {
  moment: MealMoment;
  counts: OutcomeCounts;
  total: number;
};

export type OutcomeSummary = {
  perMoment: MomentStats[];
  counts: OutcomeCounts;
  total: number;
  /** Share of « pile poil » among evaluated meals, 0–100, rounded. */
  perfectPercent: number | null;
};

const emptyCounts = (): OutcomeCounts => ({ TOO_MUCH: 0, PERFECT: 0, NOT_ENOUGH: 0 });

/**
 * Outcome distribution per meal moment. Meals without an outcome are ignored,
 * moments without any evaluated meal are left out.
 */
export function summarizeOutcomes(
  meals: readonly { moment: RatioMoment; outcome: Outcome | null }[],
): OutcomeSummary {
  const byMoment = new Map<MealMoment, OutcomeCounts>();
  const counts = emptyCounts();
  let total = 0;
  for (const meal of meals) {
    if (!meal.outcome || meal.moment === "DEFAULT") continue;
    const entry = byMoment.get(meal.moment) ?? emptyCounts();
    entry[meal.outcome] += 1;
    byMoment.set(meal.moment, entry);
    counts[meal.outcome] += 1;
    total += 1;
  }
  const perMoment = MEAL_MOMENTS.flatMap((moment) => {
    const entry = byMoment.get(moment);
    if (!entry) return [];
    return [{ moment, counts: entry, total: entry.TOO_MUCH + entry.PERFECT + entry.NOT_ENOUGH }];
  });
  return {
    perMoment,
    counts,
    total,
    perfectPercent: total ? Math.round((counts.PERFECT / total) * 100) : null,
  };
}

/** Positive headline for the period; never a ranking, never a reproach. */
export function outcomeHeadline(
  summary: Pick<OutcomeSummary, "perfectPercent" | "counts" | "total">,
  periodInSentence: string,
): { figure?: string; title: string; subtitle: string } {
  if (summary.perfectPercent === null) {
    return {
      title: "Ton évolution se dessine ici 🌱",
      subtitle: "Dès que tu diras comment se passent tes repas, tes jolies stats apparaîtront.",
    };
  }
  const perfect = summary.counts.PERFECT;
  if (summary.perfectPercent >= 50) {
    return {
      figure: `${summary.perfectPercent} %`,
      title: `de pile poil ${periodInSentence} 🎉`,
      subtitle: `${perfect} repas dans le mille sur ${summary.total} évalués. Bravo à toi !`,
    };
  }
  if (perfect > 0) {
    return {
      title: `${perfect} repas pile poil ${periodInSentence} ✨`,
      subtitle: `Et ${summary.total} retours notés : chacun rend ton carnet plus juste.`,
    };
  }
  return {
    title: `${summary.total} repas évalués ${periodInSentence} 🌷`,
    subtitle: "Merci de prendre le temps de noter, c'est comme ça qu'on affine ensemble.",
  };
}

export type RatioChangePoint = { moment: RatioMoment; toValue: number; createdAt: Date };
export type RatioTimelineRow = { t: number } & Partial<Record<RatioMoment, number>>;

/**
 * Step-chart rows: one row per change instant with the value of every moment
 * known at that time, plus a first row at `start` (values in force then) and a
 * last row at `now` so each line reaches today.
 */
export function ratioTimeline(
  changes: readonly RatioChangePoint[],
  start: Date | null,
  now: Date,
): { rows: RatioTimelineRow[]; moments: RatioMoment[] } {
  const sorted = [...changes].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const current: Partial<Record<RatioMoment, number>> = {};
  const rows: RatioTimelineRow[] = [];
  const seen = new Set<RatioMoment>();
  const from = start?.getTime() ?? -Infinity;

  for (const change of sorted) {
    const t = change.createdAt.getTime();
    if (t > now.getTime()) break;
    if (t < from) {
      current[change.moment] = change.toValue;
      continue;
    }
    if (rows.length === 0 && start && Object.keys(current).length > 0) {
      rows.push({ t: from, ...current });
    }
    current[change.moment] = change.toValue;
    const last = rows.at(-1);
    if (last && last.t === t) Object.assign(last, current);
    else rows.push({ t, ...current });
  }
  if (rows.length === 0 && Object.keys(current).length > 0 && start) {
    rows.push({ t: from, ...current });
  }
  if (rows.length > 0) rows.push({ t: now.getTime(), ...current });
  for (const row of rows) {
    for (const key of Object.keys(row)) if (key !== "t") seen.add(key as RatioMoment);
  }
  const order: RatioMoment[] = ["DEFAULT", ...MEAL_MOMENTS];
  return { rows, moments: order.filter((moment) => seen.has(moment)) };
}
