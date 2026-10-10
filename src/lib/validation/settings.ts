import { z } from "zod";
import { MEAL_MOMENTS } from "@/lib/moments";
import {
  decimal,
  firstName,
  glucoseUnit,
  gramsPerUnit,
  penIncrement,
  timezone,
} from "@/lib/validation/common";

/** Hypo threshold in g/L (stored canonical). */
export const hypoThreshold = decimal.pipe(
  z.number().min(0.5, "Un seuil d'au moins 0,50 g/L").max(1.2, "Un seuil de 1,20 g/L maximum"),
);

const momentRatios = z.partialRecord(z.enum(MEAL_MOMENTS), gramsPerUnit);

export const onboardingSchema = z.object({
  name: firstName,
  glucoseUnit,
  penIncrement,
  defaultRatio: gramsPerUnit,
  usePerMomentRatios: z.boolean(),
  momentRatios: momentRatios.default({}),
  hypoThreshold,
  timezone,
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Threshold above which an outcome is pre-selected as « pas assez », in g/L. */
export const highThreshold = decimal.pipe(
  z.number().min(1.2, "Un seuil d'au moins 1,20 g/L").max(3, "Un seuil de 3,00 g/L maximum"),
);

/**
 * Partial update of « Moi » settings. Glucose thresholds always travel in g/L
 * (the client converts from her unit).
 */
export const settingsUpdateSchema = z
  .object({
    glucoseUnit,
    penIncrement,
    hypoThreshold,
    highThreshold,
    doseConfirmThreshold: decimal.pipe(
      z.number().int("Un nombre entier d'unités").min(5, "5 U minimum").max(60, "60 U maximum"),
    ),
    ratioMin: decimal.pipe(z.number().min(1, "1 g minimum").max(20, "20 g maximum")),
    ratioMax: decimal.pipe(z.number().min(10, "10 g minimum").max(150, "150 g maximum")),
    theme: z.enum(["system", "light", "dark"]),
    timezone,
  })
  .partial()
  .strict();
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;

export const profileSchema = z.object({ name: firstName });

const justification = z
  .string()
  .trim()
  .max(280, "280 caractères maximum")
  .optional()
  .transform((value) => value || undefined);

export const ratioEditSchema = z.object({
  moment: z.enum(["DEFAULT", ...MEAL_MOMENTS]),
  value: gramsPerUnit,
  justification,
});
export type RatioEdit = z.infer<typeof ratioEditSchema>;

export const momentRatioSchema = z.object({ moment: z.enum(MEAL_MOMENTS) });

export const perMomentToggleSchema = z.object({ enabled: z.boolean() });

/** Daily long-acting insulin: units and local time "HH:mm". */
export const basalSchema = z.object({
  units: decimal.pipe(z.number().min(0.5, "0,5 U minimum").max(100, "100 U maximum")),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure attendue au format HH:MM"),
});
export type BasalInput = z.infer<typeof basalSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Ton mot de passe ?").max(128),
});
