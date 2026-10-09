import "server-only";
import { db } from "@/lib/db";
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
