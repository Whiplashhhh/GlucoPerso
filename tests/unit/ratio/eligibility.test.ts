import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  EXCLUDING_TAGS,
  FLAGGED_TAGS,
  HALF_LIFE_DAYS,
  WINDOW_DAYS,
  ageInDays,
  confidenceFor,
  effectiveRatio,
  evaluate,
  flaggedTagsOf,
  isEligible,
  isWithinDays,
  mealBolus,
  newestFirst,
  recencyWeight,
} from "@/lib/ratio";
import type { MealTag } from "@/lib/ratio";
import { NOW, daysAgo, meal } from "./fixtures";

describe("meal bolus and effective ratio", () => {
  it("divides carbs by the insulin injected for the meal", () => {
    expect(effectiveRatio(meal({ carbsGrams: 60, insulinUnits: 5 }))).toBe(12);
  });

  it("leaves the correction out of the ratio", () => {
    const corrected = meal({ carbsGrams: 60, insulinUnits: 6.5, correctionUnits: 1.5 });
    expect(mealBolus(corrected)).toBe(5);
    expect(effectiveRatio(corrected)).toBe(12);
  });

  it.each([
    ["the whole dose is a correction", { insulinUnits: 2, correctionUnits: 2 }],
    ["the correction exceeds the dose", { insulinUnits: 1, correctionUnits: 2 }],
    ["no insulin was injected", { insulinUnits: 0 }],
    ["there are no carbs", { carbsGrams: 0 }],
    ["carbs are negative", { carbsGrams: -10 }],
  ])("is meaningless when %s", (_label, overrides) => {
    expect(effectiveRatio(meal(overrides))).toBeNull();
  });
});

describe("eligibility", () => {
  it("keeps an evaluated meal with carbs and a meal bolus", () => {
    const item = meal({ outcome: "TOO_MUCH" });
    expect(evaluate(item)).toEqual({ meal: item, ratio: 12, outcome: "TOO_MUCH" });
    expect(isEligible(item)).toBe(true);
  });

  it("excludes meals without outcome", () => {
    expect(evaluate(meal({ outcome: null }))).toBeNull();
    expect(isEligible(meal({ outcome: null }))).toBe(false);
  });

  it.each(["SPORT", "SICK", "ALCOHOL", "ATYPICAL"] as const)("excludes meals tagged %s", (tag) => {
    expect(EXCLUDING_TAGS).toContain(tag);
    expect(isEligible(meal({ tags: [tag] }))).toBe(false);
    expect(isEligible(meal({ tags: ["PERIOD", tag] }))).toBe(false);
  });

  it.each(["PERIOD", "STRESS", "SLOW_ABSORPTION"] as const)("keeps meals tagged %s", (tag) => {
    expect(isEligible(meal({ tags: [tag] }))).toBe(true);
  });

  it("excludes meals with no meal bolus", () => {
    expect(isEligible(meal({ insulinUnits: 1, correctionUnits: 1 }))).toBe(false);
    expect(isEligible(meal({ insulinUnits: 1, correctionUnits: 3 }))).toBe(false);
  });

  it("excludes meals without carbs", () => {
    expect(isEligible(meal({ carbsGrams: 0 }))).toBe(false);
  });
});

describe("window", () => {
  it("measures the age of a meal in days", () => {
    expect(ageInDays(meal({ eatenAt: daysAgo(2.5) }), NOW)).toBe(2.5);
    expect(ageInDays(meal({ eatenAt: daysAgo(-1) }), NOW)).toBe(-1);
  });

  it("includes both edges of the window", () => {
    expect(isWithinDays(meal({ eatenAt: NOW }), NOW, WINDOW_DAYS)).toBe(true);
    expect(isWithinDays(meal({ eatenAt: daysAgo(21) }), NOW, WINDOW_DAYS)).toBe(true);
  });

  it("excludes meals older than the window or in the future", () => {
    const tooOld = new Date(daysAgo(21).getTime() - 1);
    expect(isWithinDays(meal({ eatenAt: tooOld }), NOW, WINDOW_DAYS)).toBe(false);
    const future = new Date(NOW.getTime() + 1);
    expect(isWithinDays(meal({ eatenAt: future }), NOW, WINDOW_DAYS)).toBe(false);
  });

  it("uses 21 days and a 10-day half-life", () => {
    expect(WINDOW_DAYS).toBe(21);
    expect(HALF_LIFE_DAYS).toBe(10);
    expect(DAY_MS).toBe(86_400_000);
  });
});

describe("recency weight", () => {
  it("halves every half-life", () => {
    expect(recencyWeight(0)).toBe(1);
    expect(recencyWeight(10)).toBe(0.5);
    expect(recencyWeight(20)).toBe(0.25);
  });

  it("decreases with age", () => {
    const weights = [0, 1, 5, 14, 21].map(recencyWeight);
    weights.slice(1).forEach((weight, index) => {
      expect(weight).toBeLessThan(weights[index] ?? 0);
    });
    expect(recencyWeight(21)).toBeCloseTo(0.233, 3);
  });
});

describe("confidence", () => {
  it.each([
    [0, "low"],
    [2, "low"],
    [3, "medium"],
    [5, "medium"],
    [6, "good"],
    [15, "good"],
  ] as const)("%i meals give a %s confidence", (count, confidence) => {
    expect(confidenceFor(count)).toBe(confidence);
  });
});

describe("flagged tags", () => {
  it("lists PERIOD and STRESS when present, once each, in a stable order", () => {
    const meals = [
      meal({ tags: ["STRESS"] }),
      meal({ tags: ["PERIOD", "SLOW_ABSORPTION"] }),
      meal({ tags: ["STRESS"] }),
    ];
    expect(flaggedTagsOf(meals)).toEqual(["PERIOD", "STRESS"]);
    expect(FLAGGED_TAGS).toEqual(["PERIOD", "STRESS"]);
  });

  it("is empty without flagged tags", () => {
    const tags: MealTag[] = ["SLOW_ABSORPTION"];
    expect(flaggedTagsOf([meal({ tags }), meal()])).toEqual([]);
    expect(flaggedTagsOf([])).toEqual([]);
  });
});

describe("newestFirst", () => {
  it("sorts by date without mutating the input", () => {
    const old = meal({ eatenAt: daysAgo(5) });
    const recent = meal({ eatenAt: daysAgo(1) });
    const middle = meal({ eatenAt: daysAgo(3) });
    const input = [old, recent, middle];
    expect(newestFirst(input)).toEqual([recent, middle, old]);
    expect(input).toEqual([old, recent, middle]);
  });
});
