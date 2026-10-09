import type { Metadata } from "next";
import { MealForm } from "@/components/meal-form/meal-form";
import { getRatioTable } from "@/server/repos/settings";
import { requireAppUser } from "@/server/session";

export const metadata: Metadata = { title: "Nouveau repas" };

export default async function NewMealPage() {
  const { user, settings } = await requireAppUser();
  const ratios = await getRatioTable(user.id);
  return (
    <MealForm
      ratios={ratios}
      settings={{
        glucoseUnit: settings.glucoseUnit,
        penIncrement: settings.penIncrement,
        doseConfirmThreshold: settings.doseConfirmThreshold,
      }}
    />
  );
}
