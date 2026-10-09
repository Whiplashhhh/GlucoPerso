import { describe, expect, it } from "vitest";
import {
  COOLDOWN_DAYS,
  DAY_MS,
  analyzeAllRatios,
  analyzeRatio,
  consideredMeals,
  inCooldown,
  type AnalyzeRatioInput,
  type RatioMeal,
} from "@/lib/ratio";
import { NOW, daysAgo, meal, series } from "./fixtures";

function input(meals: RatioMeal[], overrides: Partial<AnalyzeRatioInput> = {}): AnalyzeRatioInput {
  return {
    key: "DINNER",
    currentRatio: 12,
    meals,
    ratios: { DEFAULT: 15, DINNER: 12 },
    now: NOW,
    lastSuggestionAt: null,
    ...overrides,
  };
}

/** 3 descents in the 4 last dinners (the perfect one at 1 U / 14 g). */
function descents(): RatioMeal[] {
  return [
    ...series(["TOO_MUCH", "TOO_MUCH", "TOO_MUCH"]),
    meal({ outcome: "PERFECT", carbsGrams: 70, eatenAt: daysAgo(4) }),
  ];
}

describe("analyzeRatio — suggestions", () => {
  it("suggests a larger ratio after recent descents", () => {
    const meals = descents();
    const result = analyzeRatio(input(meals));
    expect(result).toEqual({
      key: "DINNER",
      confidence: "medium",
      consideredMealIds: meals.map((item) => item.id),
      flaggedTags: [],
      suggestion: {
        key: "DINNER",
        fromValue: 12,
        toValue: 13,
        signal: "TOO_MUCH",
        mealIds: meals.slice(0, 3).map((item) => item.id),
        explanation:
          "Ces derniers temps au dîner, tu as eu 3 descentes sur tes 4 derniers repas. " +
          "Un tout petit peu moins d'insuline pourrait t'aider.",
        question: "Passer de 1 U / 12 g à 1 U / 13 g ?",
      },
    });
  });

  it("suggests a smaller ratio when glucose stayed high", () => {
    // Newest meal had too much insulin (effective 12 → 13.2), then 3 highs at 12 → 10.8.
    const meals = [
      meal({ outcome: "TOO_MUCH", eatenAt: daysAgo(0.5) }),
      ...series(["NOT_ENOUGH", "NOT_ENOUGH", "NOT_ENOUGH"]),
    ];
    const { suggestion } = analyzeRatio(input(meals));
    expect(suggestion).toMatchObject({
      signal: "NOT_ENOUGH",
      fromValue: 12,
      toValue: 11.5,
      mealIds: meals.slice(1).map((item) => item.id),
      explanation:
        "Ces derniers temps au dîner, ta glycémie est restée un peu haute 3 fois " +
        "sur tes 4 derniers repas. Un tout petit peu plus d'insuline pourrait t'aider.",
      question: "Passer de 1 U / 12 g à 1 U / 11,5 g ?",
    });
  });

  it("uses the effective ratio without the correction", () => {
    // Same carbs and meal bolus as `descents`, with corrections on top.
    const meals = descents().map((item) => ({
      ...item,
      insulinUnits: item.insulinUnits + 2,
      correctionUnits: 2,
    }));
    expect(analyzeRatio(input(meals)).suggestion?.toValue).toBe(13);
  });

  it("leans on the weighted estimate when it is within the cap", () => {
    // Descents at 1 U / 11,5 g (→ 12.65) outweigh an old perfect meal at 1 U / 14 g.
    const meals = [
      ...series(["TOO_MUCH", "TOO_MUCH", "TOO_MUCH"], { carbsGrams: 57.5 }),
      meal({ outcome: "PERFECT", carbsGrams: 70, eatenAt: daysAgo(20) }),
    ];
    expect(analyzeRatio(input(meals)).suggestion?.toValue).toBe(12.5);
  });

  it("notes periods and stress among the considered meals", () => {
    const meals = descents().map((item, index) => {
      if (index === 0) return { ...item, tags: ["STRESS" as const] };
      if (index === 3) return { ...item, tags: ["PERIOD" as const] };
      return item;
    });
    const result = analyzeRatio(input(meals));
    expect(result.flaggedTags).toEqual(["PERIOD", "STRESS"]);
    expect(result.suggestion?.explanation).toMatch(
      / Certains de ces repas étaient pendant tes règles ou une période de stress, ça peut jouer\.$/,
    );
  });

  it("respects custom bounds", () => {
    const result = analyzeRatio(input(descents(), { bounds: { min: 3, max: 12.5 } }));
    expect(result.suggestion?.toValue).toBe(12.5);
  });
});

