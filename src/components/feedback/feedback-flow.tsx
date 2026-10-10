"use client";

import { ArrowDown, ArrowUp, Target, X } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Celebration, CheerArt } from "@/components/celebration";
import { Cloud, Peach, Sun } from "@/components/illustrations/buddies";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { ENCOURAGEMENTS, KIND_AFTER_MISS, pickRandom } from "@/lib/copy";
import { photoUrl } from "@/lib/dishes";
import { parseDecimal } from "@/lib/format";
import {
  fromUnit,
  type GlucoseThresholds,
  type GlucoseUnit,
  GLUCOSE_UNIT_LABEL,
  type Outcome,
  suggestOutcome,
  toUnit,
} from "@/lib/glucose";
import { OUTCOME_INFO, OUTCOMES } from "@/lib/outcomes";
import { saveFeedbackAction, skipFeedbackAction } from "@/server/actions/feedback";

type FeedbackMeal = {
  id: string;
  name: string;
  photoId: string | null;
  outcome: Outcome | null;
  glucoseAfter: number | null;
  glucoseLow: number | null;
  glucoseHigh: number | null;
  hypoTreated: boolean | null;
  outcomeNote: string | null;
};

const ICONS = { TOO_MUCH: ArrowDown, PERFECT: Target, NOT_ENOUGH: ArrowUp } as const;

