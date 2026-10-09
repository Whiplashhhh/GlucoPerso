export const MEAL_TAGS = [
  "SLOW_ABSORPTION",
  "SPORT",
  "SICK",
  "PERIOD",
  "ALCOHOL",
  "STRESS",
  "ATYPICAL",
] as const;
export type MealTag = (typeof MEAL_TAGS)[number];

export const TAG_INFO: Record<MealTag, { emoji: string; label: string }> = {
  SLOW_ABSORPTION: { emoji: "🍿", label: "Absorption lente / gras" },
  SPORT: { emoji: "🏃", label: "Sport" },
  SICK: { emoji: "🤒", label: "Malade" },
  PERIOD: { emoji: "🌸", label: "Règles" },
  ALCOHOL: { emoji: "🍷", label: "Alcool" },
  STRESS: { emoji: "😰", label: "Stress" },
  ATYPICAL: { emoji: "⚠️", label: "Atypique" },
};
