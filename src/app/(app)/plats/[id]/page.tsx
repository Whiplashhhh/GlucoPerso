import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircleHeart, NotebookPen, Utensils } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DishActions } from "@/components/dishes/dish-actions";
import { DishArt, RecentOutcomes } from "@/components/dishes/dish-art";
import { FavoriteButton } from "@/components/dishes/favorite-button";
import { PhotoGallery } from "@/components/dishes/photo-gallery";
import { Sparkle } from "@/components/illustrations/buddies";
import { BackButton } from "@/components/meals/meal-actions";
import { MealList } from "@/components/meals/meal-list";
import { FlashToast } from "@/components/toast";
import { ButtonLink } from "@/components/ui/button";
import { dayKey, sinceLabel } from "@/lib/dates";
import { perfectSummary, timesEaten } from "@/lib/dish-stats";
import { formatGrams, formatRatio, formatUnits } from "@/lib/format";
import { getDish, listMergeTargets } from "@/server/repos/dishes";
import { idParam } from "@/server/params";
import { requireAppUser } from "@/server/session";

export const metadata: Metadata = { title: "Mon plat" };

export default async function DishPage({ params, searchParams }: PageProps<"/plats/[id]">) {
  const { user, settings } = await requireAppUser();
  const id = await idParam(params);
  const { fusion } = await searchParams;
  const [dish, targets] = await Promise.all([getDish(user.id, id), listMergeTargets(user.id, id)]);
  if (!dish || dish.meals.length === 0) notFound();

  const tz = settings.timezone;
  const { stats } = dish;
  const shortDate = (date: Date) => format(new TZDate(date, tz), "d MMM yyyy", { locale: fr });
  const photos = dish.meals.flatMap((meal) =>
    meal.photos.map((photo) => ({ id: photo.id, label: shortDate(meal.eatenAt) })),
  );
  // Her notes and feedback notes, oldest first, like a diary.
  const notes = [...dish.meals].reverse().flatMap((meal) => [
    ...(meal.notes
      ? [
          {
            key: `${meal.id}-n`,
            mealId: meal.id,
            date: meal.eatenAt,
            text: meal.notes,
            feedback: false,
          },
        ]
      : []),
    ...(meal.outcomeNote
      ? [
          {
            key: `${meal.id}-f`,
            mealId: meal.id,
            date: meal.eatenAt,
            text: meal.outcomeNote,
            feedback: true,
          },
        ]
      : []),
  ]);
  const best = stats.bestDose;
  const last = stats.lastEatenAt
    ? sinceLabel(dayKey(stats.lastEatenAt, tz), dayKey(new Date(), tz))
    : "";

  return (
    <article className="-mx-5 flex flex-col gap-6">
      {fusion === "1" && (
        <FlashToast message="C'est fusionné ! Tous les repas sont réunis ici 🎉" />
      )}
      <div className="relative">
        {photos.length ? (
          <PhotoGallery name={dish.name} photos={photos} />
        ) : (
          <DishArt dishId={dish.id} className="aspect-[16/10] w-full rounded-b-[32px]" />
        )}
        <BackButton
          fallback="/plats"
          className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4"
        />
      </div>

      <div className="flex flex-col gap-6 px-5">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-extrabold tracking-wide text-coral-ink uppercase">Mon plat</p>
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 text-[2rem] leading-tight font-semibold break-words">
              {dish.name}
            </h1>
            <FavoriteButton dishId={dish.id} isFavorite={dish.isFavorite} />
          </div>
          <p className="text-[15px] font-semibold text-ink-soft">
            {timesEaten(stats.count)} · dernière fois {last}
          </p>
        </header>

        <ButtonLink href={`/repas/nouveau?plat=${dish.id}`} size="lg">
          <Utensils size={22} />
          Manger ça
        </ButtonLink>

        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-[22px] bg-surface px-4 py-3.5 shadow-soft">
            <dt className="text-sm font-bold text-ink-soft">Glucides en moyenne</dt>
            <dd className="font-display text-[2rem] leading-none font-semibold text-ink tabular">
              {stats.averageCarbs === null ? "—" : formatGrams(stats.averageCarbs)}
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-[22px] bg-surface px-4 py-3.5 shadow-soft">
            <dt className="text-sm font-bold text-ink-soft">Pile poil 🎯</dt>
            <dd className="font-display text-[2rem] leading-none font-semibold text-ink tabular">
              {stats.perfect > 0 ? (
                <>
                  {stats.perfect}
                  <span className="font-sans text-base font-bold text-ink-soft">
                    {" "}
                    fois sur {stats.rated}
                  </span>
                </>
              ) : (
                "✨"
              )}
            </dd>
            <dd className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold text-ink-soft">
              <RecentOutcomes outcomes={stats.recentOutcomes} size={12} />
              {stats.perfect === 0 && perfectSummary(stats)}
            </dd>
          </div>
        </dl>

        {best ? (
          <section
            aria-labelledby="best-title"
            className="relative flex flex-col gap-1.5 overflow-hidden rounded-[24px] bg-mint-soft px-5 py-4 text-mint-ink"
          >
            <Sparkle className="absolute -top-1 right-3 w-10 text-mint opacity-60" />
            <h2
              id="best-title"
              className="font-sans text-sm font-extrabold tracking-wide uppercase"
            >
              🎯 La dose qui a le mieux marché
            </h2>
            <p className="font-display text-[1.9rem] leading-tight font-semibold tabular">
              {formatGrams(best.carbsGrams)} · {formatUnits(best.units)}
            </p>
            <p className="font-semibold">
              pile poil {best.times} fois
              {best.gramsPerUnit !== null && ` · soit ${formatRatio(best.gramsPerUnit)}`}
            </p>
          </section>
        ) : (
          <section className="flex items-center gap-3 rounded-[24px] border-2 border-dashed border-line px-5 py-4">
            <span className="text-2xl" aria-hidden="true">
              🎯
            </span>
            <p className="font-semibold text-ink-soft">
              Dès qu&apos;un repas sera pile poil, je garderai sa dose ici pour la prochaine fois ✨
            </p>
          </section>
        )}

        {notes.length > 0 && (
          <section
            aria-labelledby="notes-title"
            className="flex flex-col gap-3 rounded-[24px] bg-surface-2 p-5"
          >
            <h2
              id="notes-title"
              className="flex items-center gap-2 font-sans text-sm font-extrabold tracking-wide text-coral-ink uppercase"
            >
              <NotebookPen size={18} /> Mes notes
            </h2>
            <ol className="flex flex-col gap-3">
              {notes.map((note) => (
                <li
                  key={note.key}
                  className="flex flex-col gap-0.5 border-l-[3px] border-coral/40 pl-3"
                >
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-ink-soft">
                    {note.feedback && <MessageCircleHeart size={14} className="text-coral-ink" />}
                    {shortDate(note.date)}
                    {note.feedback && " · mon retour"}
                  </span>
                  <p className="whitespace-pre-line text-ink">{note.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="meals-title" className="flex flex-col gap-3">
          <h2 id="meals-title" className="pl-1 text-2xl font-semibold">
            Mes repas
          </h2>
          <MealList
            label={`Repas : ${dish.name}`}
            meals={dish.meals.map((meal) => {
              const local = new TZDate(meal.eatenAt, tz);
              return {
                id: meal.id,
                name: meal.name,
                time: format(local, "EEE d MMM", { locale: fr }),
                carbsGrams: meal.carbsGrams,
                insulinUnits: meal.insulinUnits,
                outcome: meal.outcome,
                photoId: meal.photos[0]?.id ?? null,
              };
            })}
          />
        </section>

        <DishActions dishId={dish.id} name={dish.name} count={stats.count} targets={targets} />
      </div>
    </article>
  );
}
