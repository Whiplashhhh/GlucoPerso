import { z } from "zod";
import { optionalGlucose } from "@/lib/validation/meal";

export const feedbackSchema = z.object({
  outcome: z.enum(["TOO_MUCH", "PERFECT", "NOT_ENOUGH"], { error: "Comment ça s'est passé ?" }),
  glucoseAfter: optionalGlucose.default(null),
  glucoseLow: optionalGlucose.default(null),
  glucoseHigh: optionalGlucose.default(null),
  hypoTreated: z.boolean().nullable().default(null),
  outcomeNote: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => value || null),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
