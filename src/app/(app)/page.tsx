import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { BasalCheck } from "@/components/home/basal-check";
import type { MealRowData } from "@/components/home/meal-row";
import { RatioHero, type RatioSlide } from "@/components/home/ratio-hero";
import { SuggestionCard } from "@/components/home/suggestion-card";
import { Peach, Sun } from "@/components/illustrations/buddies";
import { MealList } from "@/components/meals/meal-list";
import { MedicalNote } from "@/components/medical-note";
import { FlashToast } from "@/components/toast";
import { WORDS_OF_THE_DAY, greeting, pickForDay } from "@/lib/copy";
import { dayRange, timeIn } from "@/lib/dates";
import { photoUrl } from "@/lib/dishes";
import { hourIn, momentAt, resolveRatio } from "@/lib/moments";
import { listMealsBetween, pendingFeedback } from "@/server/repos/meals";
import { ratioInsights } from "@/server/repos/ratios";
import { requireAppUser } from "@/server/session";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { user, settings } = await requireAppUser();
  const { ajout } = await searchParams;
  const now = new Date();
  const tz = settings.timezone;
  const { start, end } = dayRange(now, tz);

  const [insights, pending, today] = await Promise.all([
    ratioInsights(user.id, settings, now),
    pendingFeedback(user.id, now),
    listMealsBetween(user.id, start, end),
  ]);

  const hello = greeting(user.name, hourIn(now, tz));
  const currentKey = resolveRatio(momentAt(now, tz), insights.ratios)?.key ?? "DEFAULT";
  const slides: RatioSlide[] = insights.analyses.map((analysis) => ({
    key: analysis.key,
    gramsPerUnit: insights.ratios[analysis.key] ?? 0,
    confidence: analysis.confidence,
    mealCount: analysis.consideredMealIds.length,
  }));
  const suggestions = insights.analyses.flatMap((analysis) =>
    analysis.suggestion ? [analysis.suggestion] : [],
  );
  const todayRows: MealRowData[] = today.map((meal) => ({
    id: meal.id,
    name: meal.name,
    time: timeIn(meal.eatenAt, tz),
    carbsGrams: meal.carbsGrams,
    insulinUnits: meal.insulinUnits,
    outcome: meal.outcome,
    photoId: meal.photos[0]?.id ?? null,
  }));

  return (
    <div className="flex flex-col gap-6 pt-6">
      {ajout && <FlashToast message="C'est noté ! Je te demanderai comment ça s'est passé 🍽️" />}

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[2.1rem] leading-tight font-semibold">{hello.title}</h1>
          <p className="mt-1 text-ink-soft">{hello.subtitle}</p>
        </div>
        <Sun className="-mt-1 w-16 shrink-0 motion-safe:animate-[bob_5s_ease-in-out_infinite]" />
      </header>

      {slides.length > 0 && <RatioHero slides={slides} initialKey={currentKey} />}

      <BasalCheck userId={user.id} timeZone={tz} penIncrement={settings.penIncrement} />

      {pending.map((meal) => (
        <Link
          key={meal.id}
          href={`/retour/${meal.id}`}
          className="flex items-center gap-4 rounded-[24px] bg-surface p-4 shadow-soft ring-2 ring-coral/30 transition-transform active:scale-[0.98]"
        >
          {meal.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated photo route
            <img
              src={photoUrl(meal.photos[0].id)}
              alt=""
              className="size-16 shrink-0 rounded-[18px] object-cover"
            />
          ) : (
            <Peach className="w-16 shrink-0" mood="wink" />
          )}
          <div className="flex-1">
            <p className="font-display text-lg leading-snug font-semibold">
              Comment ça s&apos;est passé pour {meal.name.toLowerCase()} ?
            </p>
            <p className="text-sm font-bold text-coral-ink">Ça prend 5 secondes →</p>
          </div>
        </Link>
      ))}

      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.key}
          ratioKey={suggestion.key}
          explanation={suggestion.explanation}
          question={suggestion.question}
          meals={suggestion.mealIds.map((id) => ({ id, name: insights.mealNames[id] ?? "Repas" }))}
        />
      ))}

      {insights.medicalTalk && (
        <div className="flex gap-3 rounded-[24px] bg-sky-soft p-4">
          <HeartHandshake className="mt-0.5 shrink-0 text-ink-soft" size={22} />
          <p className="text-[15px] font-semibold text-ink">
            Tu as dû te ressucrer plusieurs fois ces derniers jours. Prends soin de toi 💛 Ce serait
            une bonne idée d&apos;en parler à ton équipe médicale, elle est là pour ça.
          </p>
        </div>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="today-title">
        <h2 id="today-title" className="text-2xl font-semibold">
          Aujourd&apos;hui
        </h2>
        <MealList
          meals={todayRows}
          label="Repas d'aujourd'hui"
          empty={
            <div className="flex flex-col items-center gap-2 rounded-[24px] border-2 border-dashed border-line px-6 py-7 text-center">
              <Peach className="w-20" mood="calm" />
              <p className="font-semibold text-ink-soft">
                Rien ici pour l&apos;instant… ton estomac attend son heure 🍽️
              </p>
            </div>
          }
        />
      </section>

      <aside className="rounded-[24px] bg-surface-2 p-5">
        <p className="text-xs font-extrabold tracking-wide text-coral-ink uppercase">
          Le mot du jour
        </p>
        <p className="mt-1 font-display text-xl leading-snug font-medium text-ink">
          {pickForDay(WORDS_OF_THE_DAY, now)}
        </p>
      </aside>

      <MedicalNote />
    </div>
  );
}
