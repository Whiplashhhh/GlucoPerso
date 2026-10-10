import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { MealInput } from "@/lib/validation/meal";
import { createMeal } from "@/server/repos/meals";

const DAY_MS = 24 * 60 * 60 * 1000;

/** An onboarded user with a general ratio (12) and a dinner ratio (12). */
export async function createUser(name: string) {
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      name,
      email: `${name.toLowerCase()}-${id}@exemple.test`,
      settings: { create: { onboardedAt: new Date(), timezone: "Europe/Paris" } },
      ratios: {
        create: [
          { moment: "DEFAULT", gramsPerUnit: 12 },
          { moment: "DINNER", gramsPerUnit: 12 },
        ],
      },
    },
  });
  const settings = await db.userSettings.findUniqueOrThrow({ where: { userId: id } });
  return { id, settings };
}

export function mealInput(overrides: Partial<MealInput> = {}): MealInput {
  return {
    name: "Pâtes carbonara",
    eatenAt: new Date(Date.now() - DAY_MS),
    moment: "DINNER",
    carbsGrams: 60,
    insulinUnits: 5,
    correctionUnits: 0,
    glucoseBefore: 1.1,
    tags: [],
    notes: "Note secrète",
    photoId: null,
    confirmedHighDose: false,
    ...overrides,
  };
}

/** Creates a meal through the repository (dish matching included). */
export async function addMeal(userId: string, overrides: Partial<MealInput> = {}) {
  const meal = await createMeal(userId, mealInput(overrides), 12);
  return db.meal.findUniqueOrThrow({ where: { id: meal.id } });
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}
