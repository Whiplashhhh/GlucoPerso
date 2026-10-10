import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOUNDS,
  MAX_CHANGE,
  OUTCOME_FACTOR,
  detectSignal,
  evaluate,
  roundTowards,
  targetRatio,
  weightedEstimate,
  type EvaluatedMeal,
  type Outcome,
} from "@/lib/ratio";
import { NOW, daysAgo, evaluatedSeries, meal } from "./fixtures";

function evaluated(outcome: Outcome, carbsGrams: number, days: number): EvaluatedMeal {
  const result = evaluate(meal({ outcome, carbsGrams, insulinUnits: 1, eatenAt: daysAgo(days) }));
  if (result === null) throw new Error("should be eligible");
  return result;
}

describe("detectSignal", () => {
  it.each([
    ["3/3", ["TOO_MUCH", "TOO_MUCH", "TOO_MUCH"]],
    ["3/4 with a perfect meal", ["TOO_MUCH", "PERFECT", "TOO_MUCH", "TOO_MUCH"]],
    ["3/4 with one opposite", ["TOO_MUCH", "NOT_ENOUGH", "TOO_MUCH", "TOO_MUCH"]],
    ["3/5 with two perfect meals", ["TOO_MUCH", "PERFECT", "TOO_MUCH", "PERFECT", "TOO_MUCH"]],
    ["3/5 with one opposite", ["TOO_MUCH", "PERFECT", "TOO_MUCH", "NOT_ENOUGH", "TOO_MUCH"]],
    ["4/5", ["TOO_MUCH", "TOO_MUCH", "NOT_ENOUGH", "TOO_MUCH", "TOO_MUCH"]],
    ["5/5", ["TOO_MUCH", "TOO_MUCH", "TOO_MUCH", "TOO_MUCH", "TOO_MUCH"]],
  ] as const)("finds a clear majority: %s", (_label, outcomes) => {
    const recent = evaluatedSeries([...outcomes]);
    const detected = detectSignal(recent);
    const expectedIds = recent.filter((item) => item.outcome === "TOO_MUCH").map((i) => i.meal.id);
    expect(detected).toEqual({
      signal: "TOO_MUCH",
      mealIds: expectedIds,
      count: expectedIds.length,
      total: outcomes.length,
    });
  });

  it("works the same way for not enough insulin", () => {
    const recent = evaluatedSeries(["NOT_ENOUGH", "PERFECT", "NOT_ENOUGH", "NOT_ENOUGH"]);
    expect(detectSignal(recent)).toMatchObject({ signal: "NOT_ENOUGH", count: 3, total: 4 });
  });

  it.each([
    ["nothing", []],
    ["2/2", ["TOO_MUCH", "TOO_MUCH"]],
    ["2/4", ["TOO_MUCH", "PERFECT", "TOO_MUCH", "PERFECT"]],
    ["3/5 with two opposite", ["TOO_MUCH", "NOT_ENOUGH", "TOO_MUCH", "NOT_ENOUGH", "TOO_MUCH"]],
    ["only perfect meals", ["PERFECT", "PERFECT", "PERFECT"]],
    ["a split", ["TOO_MUCH", "NOT_ENOUGH", "PERFECT", "TOO_MUCH", "NOT_ENOUGH"]],
  ] as const)("stays quiet without a clear majority: %s", (_label, outcomes) => {
    expect(detectSignal(evaluatedSeries([...outcomes]))).toBeNull();
  });
});

describe("weightedEstimate", () => {
  it("returns the effective ratio of a single perfect meal", () => {
    expect(weightedEstimate([evaluated("PERFECT", 12, 3)], NOW)).toBeCloseTo(12);
  });

  it("treats outcomes as soft bounds around the effective ratio", () => {
    expect(OUTCOME_FACTOR).toEqual({ TOO_MUCH: 1.1, PERFECT: 1, NOT_ENOUGH: 0.9 });
    expect(weightedEstimate([evaluated("TOO_MUCH", 10, 0)], NOW)).toBeCloseTo(11);
    expect(weightedEstimate([evaluated("NOT_ENOUGH", 10, 0)], NOW)).toBeCloseTo(9);
  });

  it("averages meals of the same age evenly", () => {
    const meals = [evaluated("PERFECT", 10, 2), evaluated("PERFECT", 14, 2)];
    expect(weightedEstimate(meals, NOW)).toBeCloseTo(12);
  });

  it("gives recent meals more weight", () => {
    // Weights 1 and 0.5: (10 × 1 + 20 × 0.5) / 1.5.
    const meals = [evaluated("PERFECT", 10, 0), evaluated("PERFECT", 20, 10)];
    expect(weightedEstimate(meals, NOW)).toBeCloseTo(40 / 3);
    const reversed = [evaluated("PERFECT", 10, 10), evaluated("PERFECT", 20, 0)];
    expect(weightedEstimate(reversed, NOW)).toBeCloseTo(50 / 3);
  });
});

