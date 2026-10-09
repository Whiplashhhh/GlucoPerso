"use client";

import { Lightbulb } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import type { RatioMoment } from "@/lib/moments";
import { decideSuggestionAction } from "@/server/actions/ratios";

type Props = {
  ratioKey: RatioMoment;
  explanation: string;
  question: string;
  meals: { id: string; name: string }[];
};

/** A soft suggestion card. Nothing changes unless she taps « Appliquer ». */
export function SuggestionCard({ ratioKey, explanation, question, meals }: Props) {
  const [pending, startTransition] = useTransition();
  const [answered, setAnswered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "ACCEPTED" | "DISMISSED" | "DOCTOR", message: string) {
    setAnswered(message);
    startTransition(async () => {
      const result = await decideSuggestionAction({ key: ratioKey, decision });
      if (!result.ok) {
        setAnswered(null);
        setError(result.error ?? "Oups, on réessaie ?");
      }
    });
  }

  return (
    <AnimatePresence mode="wait">
      {answered ? (
        <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Notice tone="success">{answered}</Notice>
        </motion.div>
      ) : (
        <motion.section
          key="card"
          exit={{ opacity: 0, scale: 0.97 }}
          aria-label="Suggestion de ratio"
          className="flex flex-col gap-4 rounded-[24px] bg-lavender-soft p-5 shadow-soft"
        >
          <div className="flex gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-lavender-ink">
              <Lightbulb size={22} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-ink">{explanation}</p>
              <p className="font-display text-xl font-semibold text-lavender-ink">{question}</p>
            </div>
          </div>
          {meals.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Repas concernés">
              {meals.map((meal) => (
                <li key={meal.id}>
                  <Link
                    href={`/repas/${meal.id}`}
                    className="inline-flex min-h-9 items-center rounded-full bg-surface px-3 text-sm font-bold text-ink-soft"
                  >
                    {meal.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {error && <Notice tone="warm">{error}</Notice>}
          <div className="flex flex-col gap-2">
            <Button
              loading={pending}
              onClick={() => decide("ACCEPTED", "C'est fait, ton nouveau ratio est enregistré ✨")}
            >
              Appliquer
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="soft"
                onClick={() => decide("DISMISSED", "Pas de souci, on garde ton ratio actuel 🌿")}
              >
                Pas maintenant
              </Button>
              <Button
                variant="soft"
                className="text-sm leading-tight"
                onClick={() =>
                  decide("DOCTOR", "Bonne idée ! Tu retrouveras tout dans « Mon évolution » 📋")
                }
              >
                J&apos;en parle à mon diabéto
              </Button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
