import "server-only";
import { db } from "@/lib/db";
import { MEAL_MOMENTS, type MealMoment, type RatioMoment, type RatioTable } from "@/lib/moments";
import type { ThemePreference } from "@/lib/theme";
import type { OnboardingInput, RatioEdit, SettingsUpdate } from "@/lib/validation/settings";

export async function saveOnboarding(userId: string, input: OnboardingInput): Promise<void> {
  const ratios: [RatioMoment, number][] = [["DEFAULT", input.defaultRatio]];
  if (input.usePerMomentRatios) {
    for (const moment of MEAL_MOMENTS) {
      const value = input.momentRatios[moment];
      if (value !== undefined) ratios.push([moment, value]);
    }
  }

  const settings = {
    glucoseUnit: input.glucoseUnit,
    penIncrement: input.penIncrement,
    hypoThreshold: input.hypoThreshold,
    usePerMomentRatios: input.usePerMomentRatios,
    timezone: input.timezone,
    onboardedAt: new Date(),
  };

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { name: input.name } }),
    db.userSettings.upsert({
      where: { userId },
      create: { userId, ...settings },
      update: settings,
    }),
    // Onboarding replaces any earlier ratio table.
    db.ratio.deleteMany({ where: { userId } }),
    db.ratio.createMany({
      data: ratios.map(([moment, gramsPerUnit]) => ({ userId, moment, gramsPerUnit })),
    }),
    db.ratioChange.createMany({
      data: ratios.map(([moment, value]) => ({
        userId,
        moment,
        fromValue: null,
        toValue: value,
        origin: "ONBOARDING" as const,
        justification: "Ratio de départ donné par ton équipe médicale",
      })),
    }),
  ]);
}

export async function getRatioTable(userId: string): Promise<RatioTable> {
  const rows = await db.ratio.findMany({ where: { userId } });
  return Object.fromEntries(rows.map((row) => [row.moment, row.gramsPerUnit])) as RatioTable;
}

/** Settings fields as stored (thresholds in g/L, theme as the enum). */
export type StoredSettingsUpdate = Omit<SettingsUpdate, "theme"> & {
  theme?: ThemePreference;
};

/** Updates her settings. Returns an error message when bounds don't fit. */
export async function updateSettings(
  userId: string,
  update: StoredSettingsUpdate,
): Promise<string | null> {
  const current = await db.userSettings.findUnique({ where: { userId } });
  if (!current) return "Réglages introuvables.";
  const next = { ...current, ...update };
  if (next.ratioMin >= next.ratioMax) {
    return "La borne basse doit rester sous la borne haute.";
  }
  if (next.hypoThreshold >= next.highThreshold) {
    return "Le seuil haut doit rester au-dessus du seuil d'hypo.";
  }
  await db.userSettings.update({ where: { userId }, data: update });
  return null;
}

export async function updateProfileName(userId: string, name: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { name } });
}

const BACK_TO_GENERAL = "Retour au ratio général";

/**
 * Sets one ratio by hand and logs it in her history (origin MANUAL).
 * Returns false when nothing changed.
 */
export async function setRatioManually(userId: string, edit: RatioEdit): Promise<boolean> {
  const where = { userId_moment: { userId, moment: edit.moment } };
  return db.$transaction(async (tx) => {
    const existing = await tx.ratio.findUnique({ where });
    if (existing?.gramsPerUnit === edit.value) return false;
    if (edit.moment !== "DEFAULT" && !existing) {
      await tx.userSettings.update({ where: { userId }, data: { usePerMomentRatios: true } });
    }
    await tx.ratio.upsert({
      where,
      create: { userId, moment: edit.moment, gramsPerUnit: edit.value },
      update: { gramsPerUnit: edit.value },
    });
    await tx.ratioChange.create({
      data: {
        userId,
        moment: edit.moment,
        fromValue: existing?.gramsPerUnit ?? null,
        toValue: edit.value,
        origin: "MANUAL",
        justification: edit.justification ?? null,
      },
    });
    return true;
  });
}

/**
 * Removes moment ratios so those moments follow the general ratio again. The
 * history records the switch (old value → general value).
 */
export async function removeMomentRatios(
  userId: string,
  moments: readonly MealMoment[],
  disablePerMoment: boolean,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const general = await tx.ratio.findUnique({
      where: { userId_moment: { userId, moment: "DEFAULT" } },
    });
    const rows = await tx.ratio.findMany({ where: { userId, moment: { in: [...moments] } } });
    if (general) {
      await tx.ratioChange.createMany({
        data: rows.map((row) => ({
          userId,
          moment: row.moment,
          fromValue: row.gramsPerUnit,
          toValue: general.gramsPerUnit,
          origin: "MANUAL" as const,
          justification: BACK_TO_GENERAL,
        })),
      });
    }
    await tx.ratio.deleteMany({ where: { userId, moment: { in: [...moments] } } });
    if (disablePerMoment) {
      await tx.userSettings.update({ where: { userId }, data: { usePerMomentRatios: false } });
    }
  });
}

export async function setPerMomentRatios(userId: string, enabled: boolean): Promise<void> {
  if (enabled) {
    await db.userSettings.update({ where: { userId }, data: { usePerMomentRatios: true } });
    return;
  }
  await removeMomentRatios(userId, MEAL_MOMENTS, true);
}

/** Her ratio history, newest first. */
export async function ratioHistory(userId: string) {
  return db.ratioChange.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      moment: true,
      fromValue: true,
      toValue: true,
      origin: true,
      justification: true,
      createdAt: true,
    },
  });
}
