import { describe, expect, it } from "vitest";
import {
  type DishMealFacts,
  dishPrefill,
  dishStats,
  mealBolus,
  perfectSummary,
} from "@/lib/dish-stats";
import { matchesDishQuery } from "@/lib/dishes";

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 12));

function meal(n: number, overrides: Partial<DishMealFacts> = {}): DishMealFacts {
  return {
    eatenAt: day(n),
    carbsGrams: 60,
    insulinUnits: 6,
    correctionUnits: 0,
    outcome: null,
    ...overrides,
  };
}

describe("dishStats", () => {
  it("has empty stats without meals", () => {
    const stats = dishStats([]);
    expect(stats).toMatchObject({
      count: 0,
      lastEatenAt: null,
      averageCarbs: null,
      rated: 0,
      perfect: 0,
      perfectPercent: null,
      bestDose: null,
      lastDose: null,
      recentOutcomes: [],
    });
    expect(dishPrefill(stats)).toBeNull();
  });

  it("averages carbs, counts outcomes and lists recent outcomes newest first", () => {
    const stats = dishStats(
      [
        meal(1, { carbsGrams: 50, outcome: "PERFECT" }),
        meal(3, { carbsGrams: 70, outcome: "NOT_ENOUGH" }),
        meal(2, { carbsGrams: 61, outcome: "PERFECT" }),
        meal(4, { carbsGrams: 60 }),
      ],
      3,
    );
    expect(stats.count).toBe(4);
    expect(stats.lastEatenAt).toEqual(day(4));
    expect(stats.averageCarbs).toBe(60);
    expect(stats.rated).toBe(3);
    expect(stats.perfect).toBe(2);
    expect(stats.perfectPercent).toBe(67);
    expect(stats.recentOutcomes).toEqual([null, "NOT_ENOUGH", "PERFECT"]);
  });

  it("picks the most frequent « pile poil » dose, correction excluded", () => {
    const stats = dishStats([
      meal(1, { carbsGrams: 60, insulinUnits: 5, outcome: "PERFECT" }),
      meal(2, { carbsGrams: 60, insulinUnits: 7, correctionUnits: 2, outcome: "PERFECT" }),
      meal(3, { carbsGrams: 80, insulinUnits: 8, outcome: "PERFECT" }),
      meal(4, { carbsGrams: 60, insulinUnits: 5, outcome: "PERFECT" }),
      meal(5, { carbsGrams: 60, insulinUnits: 9, outcome: "TOO_MUCH" }),
    ]);
    expect(stats.bestDose).toEqual({ carbsGrams: 60, units: 5, times: 3, gramsPerUnit: 12 });
    expect(dishPrefill(stats)).toEqual({ carbsGrams: 60, units: 5 });
  });

  it("breaks ties with the most recent « pile poil » meal", () => {
    const stats = dishStats([
      meal(1, { carbsGrams: 40, insulinUnits: 4, outcome: "PERFECT" }),
      meal(2, { carbsGrams: 50, insulinUnits: 4.5, outcome: "PERFECT" }),
    ]);
    expect(stats.bestDose).toMatchObject({ carbsGrams: 50, units: 4.5, times: 1 });
    expect(stats.bestDose?.gramsPerUnit).toBe(11.1);
  });

  it("has no ratio for a zero-unit dose", () => {
    const stats = dishStats([meal(1, { carbsGrams: 5, insulinUnits: 0, outcome: "PERFECT" })]);
    expect(stats.bestDose?.gramsPerUnit).toBeNull();
  });

  it("falls back to the latest meal when nothing was « pile poil »", () => {
    const stats = dishStats([
      meal(1, { carbsGrams: 40, insulinUnits: 4, outcome: "TOO_MUCH" }),
      meal(2, { carbsGrams: 45.4, insulinUnits: 6, correctionUnits: 1.5 }),
    ]);
    expect(stats.bestDose).toBeNull();
    expect(stats.lastDose).toEqual({ carbsGrams: 45, units: 4.5 });
    expect(dishPrefill(stats)).toEqual({ carbsGrams: 45, units: 4.5 });
  });
});

describe("mealBolus", () => {
  it("removes the correction, rounds to half units and never goes negative", () => {
    expect(mealBolus({ insulinUnits: 6.3, correctionUnits: 1 })).toBe(5.5);
    expect(mealBolus({ insulinUnits: 1, correctionUnits: 2 })).toBe(0);
  });
});

describe("perfectSummary", () => {
  it("is always kind", () => {
    expect(perfectSummary({ rated: 0, perfect: 0, perfectPercent: null })).toBe(
      "Pas encore de retour",
    );
    expect(perfectSummary({ rated: 3, perfect: 0, perfectPercent: 0 })).toBe(
      "On apprend ce plat ✨",
    );
    expect(perfectSummary({ rated: 1, perfect: 1, perfectPercent: 100 })).toBe("Pile poil 🎯");
    expect(perfectSummary({ rated: 4, perfect: 4, perfectPercent: 100 })).toBe(
      "Toujours pile poil 🎯",
    );
    expect(perfectSummary({ rated: 4, perfect: 3, perfectPercent: 75 })).toBe("75 % pile poil 🎯");
  });
});

describe("matchesDishQuery", () => {
  it("matches every word, ignoring case and accents", () => {
    expect(matchesDishQuery("Pâtes au pesto", "pates")).toBe(true);
    expect(matchesDishQuery("Pâtes au pesto", "PESTO pât")).toBe(true);
    expect(matchesDishQuery("Pâtes au pesto", "risotto")).toBe(false);
    expect(matchesDishQuery("Pâtes au pesto", "  ")).toBe(true);
  });
});
