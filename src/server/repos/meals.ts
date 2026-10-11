import "server-only";
import { db } from "@/lib/db";
import type { FeedbackInput } from "@/lib/validation/feedback";
import type { MealInput } from "@/lib/validation/meal";
import type { SearchInput } from "@/lib/validation/search";
import { deletePhotoFiles } from "@/server/photos";
import { findOrCreateDish } from "@/server/repos/dishes";

/** Every read below is scoped to `userId` and skips soft-deleted meals. */
const alive = (userId: string) => ({ userId, deletedAt: null });

/** The « Comment ça s'est passé ? » card shows up 2 hours after the meal. */
export const FEEDBACK_DELAY_MS = 2 * 60 * 60 * 1000;

/** `clientId`: id given offline by the device (see src/server/actions/offline.ts). */
export async function createMeal(
  userId: string,
  input: MealInput,
  ratioUsed: number | null,
  clientId: string | null = null,
) {
  const dishId = await findOrCreateDish(userId, input.name);
  return db.$transaction(async (tx) => {
    const meal = await tx.meal.create({
      data: {
        userId,
        clientId,
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

/** Whether a meal noted offline with this device id was already saved. */
export async function hasClientMeal(userId: string, clientId: string) {
  return (await db.meal.count({ where: { userId, clientId } })) > 0;
}

export async function getMeal(userId: string, mealId: string) {
  return db.meal.findFirst({
    where: { id: mealId, ...alive(userId) },
    include: { photos: { select: { id: true }, orderBy: { createdAt: "asc" } } },
  });
}

/** Saves « Comment ça s'est passé ? ». Returns false if the meal isn't hers. */
export async function setMealFeedback(userId: string, mealId: string, input: FeedbackInput) {
  const result = await db.meal.updateMany({
    where: { id: mealId, ...alive(userId) },
    data: { ...input, outcomeAt: new Date(), feedbackSkipped: false },
  });
  return result.count === 1;
}

export async function skipMealFeedback(userId: string, mealId: string) {
  await db.meal.updateMany({
    where: { id: mealId, ...alive(userId) },
    data: { feedbackSkipped: true },
  });
}

/** Meals waiting for feedback: eaten 2 h ago or more, within the last 3 days. */
export async function pendingFeedback(userId: string, now = new Date()) {
  return db.meal.findMany({
    where: {
      ...alive(userId),
      outcome: null,
      feedbackSkipped: false,
      eatenAt: {
        lte: new Date(now.getTime() - FEEDBACK_DELAY_MS),
        gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { eatenAt: "desc" },
    take: 3,
    include: { photos: { select: { id: true }, take: 1 } },
  });
}

/**
 * Edits a meal she owns. The dish link follows the (possibly new) name and
 * `ratioUsed` keeps the ratio in force when the meal was logged. Photo:
 * `input.photoId` is the photo wanted after the edit; a new one is attached
 * only if unattached and hers, and the photos it replaces are removed.
 * Returns false when the meal isn't hers.
 */
export async function updateMeal(userId: string, mealId: string, input: MealInput) {
  const existing = await db.meal.findFirst({
    where: { id: mealId, ...alive(userId) },
    select: { id: true, photos: { select: { id: true } } },
  });
  if (!existing) return false;
  const dishId = await findOrCreateDish(userId, input.name);

  const removed = await db.$transaction(async (tx) => {
    const updated = await tx.meal.updateMany({
      where: { id: mealId, ...alive(userId) },
      data: {
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
      },
    });
    if (updated.count !== 1) return null;
    await tx.dish.update({ where: { id: dishId, userId }, data: { updatedAt: new Date() } });

    const current = existing.photos.map((photo) => photo.id);
    if (input.photoId === null || current.includes(input.photoId)) {
      const keep = input.photoId;
      const detach = current.filter((id) => id !== keep);
      await tx.photo.updateMany({
        where: { id: { in: detach }, userId, mealId },
        data: { mealId: null },
      });
      return detach;
    }
    const attached = await tx.photo.updateMany({
      where: { id: input.photoId, userId, mealId: null },
      data: { mealId },
    });
    if (attached.count !== 1) return [];
    await tx.photo.updateMany({
      where: { id: { in: current }, userId, mealId },
      data: { mealId: null },
    });
    return current;
  });
  if (removed === null) return false;
  if (removed.length) await deletePhotos(userId, removed);
  return true;
}

/** Deletes photos (files and rows) that are hers and no longer attached. */
async function deletePhotos(userId: string, photoIds: string[]) {
  const photos = await db.photo.findMany({
    where: { id: { in: photoIds }, userId, mealId: null },
    select: { id: true, storageKey: true },
  });
  for (const photo of photos) await deletePhotoFiles(userId, photo.storageKey);
  await db.photo.deleteMany({ where: { id: { in: photos.map((photo) => photo.id) }, userId } });
}

/** Soft delete: the meal stays restorable for `PURGE_AFTER_MS`. */
export async function softDeleteMeal(userId: string, mealId: string, now = new Date()) {
  const result = await db.meal.updateMany({
    where: { id: mealId, ...alive(userId) },
    data: { deletedAt: now },
  });
  return result.count === 1;
}

export async function restoreMeal(userId: string, mealId: string) {
  const result = await db.meal.updateMany({
    where: { id: mealId, userId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  return result.count === 1;
}

export const PURGE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Hard-deletes her meals soft-deleted more than 7 days ago, photos included. */
export async function purgeDeletedMeals(userId: string, now = new Date()) {
  const where = { userId, deletedAt: { lt: new Date(now.getTime() - PURGE_AFTER_MS) } };
  const meals = await db.meal.findMany({
    where,
    select: { id: true, photos: { select: { id: true } } },
  });
  if (!meals.length) return 0;
  const photoIds = meals.flatMap((meal) => meal.photos.map((photo) => photo.id));
  // Photos are detached by the relation (SetNull), then removed with their files.
  const { count } = await db.meal.deleteMany({
    where: { ...where, id: { in: meals.map((meal) => meal.id) } },
  });
  if (photoIds.length) await deletePhotos(userId, photoIds);
  return count;
}

/** Search by name, notes or feedback note (case-insensitive) and by tags (all required). */
export async function searchMeals(userId: string, { q, tags }: SearchInput, limit = 200) {
  return db.meal.findMany({
    where: {
      ...alive(userId),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
              { outcomeNote: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(tags.length ? { tags: { hasEvery: tags } } : {}),
    },
    orderBy: { eatenAt: "desc" },
    take: limit,
    include: { photos: { select: { id: true }, take: 1 } },
  });
}

export async function listMealsBetween(userId: string, from: Date, to: Date) {
  return db.meal.findMany({
    where: { ...alive(userId), eatenAt: { gte: from, lt: to } },
    orderBy: { eatenAt: "asc" },
    include: { photos: { select: { id: true }, take: 1 } },
  });
}
