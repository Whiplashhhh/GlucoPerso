import "server-only";
import { db } from "@/lib/db";
import type { MealInput } from "@/lib/validation/meal";
import { findOrCreateDish } from "@/server/repos/dishes";

/** Every read below is scoped to `userId` and skips soft-deleted meals. */
const alive = (userId: string) => ({ userId, deletedAt: null });

export async function createMeal(userId: string, input: MealInput, ratioUsed: number | null) {
  const dishId = await findOrCreateDish(userId, input.name);
  return db.$transaction(async (tx) => {
    const meal = await tx.meal.create({
      data: {
        userId,
        dishId,
        name: input.name,
        eatenAt: input.eatenAt,
        moment: input.moment,
        carbsGrams: input.carbsGrams,
        insulinUnits: input.insulinUnits,
        correctionUnits: input.correctionUnits,
        glucoseBefore: input.glucoseBefore,
        tags: input.tags,
        notes: input.notes,
        ratioUsed,
      },
      select: { id: true },
    });
    if (input.photoId) {
      // Only an unattached photo owned by the same user can be linked.
      await tx.photo.updateMany({
        where: { id: input.photoId, userId, mealId: null },
        data: { mealId: meal.id },
      });
    }
    await tx.dish.update({ where: { id: dishId, userId }, data: { updatedAt: new Date() } });
    return meal;
  });
}

export async function getMeal(userId: string, mealId: string) {
  return db.meal.findFirst({
    where: { id: mealId, ...alive(userId) },
    include: { photos: { select: { id: true }, orderBy: { createdAt: "asc" } } },
  });
}

export async function listMealsBetween(userId: string, from: Date, to: Date) {
  return db.meal.findMany({
    where: { ...alive(userId), eatenAt: { gte: from, lt: to } },
    orderBy: { eatenAt: "asc" },
    include: { photos: { select: { id: true }, take: 1 } },
  });
}
