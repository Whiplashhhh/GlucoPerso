import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MealForm } from "@/components/meal-form/meal-form";
import { getMeal } from "@/server/repos/meals";
import { getRatioTable } from "@/server/repos/settings";
import { idParam } from "@/server/params";
import { requireAppUser } from "@/server/session";

export const metadata: Metadata = { title: "Modifier le repas" };

export default async function EditMealPage({ params }: PageProps<"/repas/[id]/modifier">) {
  const { user, settings } = await requireAppUser();
  const id = await idParam(params);
  const [meal, ratios] = await Promise.all([getMeal(user.id, id), getRatioTable(user.id)]);
  if (!meal) notFound();
  return (
    <MealForm
      mealId={meal.id}
      initial={{
        name: meal.name,
        eatenAt: meal.eatenAt.toISOString(),
        moment: meal.moment === "DEFAULT" ? "SNACK" : meal.moment,
        carbsGrams: meal.carbsGrams,
        insulinUnits: meal.insulinUnits,
        correctionUnits: meal.correctionUnits,
        glucoseBefore: meal.glucoseBefore,
        tags: meal.tags,
        notes: meal.notes,
        photoId: meal.photos[0]?.id ?? null,
      }}
      ratios={ratios}
      settings={{
        glucoseUnit: settings.glucoseUnit,
        penIncrement: settings.penIncrement,
        doseConfirmThreshold: settings.doseConfirmThreshold,
      }}
    />
  );
}
