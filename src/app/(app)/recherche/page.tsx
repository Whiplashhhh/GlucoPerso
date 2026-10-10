import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Metadata } from "next";
import { Cloud, Strawberry } from "@/components/illustrations/buddies";
import { BackButton } from "@/components/meals/meal-actions";
import { MealList } from "@/components/meals/meal-list";
import { SearchForm } from "@/components/search/search-form";
import { groupByMonth } from "@/lib/calendar";
import { searchSchema } from "@/lib/validation/search";
import { searchMeals } from "@/server/repos/meals";
import { requireAppUser } from "@/server/session";

export const metadata: Metadata = { title: "Rechercher" };

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const { user, settings } = await requireAppUser();
  const raw = await searchParams;
  const parsed = searchSchema.safeParse({ q: raw.q, tags: raw.tag });
  const query = parsed.success ? parsed.data : { q: "", tags: [] };
  const tz = settings.timezone;
  const active = query.q.length > 0 || query.tags.length > 0;
  const meals = active ? await searchMeals(user.id, query) : [];
  const months = groupByMonth(meals, tz);

  return (
    <div className="flex flex-col gap-5 pt-6">
      <header className="flex items-center gap-3">
        <BackButton fallback="/calendrier" className="shrink-0" />
        <h1 className="text-[2rem] leading-tight font-semibold">Rechercher</h1>
      </header>

      <SearchForm q={query.q} tags={query.tags} />

      {!active ? (
        <div className="flex flex-col items-center gap-2 rounded-[24px] bg-surface-2 px-6 py-8 text-center">
          <Strawberry className="w-20" mood="wink" />
          <p className="font-semibold text-ink-soft">
            Un plat, une note, un contexte… je fouille ton carnet pour toi 🔎
          </p>
        </div>
      ) : meals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[24px] border-2 border-dashed border-line px-6 py-8 text-center">
          <Cloud className="w-24" mood="calm" />
          <p className="font-semibold text-ink-soft">
            Rien trouvé pour cette fois. Essaie un autre mot ?
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="pl-1 text-sm font-bold text-ink-soft" role="status">
            {meals.length === 1 ? "1 repas trouvé" : `${meals.length} repas trouvés`}
          </p>
          {months.map((month) => (
            <section
              key={month.key}
              aria-labelledby={`month-${month.key}`}
              className="flex flex-col gap-3"
            >
              <h2
                id={`month-${month.key}`}
                className="text-2xl font-semibold first-letter:uppercase"
              >
                {month.label}
              </h2>
              <MealList
                label={month.label}
                meals={month.items.map((meal) => {
                  const local = new TZDate(meal.eatenAt, tz);
                  return {
                    id: meal.id,
                    name: meal.name,
                    time: `${format(local, "EEE d", { locale: fr })} · ${format(local, "HH:mm")}`,
                    carbsGrams: meal.carbsGrams,
                    insulinUnits: meal.insulinUnits,
                    outcome: meal.outcome,
                    photoId: meal.photos[0]?.id ?? null,
                    notes: meal.notes,
                  };
                })}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
