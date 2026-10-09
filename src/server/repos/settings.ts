import "server-only";
import { db } from "@/lib/db";
import { MEAL_MOMENTS, type RatioMoment, type RatioTable } from "@/lib/moments";
import type { OnboardingInput } from "@/lib/validation/settings";

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
