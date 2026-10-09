"use server";

import { revalidatePath } from "next/cache";
import { resolveRatio } from "@/lib/moments";
import { mealInputSchema } from "@/lib/validation/meal";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import { createMeal } from "@/server/repos/meals";
import { getRatioTable } from "@/server/repos/settings";
import { requireAppUser } from "@/server/session";

export async function createMealAction(
  input: unknown,
): Promise<ActionState<{ id: string; needsConfirmation?: boolean }>> {
  const { user, settings } = await requireAppUser();
  const parsed = mealInputSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const meal = parsed.data;

  // Gentle guard-rail: big doses need an explicit "yes, that's right".
  if (meal.insulinUnits > settings.doseConfirmThreshold && !meal.confirmedHighDose) {
    return { error: "confirm", data: { id: "", needsConfirmation: true } };
  }

  const ratios = await getRatioTable(user.id);
  const ratio = resolveRatio(meal.moment, ratios);
  const created = await createMeal(user.id, meal, ratio?.gramsPerUnit ?? null);
  revalidatePath("/", "layout");
  return { ok: true, data: { id: created.id } };
}
