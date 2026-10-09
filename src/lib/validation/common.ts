import { z } from "zod";
import { MEAL_MOMENTS } from "@/lib/moments";

/** Accepts numbers typed with a comma ("4,5") as well as real numbers. */
export const decimal = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    return normalized === "" ? undefined : Number(normalized);
  }
  return value;
}, z.number().finite());

export const optionalDecimal = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  decimal.optional(),
);

export const firstName = z
  .string()
  .trim()
  .min(1, "Dis-moi comment tu t'appelles 😊")
  .max(40, "Un peu long pour un prénom, non ?");

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Cet email a l'air incomplet"));

export const glucoseUnit = z.enum(["G_L", "MG_DL"]);
export const mealMoment = z.enum(MEAL_MOMENTS);
export const ratioMoment = z.enum(["DEFAULT", ...MEAL_MOMENTS]);
export const penIncrement = z.union([z.literal(0.5), z.literal(1)]);

/** Grams of carbs covered by one unit. Hard bounds; soft bounds live in settings. */
export const gramsPerUnit = decimal.pipe(
  z.number().min(1, "Un ratio d'au moins 1 g par unité").max(150, "Ce ratio semble bien grand"),
);

export const timezone = z
  .string()
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("fr-FR", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Fuseau horaire inconnu");

export const id = z.string().min(1).max(64);
