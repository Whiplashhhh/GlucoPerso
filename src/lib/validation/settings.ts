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
