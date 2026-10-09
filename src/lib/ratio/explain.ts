import { formatRatio } from "@/lib/format";
import { MOMENT_IN_SENTENCE, type RatioMoment } from "@/lib/moments";
import type { MealTag, Signal } from "./types";

/** What happened recently, said gently: « tu as eu 3 descentes sur tes 4 derniers repas ». */
export function explainSignal(
  key: RatioMoment,
  signal: Signal,
  count: number,
  total: number,
): string {
  const when = `Ces derniers temps ${MOMENT_IN_SENTENCE[key]}`;
  if (signal === "TOO_MUCH") {
    return (
      `${when}, tu as eu ${count} descentes sur tes ${total} derniers repas. ` +
      "Un tout petit peu moins d'insuline pourrait t'aider."
    );
  }
  return (
    `${when}, ta glycémie est restée un peu haute ${count} fois sur tes ${total} derniers repas. ` +
    "Un tout petit peu plus d'insuline pourrait t'aider."
  );
}

/** Short note when some meals happened during periods or stress; null otherwise. */
export function flaggedNote(tags: MealTag[]): string | null {
  const period = tags.includes("PERIOD");
  const stress = tags.includes("STRESS");
  if (period && stress) {
    return "Certains de ces repas étaient pendant tes règles ou une période de stress, ça peut jouer.";
  }
  if (period) return "Certains de ces repas étaient pendant tes règles, ça peut jouer.";
  if (stress) return "Certains de ces repas étaient pendant une période de stress, ça peut jouer.";
  return null;
}

export function buildExplanation(
  key: RatioMoment,
  signal: Signal,
  count: number,
  total: number,
  tags: MealTag[],
): string {
  const note = flaggedNote(tags);
  const main = explainSignal(key, signal, count, total);
  return note === null ? main : `${main} ${note}`;
}

/** « Passer de 1 U / 12 g à 1 U / 13 g ? » */
export function buildQuestion(fromValue: number, toValue: number): string {
  return `Passer de ${formatRatio(fromValue)} à ${formatRatio(toValue)} ?`;
}
