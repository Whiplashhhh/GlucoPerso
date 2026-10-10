/**
 * Pure builder of the demo dataset: six weeks of Camille's meals, basal logs
 * and ratio history, ending at `now`. No database here, so the result can be
 * checked by unit tests and by the ratio engine before anything is written.
 */
import { TZDate } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";
import { dayKey } from "@/lib/dates";
import { type MealMoment, type RatioMoment, type RatioTable, momentAt } from "@/lib/moments";
import {
  type MealTag,
  type Outcome,
  type RatioAnalysis,
  type RatioMeal,
  analyzeAllRatios,
  buildExplanation,
  isWithinDays,
} from "@/lib/ratio";
import { ART_VARIANTS, type ArtKind } from "./art";
import { DEMO_DISHES, type DemoDish, PESTO, PIZZA, RACLETTE, dishNamed } from "./catalog";
import { type Rng, createRng, roundGlucose, roundToStep } from "./random";

export const DEMO_DAYS = 42;
export const DEMO_SEED = 20_26;
export const PEN_INCREMENT = 0.5;
export const HYPO_THRESHOLD = 0.7;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** The meal still waiting for « Comment ça s'est passé ? ». */
const PENDING_AGO_MS = 2.5 * HOUR_MS;

export type PlannedMeal = {
  key: string;
  dish: string;
  moment: MealMoment;
  eatenAt: Date;
  carbsGrams: number;
  insulinUnits: number;
  correctionUnits: number;
  ratioUsed: number;
  glucoseBefore: number | null;
  tags: MealTag[];
  notes: string | null;
  outcome: Outcome | null;
  outcomeAt: Date | null;
  glucoseAfter: number | null;
  glucoseLow: number | null;
  glucoseHigh: number | null;
  hypoTreated: boolean | null;
  outcomeNote: string | null;
  feedbackSkipped: boolean;
  art: { kind: ArtKind; variant: number } | null;
};

export type PlannedRatioChange = {
  moment: RatioMoment;
  fromValue: number | null;
  toValue: number;
  origin: "ONBOARDING" | "MANUAL" | "SUGGESTION";
  justification: string;
  createdAt: Date;
};

export type PlannedSuggestion = {
  moment: RatioMoment;
  fromValue: number;
  toValue: number;
  signal: "TOO_MUCH" | "NOT_ENOUGH";
  mealKeys: string[];
  explanation: string;
  status: "ACCEPTED" | "DISMISSED";
  createdAt: Date;
};

export type PlannedBasal = { day: string; units: number; takenAt: Date };

export type DemoPlan = {
  startedAt: Date;
  ratios: RatioTable;
  ratioChanges: PlannedRatioChange[];
  suggestions: PlannedSuggestion[];
  meals: PlannedMeal[];
  basal: PlannedBasal[];
  favorites: string[];
};

// ───────────────────────────── Time helpers ─────────────────────────────

/** Local midnight `offset` days from today (0 = today), in `timeZone`. */
function localDay(now: Date, timeZone: string, offset: number): TZDate {
  return addDays(startOfDay(new TZDate(now, timeZone)), offset);
}

/** An instant at `minutes` past local midnight of `day`. */
function at(day: TZDate, minutes: number, timeZone: string): Date {
  const local = new TZDate(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
    timeZone,
  );
  return new Date(local.getTime());
}

// ───────────────────────────── Ratio history ─────────────────────────────

const STARTING_RATIOS: Record<RatioMoment, number> = {
  DEFAULT: 12,
  BREAKFAST: 9,
  LUNCH: 11,
  AFTERNOON_SNACK: 15,
  DINNER: 12,
  SNACK: 15,
};

function ratioAt(changes: PlannedRatioChange[], moment: RatioMoment, date: Date): number {
  let value = STARTING_RATIOS[moment];
  for (const change of changes) {
    if (change.moment === moment && change.createdAt <= date) value = change.toValue;
  }
  return value;
}

// ───────────────────────────── Meal slots ─────────────────────────────

