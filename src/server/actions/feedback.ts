"use server";

import { revalidatePath } from "next/cache";
import { feedbackSchema } from "@/lib/validation/feedback";
import { id } from "@/lib/validation/common";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import { setMealFeedback, skipMealFeedback } from "@/server/repos/meals";
import { requireAppUser } from "@/server/session";

export async function saveFeedbackAction(mealId: unknown, input: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsedId = id.safeParse(mealId);
  const parsed = feedbackSchema.safeParse(input);
  if (!parsedId.success) return { error: "Repas introuvable." };
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const saved = await setMealFeedback(user.id, parsedId.data, parsed.data);
  if (!saved) return { error: "Repas introuvable." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function skipFeedbackAction(mealId: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsedId = id.safeParse(mealId);
  if (!parsedId.success) return { error: "Repas introuvable." };
  await skipMealFeedback(user.id, parsedId.data);
  revalidatePath("/", "layout");
  return { ok: true };
}