export function FeedbackFlow({
  meal,
  glucoseUnit,
  thresholds,
}: {
  meal: FeedbackMeal;
  glucoseUnit: GlucoseUnit;
  thresholds: GlucoseThresholds;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const show = (value: number | null) =>
    value === null ? "" : String(toUnit(value, glucoseUnit)).replace(".", ",");
  const [picked, setPicked] = useState<Outcome | null>(meal.outcome);
  const [after, setAfter] = useState(show(meal.glucoseAfter));
  const [low, setLow] = useState(show(meal.glucoseLow));
  const [high, setHigh] = useState(show(meal.glucoseHigh));
  const [hypo, setHypo] = useState<"yes" | "no" | "unknown">(
    meal.hypoTreated === null ? "unknown" : meal.hypoTreated ? "yes" : "no",
  );
  const [note, setNote] = useState(meal.outcomeNote ?? "");
  const [done, setDone] = useState<{ outcome: Outcome; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toGl = (text: string) => {
    const value = parseDecimal(text);
    return value === null ? null : fromUnit(value, glucoseUnit);
  };
  const readings = {
    after: toGl(after),
    low: toGl(low),
    high: toGl(high),
    hypoTreated: hypo === "unknown" ? null : hypo === "yes",
  };
  // Her own choice always wins; the readings only pre-select.
  const suggested = suggestOutcome(readings, thresholds);
  const outcome = picked ?? suggested;

  function save() {
    if (!outcome) {
      setError("Choisis la réponse qui te ressemble le plus 🙂");
      return;
    }
    setError(null);
    const message =
      outcome === "PERFECT" ? pickRandom(ENCOURAGEMENTS) : pickRandom(KIND_AFTER_MISS);
    // Optimistic: celebrate right away, the save happens in the background.
    setDone({ outcome, message });
    startTransition(async () => {
      const result = await saveFeedbackAction(meal.id, {
        outcome,
        glucoseAfter: readings.after,
        glucoseLow: readings.low,
        glucoseHigh: readings.high,
        hypoTreated: readings.hypoTreated,
        outcomeNote: note,
      });
      if (!result.ok) {
        setDone(null);
        setError(
          Object.values(result.fieldErrors ?? {})[0] ?? result.error ?? "Oups, on réessaie ?",
        );
      }
    });
  }

  function skip() {
    startTransition(async () => {
      await skipFeedbackAction(meal.id);
      router.push("/");
    });
  }

  if (done) {
    const perfect = done.outcome === "PERFECT";
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 pt-safe pb-safe text-center md:min-h-[calc(100dvh-3rem)]">
        {perfect && <Celebration seed={meal.name.length + 3} />}
        <motion.div
          initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 13 }}
        >
          <CheerArt tone={perfect ? "mint" : "coral"} sparkles={perfect}>
            {perfect ? <Sun className="w-36" mood="joy" /> : <Peach className="w-32" mood="wink" />}
          </CheerArt>
        </motion.div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-extrabold",
            OUTCOME_INFO[done.outcome].soft,
          )}
        >
          {OUTCOME_INFO[done.outcome].emoji} {OUTCOME_INFO[done.outcome].short}
        </span>
        <h1
          className={cn(
            "max-w-sm leading-tight font-semibold",
            done.message.length > 50 ? "text-[1.65rem]" : "text-[2rem]",
          )}
          role="status"
        >
          {done.message}
        </h1>
        <p className="max-w-xs text-balance text-ink-soft">
          {perfect
            ? "Ce repas rejoint ta collection des réussites."
            : "Ton ratio apprend de chaque retour, en douceur."}
        </p>
        <ButtonLink href="/" size="lg" className="w-full max-w-xs">
          Retour à l&apos;accueil
        </ButtonLink>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col pt-safe md:min-h-[calc(100dvh-3rem)]">
      <header className="flex items-center justify-between px-3 py-2">
        <Link
          href="/"
          aria-label="Fermer"
          className="grid size-12 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
        >
          <X size={26} />
        </Link>
        <button
          type="button"
          onClick={skip}
          disabled={pending}
          className="min-h-11 rounded-2xl px-3 text-sm font-bold text-ink-soft"
        >
          Je ne sais plus
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 pb-36">
        <div className="flex flex-col items-center gap-3 text-center">
          {meal.photoId ? (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated photo route
            <img
              src={photoUrl(meal.photoId)}
              alt=""
              className="size-24 rounded-[24px] object-cover shadow-soft"
            />
          ) : (
            <CheerArt tone="sky" sparkles={false} className="size-24">
              <Cloud className="w-24" mood="happy" />
            </CheerArt>
          )}
          <h1 className="text-[1.9rem] leading-tight font-semibold">
            Comment ça s&apos;est passé pour {meal.name.toLowerCase()} ?
          </h1>
        </div>

        <div role="radiogroup" aria-label="Résultat du repas" className="flex flex-col gap-3">
          {OUTCOMES.map((value) => {
            const info = OUTCOME_INFO[value];
            const Icon = ICONS[value];
            const selected = outcome === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPicked(value)}
                className={cn(
                  "flex min-h-20 items-center gap-4 rounded-[24px] border-[3px] px-4 py-3 text-left transition-[transform,border-color,background-color] active:scale-[0.98]",
                  selected
                    ? cn("border-current", info.soft)
                    : "border-transparent bg-surface shadow-soft",
                )}
              >
                <span
                  className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", info.tone)}
                >
                  <Icon size={26} strokeWidth={2.6} />
                </span>
                <span className="flex flex-col">
                  <span className="text-lg font-extrabold text-ink">
                    {info.label} {value === "PERFECT" && "🎯"}
                  </span>
                  <span className="text-sm text-ink-soft">{info.hint}</span>
                </span>
                {selected && !picked && (
                  <span className="ml-auto rounded-full bg-surface px-2 py-1 text-xs font-extrabold text-ink-soft">
                    d&apos;après tes valeurs
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <details className="group rounded-[24px] bg-surface p-4 shadow-soft">
          <summary className="cursor-pointer list-none font-bold text-ink">
            Ajouter des valeurs <span className="font-semibold text-ink-soft">(facultatif)</span>
            <span className="float-right grid size-7 place-items-center rounded-full bg-coral-soft text-coral-ink transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              <GlucoseInput label="Après" value={after} onChange={setAfter} unit={glucoseUnit} />
              <GlucoseInput label="Plus bas" value={low} onChange={setLow} unit={glucoseUnit} />
              <GlucoseInput label="Plus haut" value={high} onChange={setHigh} unit={glucoseUnit} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="pl-1 text-sm font-bold text-ink-soft">Hypo ressucrée ?</p>
              <Segmented
                label="Hypo ressucrée"
                value={hypo}
                onChange={setHypo}
                options={[
                  { value: "no", label: "Non" },
                  { value: "yes", label: "Oui" },
                  { value: "unknown", label: "—" },
                ]}
              />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-sm font-bold text-ink-soft">
                Une note pour la prochaine fois
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Les glucides sont arrivés 3 h après…"
                className={cn(inputClass, "min-h-20 py-3 text-base")}
              />
            </label>
          </div>
        </details>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 mx-auto w-full max-w-md bg-gradient-to-t from-bg via-bg/95 to-transparent px-5 pt-8 pb-safe md:bottom-6 md:rounded-b-[36px]">
        {error && (
          <Notice tone="warm" className="pointer-events-auto mb-3">
            {error}
          </Notice>
        )}
        <Button
          size="lg"
          className="pointer-events-auto mb-4 w-full"
          onClick={save}
          loading={pending}
        >
          C&apos;est noté
        </Button>
      </div>
    </main>
  );
}

function GlucoseInput({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: GlucoseUnit;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="pl-1 text-xs font-bold text-ink-soft">
        {label} ({GLUCOSE_UNIT_LABEL[unit]})
      </span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9.,]/g, ""))}
        placeholder={unit === "MG_DL" ? "120" : "1,20"}
        className={cn(inputClass, "min-h-12 px-3 text-center text-base tabular")}
      />
    </label>
  );
}