type Slot = { moment: MealMoment; minutes: number };

function daySlots(rng: Rng, weekend: boolean): Slot[] {
  const slots: Slot[] = [];
  if (rng.chance(0.95)) {
    slots.push({
      moment: "BREAKFAST",
      minutes: weekend ? rng.int(9 * 60, 10 * 60 + 15) : rng.int(7 * 60 + 15, 8 * 60 + 40),
    });
  }
  slots.push({ moment: "LUNCH", minutes: rng.int(12 * 60 + 5, 13 * 60 + 20) });
  if (rng.chance(weekend ? 0.6 : 0.45)) {
    slots.push({ moment: "AFTERNOON_SNACK", minutes: rng.int(16 * 60, 17 * 60 + 15) });
  }
  slots.push({ moment: "DINNER", minutes: rng.int(19 * 60 + 25, 20 * 60 + 50) });
  if (rng.chance(0.08)) slots.push({ moment: "SNACK", minutes: rng.int(22 * 60, 22 * 60 + 45) });
  return slots;
}

/** Dishes placed on purpose so « Déjà mangé » and dish grouping have history. */
const FORCED: Readonly<Record<number, Partial<Record<MealMoment, string>>>> = {
  [-38]: { DINNER: RACLETTE },
  [-36]: { LUNCH: PESTO },
  [-33]: { DINNER: PIZZA },
  [-26]: { LUNCH: PESTO },
  [-24]: { DINNER: RACLETTE },
  [-19]: { DINNER: PIZZA },
  [-12]: { LUNCH: PESTO, DINNER: RACLETTE },
  [-3]: { LUNCH: PESTO },
};

/** Meals of the last week stay simple: no apéro, no raclette, home is calm. */
const QUIET_DAYS = 7;

function pickDish(
  rng: Rng,
  moment: MealMoment,
  weekend: boolean,
  previous: string | undefined,
): DemoDish {
  const pool = DEMO_DISHES.filter(
    (dish) =>
      dish.moment === moment &&
      dish.weight > 0 &&
      (weekend || !dish.weekend) &&
      dish.name !== previous,
  );
  return rng.weighted(pool.map((dish) => [dish, dish.weight] as const));
}

// ───────────────────────────── Tags & notes ─────────────────────────────

const PERIOD_DAYS = new Set([-26, -25, -24, -23]);
const STRESS_DAYS = new Set([-16, -15]);
const SICK_DAYS = new Set([-35]);

const SPORT_NOTES = ["Séance de danse juste après", "Footing de 40 min avant", "Piscine avec Inès"];
const ALCOHOL_NOTES = ["Apéro avec les copines", "Un verre de vin avec le dîner"];
const SLOW_NOTE = "Les glucides sont arrivés 3 h après";

function tagsFor(
  rng: Rng,
  offset: number,
  moment: MealMoment,
  dish: DemoDish,
  friday: boolean,
): { tags: MealTag[]; notes: string | null } {
  const tags: MealTag[] = [];
  const notes: string[] = [];
  const quiet = offset > -QUIET_DAYS;

  if (dish.slow) {
    tags.push("SLOW_ABSORPTION");
    notes.push(SLOW_NOTE);
  }
  if (PERIOD_DAYS.has(offset)) tags.push("PERIOD");
  if (SICK_DAYS.has(offset)) {
    tags.push("SICK");
    notes.push("Petit rhume, pas très faim");
  }
  if (STRESS_DAYS.has(offset) && moment === "LUNCH") {
    tags.push("STRESS");
    notes.push("Journée de partiels");
  }
  if (!quiet && (moment === "LUNCH" || moment === "AFTERNOON_SNACK") && rng.chance(0.13)) {
    tags.push("SPORT");
    notes.push(rng.pick(SPORT_NOTES));
  }
  // Dinners with friends: raclette and pizza are soirées, Fridays sometimes apéro.
  if (moment === "DINNER" && !quiet && (dish.slow || (friday && rng.chance(0.5)))) {
    tags.push("ALCOHOL");
    notes.push(rng.pick(ALCOHOL_NOTES));
  }
  if (offset === -31 && moment === "LUNCH") {
    tags.push("ATYPICAL");
    notes.push("Resto, glucides estimés au pif");
  }
  if (offset === -9 && moment === "LUNCH") {
    tags.push("ATYPICAL");
    notes.push("Repas de famille, impossible de peser");
  }
  return { tags, notes: notes.length ? notes.join(". ") : null };
}

