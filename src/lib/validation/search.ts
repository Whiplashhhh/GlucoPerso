import { z } from "zod";
import { MEAL_TAGS } from "@/lib/tags";

const asArray = (value: unknown) =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];

/** `/recherche?q=…&tag=SPORT&tag=…`: unknown tags are dropped, never an error. */
export const searchSchema = z.object({
  q: z
    .preprocess((value) => (Array.isArray(value) ? value[0] : value), z.string().optional())
    .transform((value) => (value ?? "").trim().slice(0, 80)),
  tags: z.preprocess(
    asArray,
    z
      .array(z.unknown())
      .max(20)
      .transform((values) => [
        ...new Set(
          values.filter((value): value is (typeof MEAL_TAGS)[number] =>
            (MEAL_TAGS as readonly unknown[]).includes(value),
          ),
        ),
      ]),
  ),
});

export type SearchInput = z.infer<typeof searchSchema>;
