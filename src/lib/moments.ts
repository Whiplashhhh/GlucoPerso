export const MEAL_MOMENTS = ["BREAKFAST", "LUNCH", "AFTERNOON_SNACK", "DINNER", "SNACK"] as const;
export type MealMoment = (typeof MEAL_MOMENTS)[number];
export type RatioMoment = "DEFAULT" | MealMoment;

export const MOMENT_LABEL: Record<RatioMoment, string> = {
  DEFAULT: "Général",
  BREAKFAST: "Petit-déj",
  LUNCH: "Déjeuner",
  AFTERNOON_SNACK: "Goûter",
  DINNER: "Dîner",
  SNACK: "Encas",
};

/** Used inside sentences: « Ces derniers temps au dîner… ». */
export const MOMENT_IN_SENTENCE: Record<RatioMoment, string> = {
  DEFAULT: "en général",
  BREAKFAST: "au petit-déj",
  LUNCH: "au déjeuner",
  AFTERNOON_SNACK: "au goûter",
  DINNER: "au dîner",
  SNACK: "pour les encas",
};

export const MOMENT_EMOJI: Record<RatioMoment, string> = {
  DEFAULT: "✨",
  BREAKFAST: "🥐",
  LUNCH: "🥗",
  AFTERNOON_SNACK: "🍪",
  DINNER: "🌙",
  SNACK: "🍎",
};

/** Meal moment for a local hour (0–23). See DECISIONS.md for the ranges. */
export function momentForHour(hour: number): MealMoment {
  if (hour >= 5 && hour < 11) return "BREAKFAST";
  if (hour >= 11 && hour < 15) return "LUNCH";
  if (hour >= 15 && hour < 18) return "AFTERNOON_SNACK";
  if (hour >= 18 && hour < 23) return "DINNER";
  return "SNACK";
}

/** Local hour of `date` in `timeZone`. */
export function hourIn(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;
  return Number(hour ?? 0);
}

export function momentAt(date: Date, timeZone: string): MealMoment {
  return momentForHour(hourIn(date, timeZone));
}

export type RatioTable = Partial<Record<RatioMoment, number>>;

/**
 * The ratio that applies to a meal moment: its own ratio when defined,
 * otherwise the general one.
 */
export function resolveRatio(
  moment: MealMoment,
  ratios: RatioTable,
): { key: RatioMoment; gramsPerUnit: number } | null {
  const own = ratios[moment];
  if (own !== undefined) return { key: moment, gramsPerUnit: own };
  const general = ratios.DEFAULT;
  return general === undefined ? null : { key: "DEFAULT", gramsPerUnit: general };
}