// ───────────────────────────── Outcomes ─────────────────────────────

/** Notes depend on the time of day: evening meals end at bedtime. */
const TOO_MUCH_NOTES = {
  evening: ["Petite descente vers 23 h", "Un peu basse avant le coucher", null],
  day: ["Petite descente 2 h après", "Un peu basse avant le repas suivant", null],
};
const HYPO_NOTES = ["Ressucrée avec 2 morceaux de sucre", "Ressucrée avec un jus de pomme"];
const HIGH_NOTES = {
  evening: ["Un peu haute au coucher", "Montée vers minuit", null],
  day: ["Un peu haute 2 h après", "Encore haute au repas suivant", null],
};

function randomOutcome(rng: Rng, meal: PlannedMeal): Outcome {
  if (meal.tags.includes("SPORT")) {
    return rng.weighted([
      ["TOO_MUCH", 5],
      ["PERFECT", 4],
    ]);
  }
  if (meal.tags.includes("SLOW_ABSORPTION") || meal.tags.includes("STRESS")) {
    return rng.weighted([
      ["NOT_ENOUGH", 6],
      ["PERFECT", 3],
    ]);
  }
  return rng.weighted([
    ["PERFECT", 70],
    ["TOO_MUCH", 15],
    ["NOT_ENOUGH", 15],
  ]);
}

/** Fills what she noted after the meal, consistent with `outcome`. */
function describeOutcome(rng: Rng, meal: PlannedMeal, outcome: Outcome, hypo = false): void {
  meal.outcome = outcome;
  meal.outcomeAt = new Date(meal.eatenAt.getTime() + rng.int(150, 240) * MINUTE_MS);
  meal.glucoseLow = null;
  meal.glucoseHigh = null;
  meal.hypoTreated = null;
  meal.outcomeNote = null;
  const time = meal.moment === "DINNER" || meal.moment === "SNACK" ? "evening" : "day";
  if (outcome === "PERFECT") {
    meal.glucoseAfter = rng.chance(0.8) ? roundGlucose(rng.between(0.95, 1.5)) : null;
  } else if (outcome === "TOO_MUCH") {
    meal.glucoseAfter = roundGlucose(rng.between(0.72, 0.9));
    meal.hypoTreated = hypo;
    meal.glucoseLow = hypo
      ? roundGlucose(rng.between(0.55, 0.66))
      : roundGlucose(rng.between(0.7, 0.8));
    meal.outcomeNote = hypo ? rng.pick(HYPO_NOTES) : rng.pick(TOO_MUCH_NOTES[time]);
  } else {
    meal.glucoseAfter = roundGlucose(rng.between(1.9, 2.5));
    meal.glucoseHigh = rng.chance(0.5) ? roundGlucose(rng.between(2.3, 2.9)) : null;
    meal.outcomeNote = meal.tags.includes("SLOW_ABSORPTION")
      ? "Montée tardive, la prochaine fois j'injecte en deux fois"
      : rng.pick(HIGH_NOTES[time]);
  }
}

/** Meal bolus at `ratio` with a little human noise, on the pen's 0.5 U steps. */
function bolusFor(rng: Rng, carbs: number, ratio: number, noise = 0.06): number {
  const raw = (carbs / ratio) * rng.between(1 - noise, 1 + noise);
  return Math.max(PEN_INCREMENT, roundToStep(raw, PEN_INCREMENT));
}

// ───────────────────────────── Engine check ─────────────────────────────

