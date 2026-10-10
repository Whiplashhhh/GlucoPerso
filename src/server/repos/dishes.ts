import "server-only";
import { db } from "@/lib/db";
import { type DishStats, type DoseValues, dishPrefill, dishStats } from "@/lib/dish-stats";
import { cleanDishName, normalizeDishName } from "@/lib/dishes";

/** Similarity above which a typed name is considered the same dish. */
const SAME_DISH = 0.6;

type ScoredDish = { id: string; name: string; score: number };

/** Fuzzy (trigram) search among the user's dishes. Parameterised SQL only. */
export async function searchDishes(userId: string, query: string, limit = 5) {
  const q = normalizeDishName(query);
  if (q.length < 2) return [];
  const prefix = `${q.replace(/[\\%_]/g, "\\$&")}%`;
  return db.$queryRaw<ScoredDish[]>`
    SELECT d.id, d.name,
      GREATEST(similarity(d."normalizedName", ${q}), word_similarity(${q}, d."normalizedName"))::float AS score
    FROM "Dish" d
    WHERE d."userId" = ${userId}
      AND (
        d."normalizedName" % ${q}
        OR word_similarity(${q}, d."normalizedName") > 0.45
        OR d."normalizedName" LIKE ${prefix}
      )
    ORDER BY score DESC, d."updatedAt" DESC
    LIMIT ${limit}
  `;
}

/** Links a meal name to an existing similar dish, or creates a new one. */
export async function findOrCreateDish(userId: string, name: string): Promise<string> {
  const normalizedName = normalizeDishName(name);
  const exact = await db.dish.findFirst({
    where: { userId, normalizedName },
    select: { id: true },
  });
  if (exact) return exact.id;
  const [best] = await searchDishes(userId, name, 1);
  if (best && best.score >= SAME_DISH) return best.id;
  const dish = await db.dish.create({
    data: { userId, name: cleanDishName(name), normalizedName },
    select: { id: true },
  });
  return dish.id;
}

export type DishMemory = {
  dishId: string;
  name: string;
  score: number;
  isFavorite: boolean;
  lastMeal: {
    id: string;
    eatenAt: string;
    carbsGrams: number;
    insulinUnits: number;
    correctionUnits: number;
    outcome: "TOO_MUCH" | "PERFECT" | "NOT_ENOUGH" | null;
    notes: string | null;
    outcomeNote: string | null;
    tags: string[];
    photoId: string | null;
  } | null;
  /** « La dernière fois, tu avais noté : … » */
  reminder: string | null;
};

/** "Déjà mangé" memories for the autocomplete. */
export async function dishMemories(userId: string, query: string): Promise<DishMemory[]> {
  const matches = await searchDishes(userId, query);
  if (!matches.length) return [];
  const dishes = await db.dish.findMany({
    where: { userId, id: { in: matches.map((match) => match.id) } },
    select: {
      id: true,
      isFavorite: true,
      meals: {
        where: { deletedAt: null },
        orderBy: { eatenAt: "desc" },
        take: 10,
        include: { photos: { select: { id: true }, take: 1 } },
      },
    },
  });
  const byId = new Map(dishes.map((dish) => [dish.id, dish]));
  return matches.map((match) => {
    const dish = byId.get(match.id);
    const last = dish?.meals[0];
    const noted = dish?.meals.find(
      (meal) => meal.outcomeNote || meal.notes || meal.tags.includes("SLOW_ABSORPTION"),
    );
    return {
      dishId: match.id,
      name: match.name,
      score: match.score,
      isFavorite: dish?.isFavorite ?? false,
      lastMeal: last
        ? {
            id: last.id,
            eatenAt: last.eatenAt.toISOString(),
            carbsGrams: last.carbsGrams,
            insulinUnits: last.insulinUnits,
            correctionUnits: last.correctionUnits,
            outcome: last.outcome,
            notes: last.notes,
            outcomeNote: last.outcomeNote,
            tags: last.tags,
            photoId: last.photos[0]?.id ?? null,
          }
        : null,
      reminder: noted
        ? (noted.outcomeNote ?? noted.notes ?? "absorption lente, les glucides arrivent tard")
        : null,
    };
  });
}

// ───────────────────────────── « Mes plats » ─────────────────────────────

const statsMealFields = {
  id: true,
  eatenAt: true,
  carbsGrams: true,
  insulinUnits: true,
  correctionUnits: true,
  outcome: true,
} as const;

export type DishCard = {
  id: string;
  name: string;
  isFavorite: boolean;
  photoId: string | null;
  stats: DishStats;
};

/**
 * Her dish library: favourites first, then by last eaten. Dishes whose meals
 * were all deleted are left out.
 */
