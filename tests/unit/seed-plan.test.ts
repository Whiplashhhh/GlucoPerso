import { describe, expect, it } from "vitest";
import { ART_HEIGHT, ART_KINDS, ART_VARIANTS, ART_WIDTH, demoArtSvg } from "../../prisma/demo/art";
import { DEMO_DAYS, analyzePlan, buildDemoPlan } from "../../prisma/demo/plan";
import { createRng, roundToStep } from "../../prisma/demo/random";

const TZ = "Europe/Paris";
const DAY_MS = 24 * 60 * 60 * 1000;
/** Mornings, evenings, around midnight, and a DST switch day. */
const NOWS = [
  "2026-10-10T08:30:00Z",
  "2026-10-10T19:45:00Z",
  "2026-10-10T23:10:00Z",
  "2026-03-29T10:00:00Z",
].map((iso) => new Date(iso));

describe("demo PRNG", () => {
  it("is deterministic for a seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 5 }, a.next)).toEqual(Array.from({ length: 5 }, b.next));
  });

  it("stays within bounds", () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i += 1) {
      const value = rng.int(3, 5);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(5);
    }
    expect(rng.weighted([["only", 1]])).toBe("only");
  });

  it("rounds to pen steps", () => {
    expect(roundToStep(4.3, 0.5)).toBe(4.5);
    expect(roundToStep(4.2, 0.5)).toBe(4);
  });
});

describe("demo plan", () => {
  it.each(NOWS)("produces exactly one suggestion, for dinner 12 → 13 (now = %s)", (now) => {
    const plan = buildDemoPlan({ now, timeZone: TZ });
    const suggestions = analyzePlan(plan, now).flatMap((analysis) =>
      analysis.suggestion ? [analysis.suggestion] : [],
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      key: "DINNER",
      fromValue: 12,
      toValue: 13,
      signal: "TOO_MUCH",
    });
  });

  it.each(NOWS)("keeps the week calm and has one pending meal (now = %s)", (now) => {
    const plan = buildDemoPlan({ now, timeZone: TZ });
    const week = plan.meals.filter((meal) => now.getTime() - meal.eatenAt.getTime() <= 7 * DAY_MS);
    expect(week.filter((meal) => meal.hypoTreated).length).toBeLessThanOrEqual(1);

    const unevaluated = plan.meals.filter((meal) => meal.outcome === null && !meal.feedbackSkipped);
    expect(unevaluated).toHaveLength(1);
    const ago = now.getTime() - (unevaluated[0]?.eatenAt.getTime() ?? 0);
    expect(ago).toBe(2.5 * 60 * 60 * 1000);
    expect(plan.meals.every((meal) => meal.eatenAt <= now)).toBe(true);
  });

  it("is realistic and varied", () => {
    const now = NOWS[0]!;
    const plan = buildDemoPlan({ now, timeZone: TZ });
    const perDay = plan.meals.length / DEMO_DAYS;
    expect(perDay).toBeGreaterThan(3);
    expect(perDay).toBeLessThan(4.2);

    const evaluated = plan.meals.filter((meal) => meal.outcome !== null);
    const perfect = evaluated.filter((meal) => meal.outcome === "PERFECT").length;
    expect(perfect / evaluated.length).toBeGreaterThan(0.55);
    expect(perfect / evaluated.length).toBeLessThan(0.75);

    const count = (name: string) => plan.meals.filter((meal) => meal.dish === name).length;
    expect(count("Raclette")).toBe(3);
    expect(count("Pâtes au pesto")).toBe(4);

    for (const meal of plan.meals) {
      expect(meal.carbsGrams).toBeGreaterThanOrEqual(15);
      expect(meal.carbsGrams).toBeLessThanOrEqual(120);
      expect(meal.insulinUnits % 0.5).toBe(0);
      expect(meal.correctionUnits).toBeLessThanOrEqual(meal.insulinUnits);
      if (meal.correctionUnits > 0) expect(meal.glucoseBefore).toBeGreaterThan(1.8);
    }
    const tags = new Set(plan.meals.flatMap((meal) => meal.tags));
    expect([...tags].sort()).toEqual(
      ["ALCOHOL", "ATYPICAL", "PERIOD", "SICK", "SLOW_ABSORPTION", "SPORT", "STRESS"].sort(),
    );
    expect(plan.basal.length).toBeGreaterThanOrEqual(DEMO_DAYS - 1);
    expect(new Set(plan.basal.map((log) => log.day)).size).toBe(plan.basal.length);
    expect(plan.favorites.length).toBeGreaterThan(0);
  });

  it("is deterministic for a given now", () => {
    const now = NOWS[1]!;
    expect(buildDemoPlan({ now, timeZone: TZ })).toEqual(buildDemoPlan({ now, timeZone: TZ }));
  });

  it("tells the ratio story: onboarding, a manual change and an accepted suggestion", () => {
    const plan = buildDemoPlan({ now: NOWS[0]!, timeZone: TZ });
    expect(plan.ratios).toEqual({
      DEFAULT: 12,
      BREAKFAST: 8,
      LUNCH: 12,
      AFTERNOON_SNACK: 15,
      DINNER: 12,
      SNACK: 15,
    });
    const origins = plan.ratioChanges.map((change) => change.origin);
    expect(origins).toContain("MANUAL");
    expect(origins).toContain("SUGGESTION");
    expect(plan.ratioChanges.every((change) => change.justification.length > 0)).toBe(true);
    expect(plan.suggestions.some((suggestion) => suggestion.moment === "DINNER")).toBe(false);
  });
});

describe("demo art", () => {
  it.each(ART_KINDS)("draws a self-contained %s", (kind) => {
    for (let variant = 0; variant < ART_VARIANTS; variant += 1) {
      const svg = demoArtSvg(kind, variant);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain(`width="${ART_WIDTH}" height="${ART_HEIGHT}"`);
      // No CSS variables, external references or text: librsvg must render it alone.
      expect(svg).not.toMatch(/var\(|href=|<text|<image/);
    }
  });
});