describe("analyzeRatio — no suggestion", () => {
  it.each([
    ["2/4", ["TOO_MUCH", "PERFECT", "TOO_MUCH", "PERFECT"]],
    ["3/5 with two opposite", ["TOO_MUCH", "NOT_ENOUGH", "TOO_MUCH", "NOT_ENOUGH", "TOO_MUCH"]],
    ["only 2 meals", ["TOO_MUCH", "TOO_MUCH"]],
  ] as const)("without a clear majority: %s", (_label, outcomes) => {
    expect(analyzeRatio(input(series([...outcomes]))).suggestion).toBeNull();
  });

  it("only looks at the 5 most recent meals for the direction", () => {
    const meals = series([
      "PERFECT",
      "PERFECT",
      "PERFECT",
      "TOO_MUCH",
      "TOO_MUCH",
      "TOO_MUCH",
      "TOO_MUCH",
    ]);
    const result = analyzeRatio(input(meals));
    expect(result.confidence).toBe("good");
    expect(result.suggestion).toBeNull();
  });

  it("waits 7 days after the last suggestion", () => {
    expect(COOLDOWN_DAYS).toBe(7);
    const justBefore = new Date(daysAgo(7).getTime() + 1);
    const blocked = analyzeRatio(input(descents(), { lastSuggestionAt: justBefore }));
    expect(blocked.suggestion).toBeNull();
    expect(blocked.confidence).toBe("medium");

    const allowed = analyzeRatio(input(descents(), { lastSuggestionAt: daysAgo(7) }));
    expect(allowed.suggestion?.toValue).toBe(13);
  });

  it("suggests nothing when the change would round to zero", () => {
    expect(analyzeRatio(input(descents(), { currentRatio: 4 })).suggestion).toBeNull();
  });

  it("suggests nothing when the bounds leave no room", () => {
    const result = analyzeRatio(input(descents(), { bounds: { min: 3, max: 12 } }));
    expect(result.suggestion).toBeNull();
  });

  it("ignores excluded meals when counting the majority", () => {
    const meals = [
      ...series(["TOO_MUCH", "TOO_MUCH"]),
      meal({ outcome: "TOO_MUCH", tags: ["SPORT"], eatenAt: daysAgo(3) }),
      meal({ outcome: "TOO_MUCH", tags: ["ALCOHOL"], eatenAt: daysAgo(4) }),
      meal({ outcome: "TOO_MUCH", tags: ["SICK"], eatenAt: daysAgo(5) }),
      meal({ outcome: "TOO_MUCH", tags: ["ATYPICAL"], eatenAt: daysAgo(6) }),
      meal({ outcome: null, eatenAt: daysAgo(7) }),
      meal({ outcome: "TOO_MUCH", insulinUnits: 2, correctionUnits: 2, eatenAt: daysAgo(8) }),
      meal({ outcome: "TOO_MUCH", carbsGrams: 0, eatenAt: daysAgo(9) }),
    ];
    const result = analyzeRatio(input(meals));
    expect(result.consideredMealIds).toEqual(meals.slice(0, 2).map((item) => item.id));
    expect(result.confidence).toBe("low");
    expect(result.suggestion).toBeNull();
  });
});

