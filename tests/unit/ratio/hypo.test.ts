import { describe, expect, it } from "vitest";
import { HYPO_ALERT_COUNT, HYPO_ALERT_DAYS, shouldSuggestMedicalTalk } from "@/lib/ratio";
import { NOW, daysAgo, meal } from "./fixtures";

describe("shouldSuggestMedicalTalk", () => {
  it("asks after two treated hypos within 7 days, whatever the moment", () => {
    expect(HYPO_ALERT_DAYS).toBe(7);
    expect(HYPO_ALERT_COUNT).toBe(2);
    const meals = [
      meal({ moment: "BREAKFAST", hypoTreated: true, eatenAt: daysAgo(1) }),
      meal({ moment: "DINNER", hypoTreated: true, eatenAt: daysAgo(6) }),
    ];
    expect(shouldSuggestMedicalTalk(meals, NOW)).toBe(true);
  });

  it("counts a hypo exactly 7 days ago", () => {
    const meals = [
      meal({ hypoTreated: true, eatenAt: daysAgo(0) }),
      meal({ hypoTreated: true, eatenAt: daysAgo(7) }),
    ];
    expect(shouldSuggestMedicalTalk(meals, NOW)).toBe(true);
  });

  it("stays quiet with a single treated hypo", () => {
    expect(shouldSuggestMedicalTalk([meal({ hypoTreated: true })], NOW)).toBe(false);
    expect(shouldSuggestMedicalTalk([], NOW)).toBe(false);
  });

  it("ignores older, future, untreated and unknown hypos", () => {
    const meals = [
      meal({ hypoTreated: true, eatenAt: daysAgo(2) }),
      meal({ hypoTreated: true, eatenAt: new Date(daysAgo(7).getTime() - 1) }),
      meal({ hypoTreated: true, eatenAt: daysAgo(-1) }),
      meal({ hypoTreated: false, eatenAt: daysAgo(1) }),
      meal({ hypoTreated: null, eatenAt: daysAgo(1) }),
    ];
    expect(shouldSuggestMedicalTalk(meals, NOW)).toBe(false);
  });

  it("does not care about tags or eligibility", () => {
    const meals = [
      meal({ hypoTreated: true, tags: ["SPORT"], outcome: null }),
      meal({ hypoTreated: true, carbsGrams: 0 }),
    ];
    expect(shouldSuggestMedicalTalk(meals, NOW)).toBe(true);
  });
});
