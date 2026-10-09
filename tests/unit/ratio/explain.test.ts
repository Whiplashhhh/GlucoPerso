import { describe, expect, it } from "vitest";
import { buildExplanation, buildQuestion, explainSignal, flaggedNote } from "@/lib/ratio";

describe("explainSignal", () => {
  it("talks about descents when there was too much insulin", () => {
    expect(explainSignal("DINNER", "TOO_MUCH", 3, 4)).toBe(
      "Ces derniers temps au dîner, tu as eu 3 descentes sur tes 4 derniers repas. " +
        "Un tout petit peu moins d'insuline pourrait t'aider.",
    );
  });

  it("talks about staying a bit high when there was not enough", () => {
    expect(explainSignal("BREAKFAST", "NOT_ENOUGH", 4, 5)).toBe(
      "Ces derniers temps au petit-déj, ta glycémie est restée un peu haute 4 fois " +
        "sur tes 5 derniers repas. Un tout petit peu plus d'insuline pourrait t'aider.",
    );
  });

  it("says « en général » for the general ratio", () => {
    expect(explainSignal("DEFAULT", "TOO_MUCH", 3, 3)).toMatch(/^Ces derniers temps en général, /);
  });
});

describe("flaggedNote", () => {
  it("mentions periods and stress gently", () => {
    expect(flaggedNote(["PERIOD", "STRESS"])).toBe(
      "Certains de ces repas étaient pendant tes règles ou une période de stress, ça peut jouer.",
    );
    expect(flaggedNote(["PERIOD"])).toBe(
      "Certains de ces repas étaient pendant tes règles, ça peut jouer.",
    );
    expect(flaggedNote(["STRESS"])).toBe(
      "Certains de ces repas étaient pendant une période de stress, ça peut jouer.",
    );
  });

  it("adds nothing otherwise", () => {
    expect(flaggedNote([])).toBeNull();
    expect(flaggedNote(["SLOW_ABSORPTION"])).toBeNull();
  });
});

describe("buildExplanation", () => {
  it("appends the note when some meals are flagged", () => {
    expect(buildExplanation("LUNCH", "NOT_ENOUGH", 3, 3, ["STRESS"])).toBe(
      "Ces derniers temps au déjeuner, ta glycémie est restée un peu haute 3 fois " +
        "sur tes 3 derniers repas. Un tout petit peu plus d'insuline pourrait t'aider. " +
        "Certains de ces repas étaient pendant une période de stress, ça peut jouer.",
    );
  });

  it("is the main sentence alone otherwise", () => {
    expect(buildExplanation("DINNER", "TOO_MUCH", 3, 4, [])).toBe(
      explainSignal("DINNER", "TOO_MUCH", 3, 4),
    );
  });

  it("never sounds guilt-inducing", () => {
    const texts = [
      buildExplanation("DINNER", "TOO_MUCH", 3, 4, ["PERIOD", "STRESS"]),
      buildExplanation("SNACK", "NOT_ENOUGH", 4, 5, ["PERIOD"]),
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/erreur|faute|mauvais|trop mangé|aurais dû|oublié/i);
    }
  });
});

describe("buildQuestion", () => {
  it("asks before changing the ratio", () => {
    expect(buildQuestion(12, 13)).toBe("Passer de 1 U / 12 g à 1 U / 13 g ?");
    expect(buildQuestion(12, 11.5)).toBe("Passer de 1 U / 12 g à 1 U / 11,5 g ?");
  });
});
