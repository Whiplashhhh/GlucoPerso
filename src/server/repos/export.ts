import "server-only";
import { db } from "@/lib/db";
import type { ExportMeal } from "@/lib/export/meals";

/** Meals (not deleted) eaten in [start, end), oldest first, for the doctor exports. */
export async function mealsForExport(
  userId: string,
  start: Date,
  end: Date,
): Promise<ExportMeal[]> {
  return db.meal.findMany({
    where: { userId, deletedAt: null, eatenAt: { gte: start, lt: end } },
    orderBy: { eatenAt: "asc" },
    select: {
      eatenAt: true,
      moment: true,
      name: true,
      carbsGrams: true,
      insulinUnits: true,
      correctionUnits: true,
      ratioUsed: true,
      glucoseBefore: true,
      glucoseAfter: true,
      glucoseLow: true,
      glucoseHigh: true,
      outcome: true,
      tags: true,
      notes: true,
    },
  });
}

/** Evaluated meals since `start` (all time when null), for « Mon évolution ». */
export async function outcomesSince(userId: string, start: Date | null) {
  return db.meal.findMany({
    where: {
      userId,
      deletedAt: null,
      outcome: { not: null },
      ...(start && { eatenAt: { gte: start } }),
    },
    select: { moment: true, outcome: true },
  });
}

export async function firstMealAt(userId: string): Promise<Date | null> {
  const first = await db.meal.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { eatenAt: "asc" },
    select: { eatenAt: true },
  });
  return first?.eatenAt ?? null;
}

export async function ratioChangesBetween(userId: string, start: Date | null, end: Date) {
  return db.ratioChange.findMany({
    where: { userId, createdAt: { ...(start && { gte: start }), lt: end } },
    orderBy: { createdAt: "asc" },
    select: {
      moment: true,
      fromValue: true,
      toValue: true,
      origin: true,
      justification: true,
      createdAt: true,
    },
  });
}

/**
 * Everything stored about her (RGPD export). Secrets are left out: password
 * hashes, session tokens, recovery code hashes.
 */
export async function collectAllData(userId: string) {
  const [user, settings, ratios, ratioChanges, suggestions, dishes, meals, photos, basalLogs] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          sessions: {
            select: { createdAt: true, expiresAt: true, ipAddress: true, userAgent: true },
          },
          recoveryCodes: { select: { createdAt: true, usedAt: true } },
        },
      }),
      db.userSettings.findUnique({ where: { userId }, omit: { userId: true } }),
      db.ratio.findMany({ where: { userId }, omit: { userId: true } }),
      db.ratioChange.findMany({
        where: { userId },
        omit: { userId: true },
        orderBy: { createdAt: "asc" },
      }),
      db.ratioSuggestion.findMany({
        where: { userId },
        omit: { userId: true },
        orderBy: { createdAt: "asc" },
      }),
      db.dish.findMany({ where: { userId }, omit: { userId: true, normalizedName: true } }),
      db.meal.findMany({
        where: { userId },
        omit: { userId: true },
        orderBy: { eatenAt: "asc" },
        include: { photos: { select: { id: true } } },
      }),
      db.photo.findMany({
        where: { userId },
        select: { id: true, mealId: true, width: true, height: true, createdAt: true },
      }),
      db.basalLog.findMany({ where: { userId }, omit: { userId: true }, orderBy: { day: "asc" } }),
    ]);

  return {
    data: {
      exportedAt: new Date().toISOString(),
      format: "GlucoPerso export v1 — glycémies en g/L, dates en UTC (ISO 8601)",
      profile: user && {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      settings,
      ratios,
      ratioChanges,
      ratioSuggestions: suggestions,
      dishes,
      meals: meals.map(({ photos: mealPhotos, ...meal }) => ({
        ...meal,
        photoFiles: mealPhotos.map((photo) => `photos/${photo.id}.webp`),
      })),
      photos: photos.map((photo) => ({ ...photo, file: `photos/${photo.id}.webp` })),
      basalLogs,
      sessions: user?.sessions ?? [],
      recoveryCodes: user?.recoveryCodes ?? [],
    },
    photoIds: photos.map((photo) => photo.id),
  };
}