export function toRatioMeals(meals: PlannedMeal[]): RatioMeal[] {
  return meals.map((meal) => ({
    id: meal.key,
    name: meal.dish,
    eatenAt: meal.eatenAt,
    moment: meal.moment,
    carbsGrams: meal.carbsGrams,
    insulinUnits: meal.insulinUnits,
    correctionUnits: meal.correctionUnits,
    tags: meal.tags,
    outcome: meal.outcome,
    hypoTreated: meal.hypoTreated,
  }));
}

/** What the home screen will compute for this plan at `now`. */
export function analyzePlan(plan: DemoPlan, now: Date): RatioAnalysis[] {
  const lastSuggestionAt: Partial<Record<RatioMoment, Date>> = {};
  for (const suggestion of plan.suggestions) {
    const previous = lastSuggestionAt[suggestion.moment];
    if (!previous || previous < suggestion.createdAt) {
      lastSuggestionAt[suggestion.moment] = suggestion.createdAt;
    }
  }
  return analyzeAllRatios({
    ratios: plan.ratios,
    meals: toRatioMeals(plan.meals).filter((meal) => isWithinDays(meal, now, 22)),
    now,
    lastSuggestionAt,
  });
}

// ───────────────────────────── Builder ─────────────────────────────

/** The DINNER story: 3 descents on the last 4 evaluated dinners. */
const DINNER_STORY: readonly Outcome[] = ["TOO_MUCH", "TOO_MUCH", "PERFECT", "TOO_MUCH", "PERFECT"];