describe("analyzeRatio — considered meals", () => {
  it("keeps the 21-day window, edge included", () => {
    const edge = meal({ eatenAt: daysAgo(21) });
    const tooOld = meal({ eatenAt: new Date(daysAgo(21).getTime() - 1) });
    const future = meal({ eatenAt: daysAgo(-1) });
    const recent = meal({ eatenAt: daysAgo(2) });
    const result = analyzeRatio(input([tooOld, edge, future, recent]));
    expect(result.consideredMealIds).toEqual([recent.id, edge.id]);
  });

  it("does not let old descents trigger a suggestion", () => {
    const meals = series(["TOO_MUCH", "TOO_MUCH", "TOO_MUCH"]).map((item, index) => ({
      ...item,
      eatenAt: daysAgo(22 + index),
    }));
    const result = analyzeRatio(input(meals));
    expect(result.consideredMealIds).toEqual([]);
    expect(result.suggestion).toBeNull();
  });

  it("only uses meals whose ratio is the analysed one", () => {
    const dinner = meal({ moment: "DINNER" });
    const lunch = meal({ moment: "LUNCH" });
    const snack = meal({ moment: "SNACK" });
    const ratios = { DEFAULT: 15, DINNER: 12 };
    const dinnerIds = analyzeRatio(input([dinner, lunch, snack], { ratios })).consideredMealIds;
    expect(dinnerIds).toEqual([dinner.id]);
    const generalIds = analyzeRatio(
      input([dinner, lunch, snack], { ratios, key: "DEFAULT", currentRatio: 15 }),
    ).consideredMealIds;
    expect(generalIds.sort()).toEqual([lunch.id, snack.id].sort());
  });

  it("pools moments without their own ratio into the general one", () => {
    const meals = [
      meal({ moment: "LUNCH", outcome: "TOO_MUCH", carbsGrams: 75, eatenAt: daysAgo(1) }),
      meal({ moment: "SNACK", outcome: "TOO_MUCH", carbsGrams: 75, eatenAt: daysAgo(2) }),
      meal({ moment: "BREAKFAST", outcome: "TOO_MUCH", carbsGrams: 75, eatenAt: daysAgo(3) }),
    ];
    const result = analyzeRatio(
      input(meals, { key: "DEFAULT", currentRatio: 15, ratios: { DEFAULT: 15 } }),
    );
    expect(result.suggestion).toMatchObject({
      key: "DEFAULT",
      toValue: 16.5,
      explanation: expect.stringMatching(/^Ces derniers temps en général, tu as eu 3 descentes/),
    });
  });

  it("ignores meals that have no ratio at all", () => {
    const lunch = meal({ moment: "LUNCH" });
    const result = analyzeRatio(input([lunch], { ratios: { DINNER: 12 } }));
    expect(result.consideredMealIds).toEqual([]);
    expect(consideredMeals("DINNER", [lunch], { DINNER: 12 }, NOW)).toEqual([]);
  });

  it.each([
    [2, "low"],
    [3, "medium"],
    [5, "medium"],
    [6, "good"],
  ] as const)("%i eligible meals give a %s confidence", (count, confidence) => {
    const meals = series(Array.from({ length: count }, () => "PERFECT" as const));
    expect(analyzeRatio(input(meals)).confidence).toBe(confidence);
  });
});

describe("inCooldown", () => {
  it("is false without a previous suggestion", () => {
    expect(inCooldown(null, NOW)).toBe(false);
  });

  it("lasts exactly 7 days", () => {
    expect(inCooldown(NOW, NOW)).toBe(true);
    expect(inCooldown(new Date(NOW.getTime() - 7 * DAY_MS + 1), NOW)).toBe(true);
    expect(inCooldown(new Date(NOW.getTime() - 7 * DAY_MS), NOW)).toBe(false);
  });
});

describe("analyzeAllRatios", () => {
  it("analyses every defined ratio, general first", () => {
    const meals = [...descents(), meal({ moment: "LUNCH" })];
    const results = analyzeAllRatios({
      ratios: { DINNER: 12, DEFAULT: 15 },
      meals,
      now: NOW,
      lastSuggestionAt: {},
    });
    expect(results.map((result) => result.key)).toEqual(["DEFAULT", "DINNER"]);
    expect(results[0]?.consideredMealIds).toEqual([meals[4]?.id]);
    expect(results[1]?.suggestion?.toValue).toBe(13);
  });

  it("applies each ratio's own cooldown", () => {
    const results = analyzeAllRatios({
      ratios: { DEFAULT: 15, DINNER: 12 },
      meals: descents(),
      now: NOW,
      lastSuggestionAt: { DEFAULT: daysAgo(1), DINNER: daysAgo(3) },
    });
    expect(results.every((result) => result.suggestion === null)).toBe(true);
  });

  it("passes custom bounds down", () => {
    const [result] = analyzeAllRatios({
      ratios: { DINNER: 12 },
      meals: descents(),
      now: NOW,
      lastSuggestionAt: {},
      bounds: { min: 3, max: 12.5 },
    });
    expect(result?.suggestion?.toValue).toBe(12.5);
  });

  it("returns nothing without ratios", () => {
    expect(
      analyzeAllRatios({ ratios: {}, meals: descents(), now: NOW, lastSuggestionAt: {} }),
    ).toEqual([]);
  });
});
