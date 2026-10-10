import type { Metadata } from "next";
import { MealForm } from "@/components/meal-form/meal-form";
import { id } from "@/lib/validation/common";
import { getDishPrefill, listFavoriteDishes } from "@/server/repos/dishes";
import { getRatioTable } from "@/server/repos/settings";
import { requireAppUser } from "@/server/session";

export const metadata: Metadata = { title: "Nouveau repas" };

export default async function NewMealPage({ searchParams }: PageProps<"/repas/nouveau">) {
  const { user, settings } = await requireAppUser();
  const { plat } = await searchParams;
  // « Manger ça »: only one of her own dishes can prefill the form.
  const dishId = id.safeParse(plat);
  const [ratios, favorites, prefill] = await Promise.all([
    getRatioTable(user.id),
    listFavoriteDishes(user.id),
    dishId.success ? getDishPrefill(user.id, dishId.data) : null,
  ]);
  return (
    <MealForm
      ratios={ratios}
      favorites={favorites}
      prefill={prefill ?? undefined}
      settings={{
        glucoseUnit: settings.glucoseUnit,
        penIncrement: settings.penIncrement,
        doseConfirmThreshold: settings.doseConfirmThreshold,
      }}
    />
  );
}
