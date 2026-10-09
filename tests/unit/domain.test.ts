import { describe, expect, it } from "vitest";
import { doseHint, mealBolus, roundToIncrement } from "@/lib/dose";
import { formatGrams, formatNumber, formatRatio, formatUnits, parseDecimal } from "@/lib/format";
import { formatGlucose, fromUnit, suggestOutcome, toUnit } from "@/lib/glucose";
import { hourIn, momentAt, momentForHour, resolveRatio } from "@/lib/moments";

describe("moments", () => {
  it.each([
    [5, "BREAKFAST"],
    [10, "BREAKFAST"],
    [11, "LUNCH"],
    [14, "LUNCH"],
    [15, "AFTERNOON_SNACK"],
    [17, "AFTERNOON_SNACK"],
    [18, "DINNER"],
    [22, "DINNER"],
    [23, "SNACK"],
    [2, "SNACK"],
    [4, "SNACK"],
  ] as const)("hour %i is %s", (hour, moment) => {
    expect(momentForHour(hour)).toBe(moment);
  });

  it("reads the hour in the user's timezone", () => {
    const date = new Date("2026-01-15T11:30:00Z");
    expect(hourIn(date, "Europe/Paris")).toBe(12);
    expect(hourIn(date, "America/New_York")).toBe(6);
    expect(momentAt(date, "Europe/Paris")).toBe("LUNCH");
  });

  it("uses the moment ratio when defined, else the general one", () => {
    expect(resolveRatio("DINNER", { DEFAULT: 10, DINNER: 12 })).toEqual({
      key: "DINNER",
      gramsPerUnit: 12,
    });
    expect(resolveRatio("LUNCH", { DEFAULT: 10, DINNER: 12 })).toEqual({
      key: "DEFAULT",
      gramsPerUnit: 10,
    });
    expect(resolveRatio("LUNCH", {})).toBeNull();
  });
});

describe("dose", () => {
  it("rounds to the pen increment", () => {
    expect(roundToIncrement(4.74, 0.5)).toBe(4.5);
    expect(roundToIncrement(4.75, 0.5)).toBe(5);
    expect(roundToIncrement(4.4, 1)).toBe(4);
    expect(roundToIncrement(0.3 + 0.6, 0.5)).toBe(1);
  });

  it("computes the indicative dose", () => {
    expect(doseHint(60, 12, 1)).toEqual({ exact: 5, rounded: 5 });
    expect(doseHint(50, 12, 0.5)).toEqual({ exact: 50 / 12, rounded: 4 });
    expect(doseHint(0, 12, 1)).toBeNull();
    expect(doseHint(60, 0, 1)).toBeNull();
    expect(doseHint(60, 12, 0)).toBeNull();
  });

  it("removes the correction from the meal bolus", () => {
    expect(mealBolus(6, 1)).toBe(5);
    expect(mealBolus(1, 2)).toBe(0);
  });
});

describe("glucose", () => {
  it("converts between units", () => {
    expect(toUnit(1.234, "G_L")).toBe(1.23);
    expect(toUnit(1.234, "MG_DL")).toBe(123);
    expect(fromUnit(120, "MG_DL")).toBe(1.2);
    expect(fromUnit(1.2, "G_L")).toBe(1.2);
    expect(formatGlucose(0.7, "G_L")).toBe("0,7 g/L");
    expect(formatGlucose(0.7, "MG_DL")).toBe("70 mg/dL");
  });

  const thresholds = { hypo: 0.7, high: 1.8 };

  it("pre-selects the most likely outcome", () => {
    expect(suggestOutcome({}, thresholds)).toBeNull();
    expect(suggestOutcome({ hypoTreated: true }, thresholds)).toBe("TOO_MUCH");
    expect(suggestOutcome({ low: 0.6, high: 1.5 }, thresholds)).toBe("TOO_MUCH");
    expect(suggestOutcome({ after: 2.4 }, thresholds)).toBe("NOT_ENOUGH");
    expect(suggestOutcome({ after: 1.3, low: 0.9 }, thresholds)).toBe("PERFECT");
    expect(suggestOutcome({ after: null, low: undefined, high: 1.1 }, thresholds)).toBe("PERFECT");
  });
});

describe("format", () => {
  it("formats numbers the French way", () => {
    expect(formatNumber(4.5)).toBe("4,5");
    expect(formatNumber(4)).toBe("4");
    expect(formatUnits(4.5)).toBe("4,5 U");
    expect(formatGrams(60.4)).toBe("60 g");
    expect(formatRatio(12)).toBe("1 U / 12 g");
    expect(formatRatio(12.5)).toBe("1 U / 12,5 g");
  });

  it("parses decimals typed with a comma", () => {
    expect(parseDecimal("4,5")).toBe(4.5);
    expect(parseDecimal(" 12 ")).toBe(12);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
  });
});
