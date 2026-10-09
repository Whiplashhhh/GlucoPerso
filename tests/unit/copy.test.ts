import { describe, expect, it } from "vitest";
import {
  ENCOURAGEMENTS,
  KIND_AFTER_MISS,
  WORDS_OF_THE_DAY,
  greeting,
  pickForDay,
  pickRandom,
} from "@/lib/copy";

describe("microcopy", () => {
  it("has at least 20 distinct encouragements and words of the day", () => {
    expect(new Set(ENCOURAGEMENTS).size).toBeGreaterThanOrEqual(20);
    expect(new Set(WORDS_OF_THE_DAY).size).toBeGreaterThanOrEqual(20);
    expect(KIND_AFTER_MISS.length).toBeGreaterThan(3);
  });

  it("never blames", () => {
    const all = [...ENCOURAGEMENTS, ...KIND_AFTER_MISS, ...WORDS_OF_THE_DAY].join(" ");
    expect(all).not.toMatch(/\b(faute|erreur|mauvais|échec|raté ton)\b/i);
  });

  it("greets according to the hour", () => {
    expect(greeting("Léa", 8).title).toBe("Coucou Léa ☀️");
    expect(greeting("Léa", 12).subtitle).toContain("régaler");
    expect(greeting("Léa", 16).title).toContain("🌤️");
    expect(greeting("Léa", 20).title).toBe("Bonsoir Léa 🌙");
    expect(greeting("Léa", 2).subtitle).toContain("nocturne");
  });

  it("picks the same word all day and random items within the list", () => {
    const morning = new Date("2026-10-10T07:00:00Z");
    const evening = new Date("2026-10-10T21:00:00Z");
    expect(pickForDay(WORDS_OF_THE_DAY, morning)).toBe(pickForDay(WORDS_OF_THE_DAY, evening));
    expect(pickRandom(["a", "b"], () => 0.99)).toBe("b");
  });
});
