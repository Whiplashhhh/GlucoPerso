import type { Metadata } from "next";
import { type LibraryDish, DishLibrary } from "@/components/dishes/dish-library";
import { Bowl, Croissant, Sparkle } from "@/components/illustrations/buddies";
import { ButtonLink } from "@/components/ui/button";
import { dayKey, sinceLabel } from "@/lib/dates";
import { perfectSummary } from "@/lib/dish-stats";
import { listDishes } from "@/server/repos/dishes";
import { requireAppUser } from "@/server/session";

export const metadata: Metadata = { title: "Mes plats" };

export default async function DishesPage() {
  const { user, settings } = await requireAppUser();
  const dishes = await listDishes(user.id);
  const todayKey = dayKey(new Date(), settings.timezone);
  const favorites = dishes.filter((dish) => dish.isFavorite).length;

  const rows: LibraryDish[] = dishes.map(({ id, name, isFavorite, photoId, stats }) => ({
    id,
    name,
    isFavorite,
    photoId,
    count: stats.count,
    averageCarbs: stats.averageCarbs,
    perfectLabel: perfectSummary(stats),
    perfect: stats.perfect,
    recentOutcomes: stats.recentOutcomes,
    lastEaten: stats.lastEatenAt
      ? sinceLabel(dayKey(stats.lastEatenAt, settings.timezone), todayKey)
      : "",
  }));

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header>
        <p className="text-xs font-extrabold tracking-wide text-coral-ink uppercase">
          Mon carnet de recettes
        </p>
        <h1 className="text-[2.1rem] leading-tight font-semibold">Mes plats</h1>
        {dishes.length > 0 && (
          <p className="mt-0.5 text-[15px] text-ink-soft">
            {dishes.length} {dishes.length > 1 ? "plats" : "plat"}
            {favorites > 0 && ` · ${favorites} ${favorites > 1 ? "favoris" : "favori"}`}
          </p>
        )}
      </header>

      {rows.length ? (
        <DishLibrary dishes={rows} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-[28px] bg-surface px-6 pt-8 pb-7 text-center shadow-soft">
          <div className="relative flex items-end justify-center">
            <Croissant className="-mr-3 w-20 -rotate-6" mood="joy" />
            <Bowl className="w-28" mood="happy" />
            <Sparkle className="absolute -top-2 right-0 w-7 text-amber" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-semibold">Ton carnet t&apos;attend</h2>
            <p className="text-ink-soft">
              Chaque repas que tu notes range son plat ici, avec ce qui a bien marché. Pas besoin de
              rien trier 🍝
            </p>
          </div>
          <ButtonLink href="/repas/nouveau" size="lg" className="w-full">
            Noter un repas
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
