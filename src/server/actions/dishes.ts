"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { id } from "@/lib/validation/common";
import { dishName } from "@/lib/validation/dish";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import { mergeDishes, renameDish, setDishFavorite } from "@/server/repos/dishes";
import { requireAppUser } from "@/server/session";

const NOT_FOUND = "Plat introuvable.";

export async function setDishFavoriteAction(
  dishId: unknown,
  isFavorite: unknown,
): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsedId = id.safeParse(dishId);
  const parsedValue = z.boolean().safeParse(isFavorite);
  if (!parsedId.success || !parsedValue.success) return { error: NOT_FOUND };
  const saved = await setDishFavorite(user.id, parsedId.data, parsedValue.data);
  if (!saved) return { error: NOT_FOUND };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function renameDishAction(dishId: unknown, name: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsedId = id.safeParse(dishId);
  if (!parsedId.success) return { error: NOT_FOUND };
  const parsed = z.object({ name: dishName }).safeParse({ name });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const result = await renameDish(user.id, parsedId.data, parsed.data.name);
  if (!result.ok) {
    if (result.reason === "taken") {
      return {
        fieldErrors: {
          name: `Tu as déjà « ${result.name} ». Pour les réunir, utilise « Fusionner avec… » 🙂`,
        },
      };
    }
    return { error: NOT_FOUND };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Moves every meal of `sourceId` into `targetId` and removes `sourceId`. */
export async function mergeDishAction(
  sourceId: unknown,
  targetId: unknown,
): Promise<ActionState<{ id: string }>> {
  const { user } = await requireAppUser();
  const source = id.safeParse(sourceId);
  const target = id.safeParse(targetId);
  if (!source.success || !target.success) return { error: NOT_FOUND };
  const merged = await mergeDishes(user.id, source.data, target.data);
  if (!merged) return { error: NOT_FOUND };
  revalidatePath("/", "layout");
  return { ok: true, data: { id: target.data } };
}
