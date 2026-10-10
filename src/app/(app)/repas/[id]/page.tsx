import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircleHeart, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Bowl } from "@/components/illustrations/buddies";
import { BackButton, DeleteMealButton } from "@/components/meals/meal-actions";
import { OutcomeDot } from "@/components/outcome-dot";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { dayKey } from "@/lib/dates";
import { photoUrl } from "@/lib/dishes";
import { formatGrams, formatNumber, formatRatio, formatUnits } from "@/lib/format";
import { formatGlucose } from "@/lib/glucose";
import { MOMENT_EMOJI, MOMENT_LABEL } from "@/lib/moments";
import { OUTCOME_INFO } from "@/lib/outcomes";
import { TAG_INFO } from "@/lib/tags";
import { getMeal } from "@/server/repos/meals";
import { idParam } from "@/server/params";
import { requireAppUser } from "@/server/session";

export const metadata: Metadata = { title: "Repas" };

export default async function MealDetailPage({ params }: PageProps<"/repas/[id]">) {
  const { user, settings } = await requireAppUser();
  const id = await idParam(params);
  const meal = await getMeal(user.id, id);
  if (!meal) notFound();

  const tz = settings.timezone;
  const unit = settings.glucoseUnit;
  const local = new TZDate(meal.eatenAt, tz);
  const day = dayKey(meal.eatenAt, tz);
  const fallback = `/calendrier?jour=${day}`;
  const photoId = meal.photos[0]?.id;
  const glucose = (value: number | null) => (value === null ? "—" : formatGlucose(value, unit));
  const readings = [
    ["Après", meal.glucoseAfter],
    ["Plus bas", meal.glucoseLow],
    ["Plus haut", meal.glucoseHigh],
  ] as const;
  const measured = readings.filter(([, value]) => value !== null);

  return (
    <article className="-mx-5 flex flex-col gap-5">
      <div className="relative">
        {photoId ? (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated photo route
          <img
            src={photoUrl(photoId, "full")}
            alt={`Photo : ${meal.name}`}
            className="aspect-[4/3] w-full rounded-b-[32px] object-cover shadow-soft"
          />
        ) : (
          <div className="grid aspect-[16/9] w-full place-items-center rounded-b-[32px] bg-surface-2">
            <Bowl className="w-32" mood="happy" />
          </div>
        )}
        <BackButton
          fallback={fallback}
          className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4"
        />
      </div>

      <div className="flex flex-col gap-5 px-5">
        <header className="flex flex-col gap-2">
          <h1 className="text-[2rem] leading-tight font-semibold break-words">{meal.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-ink-soft">
            <span className="font-semibold first-letter:uppercase">
              {format(local, "EEEE d MMMM yyyy", { locale: fr })} · {format(local, "HH:mm")}
            </span>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-bold text-ink">
              {MOMENT_EMOJI[meal.moment]} {MOMENT_LABEL[meal.moment]}
            </span>
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Glucides" value={formatGrams(meal.carbsGrams)} big />
          <Stat
            label="Insuline rapide"
            value={formatUnits(meal.insulinUnits)}
            hint={
              meal.correctionUnits > 0
                ? `dont ${formatNumber(meal.correctionUnits)} U de correction`
                : undefined
            }
            big
          />
          <Stat label="Glycémie avant" value={glucose(meal.glucoseBefore)} />
          <Stat
            label="Ratio utilisé"
            value={meal.ratioUsed === null ? "—" : formatRatio(meal.ratioUsed)}
          />
        </dl>

        {meal.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Contexte">
            {meal.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border-2 border-line bg-surface px-3.5 py-1.5 text-[15px] font-bold text-ink-soft"
              >
                {TAG_INFO[tag].emoji} {TAG_INFO[tag].label}
              </li>
            ))}
          </ul>
        )}

        {meal.notes && (
          <Section title="Mes notes">
            <p className="whitespace-pre-line text-ink">{meal.notes}</p>
          </Section>
        )}

        {meal.outcome ? (
          <section
            aria-labelledby="feedback-title"
            className={cn(
              "flex flex-col gap-3 rounded-[24px] p-5",
              OUTCOME_INFO[meal.outcome].soft,
            )}
          >
            <h2 id="feedback-title" className="flex items-center gap-2.5 text-xl font-semibold">
              <OutcomeDot outcome={meal.outcome} size={20} />
              {OUTCOME_INFO[meal.outcome].label} {OUTCOME_INFO[meal.outcome].emoji}
            </h2>
            {(measured.length > 0 || meal.hypoTreated) && (
              <dl className="flex flex-wrap gap-2">
                {measured.map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-surface/70 px-3 py-2">
                    <dt className="text-xs font-bold opacity-80">{label}</dt>
                    <dd className="font-extrabold tabular">{glucose(value)}</dd>
                  </div>
                ))}
                {meal.hypoTreated && (
                  <div className="rounded-2xl bg-surface/70 px-3 py-2">
                    <dt className="text-xs font-bold opacity-80">Hypo</dt>
                    <dd className="font-extrabold">Ressucrée</dd>
                  </div>
                )}
              </dl>
            )}
            {meal.outcomeNote && (
              <p className="font-semibold whitespace-pre-line">« {meal.outcomeNote} »</p>
            )}
          </section>
        ) : (
          <section className="flex items-center gap-3 rounded-[24px] border-2 border-dashed border-line p-4">
            <OutcomeDot outcome={null} size={20} />
            <p className="font-semibold text-ink-soft">
              Pas encore de retour pour ce repas. Quand tu veux 🙂
            </p>
          </section>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <ButtonLink
            href={`/retour/${meal.id}`}
            size="lg"
            variant={meal.outcome ? "soft" : "primary"}
          >
            <MessageCircleHeart size={22} />
            {meal.outcome ? "Modifier mon retour" : "Donner mon retour"}
          </ButtonLink>
          <ButtonLink href={`/repas/${meal.id}/modifier`} replace size="lg" variant="outline">
            <Pencil size={20} />
            Modifier
          </ButtonLink>
          <DeleteMealButton mealId={meal.id} fallback={fallback} />
        </div>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  hint,
  big = false,
}: {
  label: string;
  value: string;
  hint?: string;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[22px] bg-surface px-4 py-3 shadow-soft">
      <dt className="text-sm font-bold text-ink-soft">{label}</dt>
      <dd
        className={cn(
          "font-display font-semibold text-ink tabular",
          big ? "text-[2rem] leading-none" : "text-xl",
        )}
      >
        {value}
      </dd>
      {hint && <dd className="text-xs font-bold text-ink-soft">{hint}</dd>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-[24px] bg-surface-2 p-5">
      <h2 className="font-sans text-sm font-extrabold tracking-wide text-coral-ink uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
