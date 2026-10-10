import type { Outcome } from "@/lib/glucose";

export const OUTCOMES: Outcome[] = ["TOO_MUCH", "PERFECT", "NOT_ENOUGH"];

/**
 * Kind wording and colours for each outcome. Colour is never the only cue:
 * every outcome also has its own shape (see OutcomeDot).
 */
export const OUTCOME_INFO: Record<
  Outcome,
  { label: string; short: string; hint: string; emoji: string; tone: string; soft: string }
> = {
  TOO_MUCH: {
    label: "Un peu trop d'insuline",
    short: "Un peu trop",
    hint: "Ça a bien descendu, voire une hypo",
    emoji: "🫧",
    tone: "bg-lavender text-on-pastel",
    soft: "bg-lavender-soft text-lavender-ink",
  },
  PERFECT: {
    label: "Pile poil",
    short: "Pile poil",
    hint: "Ma glycémie est restée sage",
    emoji: "🎯",
    tone: "bg-mint text-on-pastel",
    soft: "bg-mint-soft text-mint-ink",
  },
  NOT_ENOUGH: {
    label: "Pas assez",
    short: "Pas assez",
    hint: "Ma glycémie est restée un peu haute",
    emoji: "☁️",
    tone: "bg-amber text-on-pastel",
    soft: "bg-amber-soft text-amber-ink",
  },
};