describe("roundTowards", () => {
  it.each([
    [13.2, 12, 13],
    [12.74, 12, 12.5],
    [10.8, 12, 11],
    [11.26, 12, 11.5],
    [12.5, 12, 12.5],
    [11.5, 12, 11.5],
    [10 * 1.1, 10, 11],
    [10 * 0.9, 10, 9],
  ])("rounds %d toward %d to %d", (value, current, expected) => {
    expect(roundTowards(value, current)).toBe(expected);
  });

  it("accepts another step", () => {
    expect(roundTowards(13.7, 12, 1)).toBe(13);
    expect(roundTowards(10.2, 12, 1)).toBe(11);
  });
});

describe("targetRatio", () => {
  it("always moves at least one step when the estimate is barely on the right side", () => {
    expect(targetRatio(12, "TOO_MUCH", 12.3)).toBe(12.5);
    expect(targetRatio(12, "NOT_ENOUGH", 11.8)).toBe(11.5);
  });

  it("follows the estimate within the cap", () => {
    expect(targetRatio(12, "TOO_MUCH", 12.9)).toBe(12.5);
    expect(targetRatio(12, "NOT_ENOUGH", 11.2)).toBe(11.5);
  });

  it("caps the change to 10 % of the current ratio", () => {
    expect(MAX_CHANGE).toBe(0.1);
    expect(targetRatio(12, "TOO_MUCH", 30)).toBe(13);
    expect(targetRatio(12, "NOT_ENOUGH", 2)).toBe(11);
    expect(targetRatio(20, "TOO_MUCH", 30)).toBe(22);
    expect(targetRatio(20, "NOT_ENOUGH", 2)).toBe(18);
  });

  it("never exceeds the cap once rounded", () => {
    for (let current = 3; current <= 50; current += 0.5) {
      for (const signal of ["TOO_MUCH", "NOT_ENOUGH"] as const) {
        const extreme = signal === "TOO_MUCH" ? 100 : 0;
        const target = targetRatio(current, signal, extreme);
        if (target !== null) {
          expect(Math.abs(target - current)).toBeLessThanOrEqual(current * MAX_CHANGE + 1e-9);
          expect((target * 2) % 1).toBe(0);
        }
      }
    }
  });

  it("nudges by one step when the estimate is on the other side", () => {
    expect(targetRatio(12, "TOO_MUCH", 11)).toBe(12.5);
    expect(targetRatio(12, "TOO_MUCH", 12)).toBe(12.5);
    expect(targetRatio(12, "NOT_ENOUGH", 13)).toBe(11.5);
    expect(targetRatio(12, "NOT_ENOUGH", 12)).toBe(11.5);
  });

  it("suggests nothing when 10 % is less than half a gram", () => {
    expect(targetRatio(4, "TOO_MUCH", 10)).toBeNull();
    expect(targetRatio(4, "NOT_ENOUGH", 1)).toBeNull();
  });

  it("clamps to the absolute bounds", () => {
    expect(DEFAULT_BOUNDS).toEqual({ min: 3, max: 50 });
    expect(targetRatio(48, "TOO_MUCH", 60)).toBe(50);
    expect(targetRatio(20, "TOO_MUCH", 30, { min: 3, max: 21 })).toBe(21);
    expect(targetRatio(20, "NOT_ENOUGH", 10, { min: 19, max: 50 })).toBe(19);
  });

  it("suggests nothing when the bounds leave no room", () => {
    expect(targetRatio(50, "TOO_MUCH", 60)).toBeNull();
    expect(targetRatio(3, "NOT_ENOUGH", 1)).toBeNull();
  });

  it("never goes the wrong way when the current ratio is out of bounds", () => {
    expect(targetRatio(55, "TOO_MUCH", 60)).toBeNull();
    expect(targetRatio(2.5, "NOT_ENOUGH", 1)).toBeNull();
  });
});
