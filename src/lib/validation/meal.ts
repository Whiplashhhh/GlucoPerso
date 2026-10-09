import { z } from "zod";
import { GLUCOSE_MAX_GL, GLUCOSE_MIN_GL } from "@/lib/glucose";
import { MEAL_TAGS } from "@/lib/tags";
import { decimal, id, mealMoment } from "@/lib/validation/common";

const DAY_MS = 24 * 60 * 60 * 1000;

const glucose = decimal.pipe(
  z
    .number()
    .min(GLUCOSE_MIN_GL, "Cette glycémie semble bien basse, vérifie-la")
    .max(GLUCOSE_MAX_GL, "Cette glycémie semble bien haute, vérifie-la"),
);

export const optionalGlucose = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  glucose.nullable(),
);

export const mealInputSchema = z
  .object({
    name: z.string().trim().min(1, "Comment s'appelle ce plat ?").max(80, "Un nom plus court ?"),
    eatenAt: z.coerce
      .date()
      .refine((date) => date.getTime() <= Date.now() + 60 * 60 * 1000, "Ce repas est dans le futur")
      .refine(
        (date) => date.getTime() >= Date.now() - 366 * DAY_MS,
        "Ce repas date d'il y a plus d'un an",
      ),
    moment: mealMoment,
    carbsGrams: decimal.pipe(
      z.number().min(0, "Des glucides positifs").max(500, "Plus de 500 g, vraiment ?"),
    ),
    insulinUnits: decimal.pipe(
      z.number().min(0, "Des unités positives").max(60, "Plus de 60 U, vraiment ?"),
    ),
    correctionUnits: decimal.pipe(z.number().min(0).max(30)).default(0),
    glucoseBefore: optionalGlucose.default(null),
    tags: z
      .array(z.enum(MEAL_TAGS))
      .max(MEAL_TAGS.length)
      .default([])
      .transform((tags) => [...new Set(tags)]),
    notes: z
      .string()
      .trim()
      .max(1000)
      .nullish()
      .transform((value) => value || null),
    photoId: id.nullish().transform((value) => value ?? null),
    confirmedHighDose: z.boolean().default(false),
  })
  .refine((meal) => meal.correctionUnits <= meal.insulinUnits, {
    path: ["correctionUnits"],
    message: "La correction fait partie des unités injectées",
  });

export type MealInput = z.infer<typeof mealInputSchema>;
