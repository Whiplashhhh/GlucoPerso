import { describe, expect, it } from "vitest";
import { outcomeHeadline, ratioTimeline, summarizeOutcomes } from "@/lib/stats";

describe("summarizeOutcomes", () => {
  it("counts outcomes per moment, in moment order, ignoring unrated meals", () => {
    const summary = summarizeOutcomes([
      { moment: "DINNER", outcome: "PERFECT" },
      { moment: "BREAKFAST", outcome: "TOO_MUCH" },
      { moment: "DINNER", outcome: "NOT_ENOUGH" },
      { moment: "DINNER", outcome: "PERFECT" },
      { moment: "LUNCH", outcome: null },
      { moment: "DEFAULT", outcome: "PERFECT" },
    ]);
    expect(summary.perMoment.map((entry) => entry.moment)).toEqual(["BREAKFAST", "DINNER"]);
    expect(summary.perMoment[1]).toEqual({
      moment: "DINNER",
      counts: { PERFECT: 2, TOO_MUCH: 0, NOT_ENOUGH: 1 },
      total: 3,
    });
    expect(summary.total).toBe(4);
    expect(summary.counts).toEqual({ PERFECT: 2, TOO_MUCH: 1, NOT_ENOUGH: 1 });
    expect(summary.perfectPercent).toBe(50);
  });

  it("has no percentage without evaluated meals", () => {
    expect(summarizeOutcomes([]).perfectPercent).toBeNull();
  });
});

describe("outcomeHeadline", () => {
  const counts = (PERFECT: number, TOO_MUCH = 0, NOT_ENOUGH = 0) => ({
    counts: { PERFECT, TOO_MUCH, NOT_ENOUGH },
    total: PERFECT + TOO_MUCH + NOT_ENOUGH,
  });

  it("celebrates a majority of « pile poil » with a big figure", () => {
    const headline = outcomeHeadline(
      { ...counts(17, 4, 4), perfectPercent: 68 },
      "ces 30 derniers jours",
    );
    expect(headline.figure).toBe("68 %");
    expect(headline.title).toBe("de pile poil ces 30 derniers jours 🎉");
  });

  it("stays positive when « pile poil » is a minority", () => {
    const headline = outcomeHeadline({ ...counts(2, 3, 3), perfectPercent: 25 }, "depuis le début");
    expect(headline.figure).toBeUndefined();
    expect(headline.title).toBe("2 repas pile poil depuis le début ✨");
  });

  it("thanks her even without any « pile poil »", () => {
    const headline = outcomeHeadline({ ...counts(0, 1, 2), perfectPercent: 0 }, "x");
    expect(headline.title).toContain("3 repas évalués");
    expect(headline.subtitle).toContain("Merci");
  });

  it("invites to give feedback when nothing is evaluated", () => {
    expect(outcomeHeadline({ ...counts(0), perfectPercent: null }, "x").title).toContain(
      "se dessine",
    );
  });
});

describe("ratioTimeline", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 8, day, 12));
  const changes = [
    { moment: "DEFAULT" as const, toValue: 10, createdAt: at(1) },
    { moment: "DINNER" as const, toValue: 12, createdAt: at(5) },
    { moment: "DEFAULT" as const, toValue: 11, createdAt: at(10) },
    { moment: "DINNER" as const, toValue: 13, createdAt: at(10) },
  ];

  it("builds step rows from every change, ending today", () => {
    const { rows, moments } = ratioTimeline(changes, null, at(20));
    expect(moments).toEqual(["DEFAULT", "DINNER"]);
    expect(rows).toEqual([
      { t: at(1).getTime(), DEFAULT: 10 },
      { t: at(5).getTime(), DEFAULT: 10, DINNER: 12 },
      { t: at(10).getTime(), DEFAULT: 11, DINNER: 13 },
      { t: at(20).getTime(), DEFAULT: 11, DINNER: 13 },
    ]);
  });

  it("starts at the period start with the values in force then", () => {
    const { rows } = ratioTimeline(changes, at(7), at(20));
    expect(rows[0]).toEqual({ t: at(7).getTime(), DEFAULT: 10, DINNER: 12 });
    expect(rows).toHaveLength(3);
  });

  it("draws a flat line when nothing changed during the period", () => {
    const { rows } = ratioTimeline(changes, at(15), at(20));
    expect(rows).toEqual([
      { t: at(15).getTime(), DEFAULT: 11, DINNER: 13 },
      { t: at(20).getTime(), DEFAULT: 11, DINNER: 13 },
    ]);
  });

  it("is empty without any ratio", () => {
    expect(ratioTimeline([], null, at(20))).toEqual({ rows: [], moments: [] });
  });

  it("ignores changes after now", () => {
    const { rows } = ratioTimeline(changes, null, at(3));
    expect(rows).toEqual([
      { t: at(1).getTime(), DEFAULT: 10 },
      { t: at(3).getTime(), DEFAULT: 10 },
    ]);
  });
});
