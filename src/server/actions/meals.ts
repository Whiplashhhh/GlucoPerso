"use server";

import { revalidatePath } from "next/cache";
import { resolveRatio } from "@/lib/moments";
import { id } from "@/lib/validation/common";
import { mealInputSchema } from "@/lib/validation/meal";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import {
  createMeal,
  purgeDeletedMeals,
  restoreMeal,
  softDeleteMeal,
  updateMeal,
} from "@/server/repos/meals";
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

const NOT_FOUND = "Repas introuvable.";

export async function updateMealAction(
  mealId: unknown,
  input: unknown,
): Promise<ActionState<{ id: string; needsConfirmation?: boolean }>> {
  const { user, settings } = await requireAppUser();
  const parsedId = id.safeParse(mealId);
  if (!parsedId.success) return { error: NOT_FOUND };
  const parsed = mealInputSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const meal = parsed.data;

  if (meal.insulinUnits > settings.doseConfirmThreshold && !meal.confirmedHighDose) {
    return { error: "confirm", data: { id: parsedId.data, needsConfirmation: true } };
  }

  const saved = await updateMeal(user.id, parsedId.data, meal);
  if (!saved) return { error: NOT_FOUND };
  revalidatePath("/", "layout");
  return { ok: true, data: { id: parsedId.data } };
}

/** Soft delete (undoable), plus a purge of meals deleted more than 7 days ago. */
export async function deleteMealAction(mealId: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsedId = id.safeParse(mealId);
  if (!parsedId.success) return { error: NOT_FOUND };
  const deleted = await softDeleteMeal(user.id, parsedId.data);
  if (!deleted) return { error: NOT_FOUND };
  await purgeDeletedMeals(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function restoreMealAction(mealId: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsedId = id.safeParse(mealId);
  if (!parsedId.success) return { error: NOT_FOUND };
  const restored = await restoreMeal(user.id, parsedId.data);
  if (!restored) return { error: NOT_FOUND };
  revalidatePath("/", "layout");
  return { ok: true };
}