export function buildDemoPlan({
  now,
  timeZone,
  seed = DEMO_SEED,
}: {
  now: Date;
  timeZone: string;
  seed?: number;
}): DemoPlan {
  const rng = createRng(seed);
  const firstDay = localDay(now, timeZone, -(DEMO_DAYS - 1));
  const startedAt = at(firstDay, 6 * 60 + 30, timeZone);

  // Ratio history: onboarding, a change from her diabetologist, an accepted suggestion.
  const ratioChanges: PlannedRatioChange[] = (
    Object.entries(STARTING_RATIOS) as [RatioMoment, number][]
  ).map(([moment, toValue]) => ({
    moment,
    fromValue: null,
    toValue,
    origin: "ONBOARDING",
    justification: "Ratio de départ donné par ton équipe médicale",
    createdAt: startedAt,
  }));
  ratioChanges.push({
    moment: "BREAKFAST",
    fromValue: 9,
    toValue: 8,
    origin: "MANUAL",
    justification: "Conseil de ma diabétologue au rendez-vous : un peu plus d'insuline le matin",
    createdAt: at(localDay(now, timeZone, -30), 18 * 60 + 10, timeZone),
  });
  const lunchSuggestionAt = at(localDay(now, timeZone, -18), 14 * 60 + 40, timeZone);

  // 1. Meals with dishes, tags, carbs and glucose before.
  const pendingAt = new Date(now.getTime() - PENDING_AGO_MS);
  const pendingMoment = momentAt(pendingAt, timeZone);
  const meals: PlannedMeal[] = [];
  const previousDish: Partial<Record<MealMoment, string>> = {};
  const variantOf = new Map<string, number>();

  const addMeal = (dish: DemoDish, moment: MealMoment, eatenAt: Date, offset: number) => {
    const weekday = new TZDate(eatenAt, timeZone).getDay();
    const { tags, notes } = tagsFor(rng, offset, moment, dish, weekday === 5);
    const glucoseBefore = rng.chance(0.85)
      ? roundGlucose(rng.chance(0.12) ? rng.between(1.85, 2.45) : rng.between(0.85, 1.6))
      : null;
    const baseVariant = variantOf.get(dish.name) ?? rng.int(0, ART_VARIANTS - 1);
    variantOf.set(dish.name, baseVariant);
    const isRecent = now.getTime() - eatenAt.getTime() < DAY_MS;
    const meal: PlannedMeal = {
      key: `demo-${String(meals.length).padStart(3, "0")}`,
      dish: dish.name,
      moment,
      eatenAt,
      carbsGrams: rng.int(dish.carbs[0], dish.carbs[1]),
      insulinUnits: 0,
      correctionUnits: 0,
      ratioUsed: 0,
      glucoseBefore,
      tags,
      notes,
      outcome: null,
      outcomeAt: null,
      glucoseAfter: null,
      glucoseLow: null,
      glucoseHigh: null,
      hypoTreated: null,
      outcomeNote: null,
      feedbackSkipped: false,
      art:
        isRecent || rng.chance(0.58)
          ? {
              kind: dish.art,
              variant: rng.chance(0.25) ? (baseVariant + 1) % ART_VARIANTS : baseVariant,
            }
          : null,
    };
    meals.push(meal);
    previousDish[moment] = dish.name;
    return meal;
  };

  for (let offset = -(DEMO_DAYS - 1); offset <= 0; offset += 1) {
    const day = localDay(now, timeZone, offset);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    let slots = daySlots(rng, weekend);
    if (offset === 0) {
      // Today: one earlier meal at most, then the one waiting for feedback.
      slots = slots
        .filter(
          (slot) =>
            slot.moment !== pendingMoment &&
            at(day, slot.minutes, timeZone).getTime() <= pendingAt.getTime() - HOUR_MS,
        )
        .slice(-1);
    }
    for (const slot of slots) {
      const forced = FORCED[offset]?.[slot.moment];
      const dish = forced
        ? dishNamed(forced)
        : pickDish(rng, slot.moment, weekend, previousDish[slot.moment]);
      addMeal(dish, slot.moment, at(day, slot.minutes, timeZone), offset);
    }
  }
  const pendingDish = pickDish(rng, pendingMoment, false, previousDish[pendingMoment]);
  const pending = addMeal(pendingDish, pendingMoment, pendingAt, 0);
  meals.sort((a, b) => a.eatenAt.getTime() - b.eatenAt.getTime());

  // 2. Outcomes. Everything is evaluated except the pending meal and a few skipped ones.
  for (const meal of meals) {
    if (meal === pending) continue;
    if (now.getTime() - meal.eatenAt.getTime() > 4 * DAY_MS && rng.chance(0.04)) {
      meal.feedbackSkipped = true;
      continue;
    }
    const outcome = randomOutcome(rng, meal);
    describeOutcome(rng, meal, outcome, outcome === "TOO_MUCH" && rng.chance(0.25));
  }

  // The LUNCH suggestion she accepted 18 days ago came from 3 descents.
  const lunchesBefore = meals
    .filter(
      (meal) =>
        meal.moment === "LUNCH" &&
        meal.eatenAt < lunchSuggestionAt &&
        meal.tags.length === 0 &&
        lunchSuggestionAt.getTime() - meal.eatenAt.getTime() < 8 * DAY_MS,
    )
    .reverse();
  const lunchSignal = lunchesBefore.slice(0, 5);
  lunchSignal.forEach((meal, index) =>
    describeOutcome(rng, meal, index === 1 ? "PERFECT" : index < 4 ? "TOO_MUCH" : "PERFECT"),
  );
  const lunchMealKeys = lunchSignal
    .filter((meal) => meal.outcome === "TOO_MUCH")
    .map((meal) => meal.key);

  // Recent dinners: 3 descents on the last 4, while dinners dosed a bit lighter went well.
  const windowStart = now.getTime() - 21 * DAY_MS;
  const recentDinners = meals
    .filter(
      (meal) =>
        meal.moment === "DINNER" &&
        meal !== pending &&
        !meal.feedbackSkipped &&
        meal.eatenAt.getTime() >= windowStart &&
        !meal.tags.some((tag) => ["SPORT", "SICK", "ALCOHOL", "ATYPICAL"].includes(tag)),
    )
    .reverse();
  recentDinners.forEach((meal, index) => {
    const story = DINNER_STORY[index];
    if (story) describeOutcome(rng, meal, story, index === 1);
    else if (meal.outcome === "TOO_MUCH") describeOutcome(rng, meal, "PERFECT");
  });

  const lunchSuggestion: PlannedSuggestion = {
    moment: "LUNCH",
    fromValue: 11,
    toValue: 12,
    signal: "TOO_MUCH",
    mealKeys: lunchMealKeys,
    explanation: buildExplanation(
      "LUNCH",
      "TOO_MUCH",
      lunchMealKeys.length,
      lunchSignal.length,
      [],
    ),
    status: "ACCEPTED",
    createdAt: lunchSuggestionAt,
  };
  const suggestions = [lunchSuggestion];
  ratioChanges.push({
    moment: "LUNCH",
    fromValue: 11,
    toValue: 12,
    origin: "SUGGESTION",
    justification: lunchSuggestion.explanation,
    createdAt: lunchSuggestionAt,
  });

  // 3. Doses, from the ratio in force and the glucose before.
  const dinnerStory = new Set(recentDinners.map((meal) => meal.key));
  for (const meal of meals) {
    meal.ratioUsed = ratioAt(ratioChanges, meal.moment, meal.eatenAt);
    const before = meal.glucoseBefore ?? 0;
    // About 1 U per 0.5 g/L above 1.30 g/L, as her team taught her.
    meal.correctionUnits =
      before > 1.8 ? Math.max(PEN_INCREMENT, roundToStep((before - 1.3) / 0.5, PEN_INCREMENT)) : 0;
    let bolus: number;
    if (dinnerStory.has(meal.key)) {
      // Dinners where she followed 12 g/U exactly ended low; lighter ones went well.
      bolus =
        meal.outcome === "TOO_MUCH"
          ? Math.max(PEN_INCREMENT, roundToStep(meal.carbsGrams / meal.ratioUsed, PEN_INCREMENT))
          : bolusFor(rng, meal.carbsGrams, 13.5, 0.03);
    } else {
      bolus = bolusFor(rng, meal.carbsGrams, meal.ratioUsed);
    }
    meal.insulinUnits = bolus + meal.correctionUnits;
  }

  const plan: DemoPlan = {
    startedAt,
    ratios: { ...STARTING_RATIOS, BREAKFAST: 8, LUNCH: 12 },
    ratioChanges,
    suggestions,
    meals,
    basal: [],
    favorites: DEMO_DISHES.filter((dish) => dish.favorite).map((dish) => dish.name),
  };

  // 4. Keep the home calm: only the DINNER suggestion, at most one treated hypo this week.
  for (let round = 0; round < 20; round += 1) {
    const noisy = analyzePlan(plan, now).filter(
      (analysis) => analysis.key !== "DINNER" && analysis.suggestion,
    );
    if (!noisy.length) break;
    for (const analysis of noisy) {
      const newest = plan.meals.find((meal) => meal.key === analysis.suggestion?.mealIds[0]);
      if (newest) describeOutcome(rng, newest, "PERFECT");
    }
  }
  const hypoKeeper = recentDinners[1]?.key;
  for (const meal of meals) {
    if (
      meal.hypoTreated &&
      meal.key !== hypoKeeper &&
      now.getTime() - meal.eatenAt.getTime() <= 7 * DAY_MS
    ) {
      describeOutcome(rng, meal, "TOO_MUCH", false);
    }
  }

  // 5. Basal every morning around 8 h (today only once it has been taken).
  for (let offset = -(DEMO_DAYS - 1); offset <= 0; offset += 1) {
    const day = localDay(now, timeZone, offset);
    const takenAt = at(day, rng.int(7 * 60 + 40, 8 * 60 + 30), timeZone);
    if (takenAt > now) continue;
    plan.basal.push({
      day: dayKey(takenAt, timeZone),
      units: rng.weighted([
        [14, 7],
        [14.5, 2],
        [13.5, 1.5],
        [15, 0.5],
      ]),
      takenAt,
    });
  }

  return plan;
}