export async function listDishes(userId: string): Promise<DishCard[]> {
  const dishes = await db.dish.findMany({
    where: { userId, meals: { some: { userId, deletedAt: null } } },
    select: {
      id: true,
      name: true,
      isFavorite: true,
      meals: {
        where: { userId, deletedAt: null },
        orderBy: { eatenAt: "desc" },
        select: statsMealFields,
      },
    },
  });
  const mealIds = dishes.flatMap((dish) => dish.meals.map((meal) => meal.id));
  // First photo of each meal, in one query for the whole library.
  const photos = mealIds.length
    ? await db.photo.findMany({
        where: { userId, mealId: { in: mealIds } },
        orderBy: { createdAt: "asc" },
        select: { id: true, mealId: true },
      })
    : [];
  const photoOfMeal = new Map<string, string>();
  for (const photo of photos) {
    if (photo.mealId && !photoOfMeal.has(photo.mealId)) photoOfMeal.set(photo.mealId, photo.id);
  }

  return dishes
    .map((dish) => ({
      id: dish.id,
      name: dish.name,
      isFavorite: dish.isFavorite,
      // Meals are newest first: the latest meal photo.
      photoId: dish.meals.map((meal) => photoOfMeal.get(meal.id)).find(Boolean) ?? null,
      stats: dishStats(dish.meals),
    }))
    .sort(
      (a, b) =>
        Number(b.isFavorite) - Number(a.isFavorite) ||
        (b.stats.lastEatenAt?.getTime() ?? 0) - (a.stats.lastEatenAt?.getTime() ?? 0),
    );
}

/** A dish she owns with all its (non-deleted) meals and photos, or null. */
export async function getDish(userId: string, dishId: string) {
  const dish = await db.dish.findFirst({
    where: { id: dishId, userId },
    select: {
      id: true,
      name: true,
      isFavorite: true,
      meals: {
        where: { userId, deletedAt: null },
        orderBy: { eatenAt: "desc" },
        select: {
          ...statsMealFields,
          name: true,
          notes: true,
          outcomeNote: true,
          photos: {
            where: { userId },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!dish) return null;
  return { ...dish, stats: dishStats(dish.meals) };
}

export type FavoriteDish = { id: string; name: string; values: DoseValues | null };

/** Values offered for one-tap entry: the best-working dose of a dish she owns. */
export async function getDishPrefill(userId: string, dishId: string): Promise<FavoriteDish | null> {
  const dish = await db.dish.findFirst({
    where: { id: dishId, userId },
    select: {
      id: true,
      name: true,
      meals: { where: { userId, deletedAt: null }, select: statsMealFields },
    },
  });
  if (!dish) return null;
  return { id: dish.id, name: dish.name, values: dishPrefill(dishStats(dish.meals)) };
}

/** Favourite chips of the meal form, most recently used first. */
export async function listFavoriteDishes(userId: string, limit = 12): Promise<FavoriteDish[]> {
  const dishes = await db.dish.findMany({
    where: { userId, isFavorite: true, meals: { some: { userId, deletedAt: null } } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      meals: { where: { userId, deletedAt: null }, select: statsMealFields },
    },
  });
  return dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    values: dishPrefill(dishStats(dish.meals)),
  }));
}

/** Her other dishes `dishId` could be merged into, alphabetically. */
export async function listMergeTargets(userId: string, dishId: string) {
  const dishes = await db.dish.findMany({
    where: { userId, id: { not: dishId }, meals: { some: { userId, deletedAt: null } } },
    orderBy: { normalizedName: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { meals: { where: { userId, deletedAt: null } } } },
    },
  });
  return dishes.map((dish) => ({ id: dish.id, name: dish.name, count: dish._count.meals }));
}

export async function setDishFavorite(userId: string, dishId: string, isFavorite: boolean) {
  const result = await db.dish.updateMany({ where: { id: dishId, userId }, data: { isFavorite } });
  return result.count === 1;
}

export type RenameResult =
  { ok: true } | { ok: false; reason: "not-found" } | { ok: false; reason: "taken"; name: string };

/**
 * Renames the dish (her meals keep the name she typed). A name already used by
 * another of her dishes is refused: merging is the way to join them.
 */
export async function renameDish(
  userId: string,
  dishId: string,
  name: string,
): Promise<RenameResult> {
  const normalizedName = normalizeDishName(name);
  const taken = await db.dish.findFirst({
    where: { userId, normalizedName, id: { not: dishId } },
    select: { name: true },
  });
  if (taken) return { ok: false, reason: "taken", name: taken.name };
  const result = await db.dish.updateMany({
    where: { id: dishId, userId },
    data: { name: cleanDishName(name), normalizedName },
  });
  return result.count === 1 ? { ok: true } : { ok: false, reason: "not-found" };
}

/**
 * Moves every meal of `sourceId` (deleted ones too) to `targetId`, then
 * deletes the source. Both dishes must be hers; returns false otherwise.
 */
export async function mergeDishes(userId: string, sourceId: string, targetId: string) {
  if (sourceId === targetId) return false;
  return db.$transaction(async (tx) => {
    const owned = await tx.dish.findMany({
      where: { userId, id: { in: [sourceId, targetId] } },
      select: { id: true, isFavorite: true },
    });
    if (owned.length !== 2) return false;
    await tx.meal.updateMany({ where: { userId, dishId: sourceId }, data: { dishId: targetId } });
    await tx.dish.updateMany({
      where: { id: targetId, userId },
      data: { isFavorite: owned.some((dish) => dish.isFavorite), updatedAt: new Date() },
    });
    const deleted = await tx.dish.deleteMany({ where: { id: sourceId, userId } });
    return deleted.count === 1;
  });
}
