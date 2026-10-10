"use client";

import { Check, Moon, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { formatNumber } from "@/lib/format";
import { logBasalAction, undoBasalAction } from "@/server/actions/basal";

export type BasalToday = { units: number; time: string } | null;

/** « Lente faite aujourd'hui ✓ »: one tap, units prefilled from last time. */
export function BasalCard({
  today,
  defaultUnits,
  step,
  nowTime,
}: {
  today: BasalToday;
  defaultUnits: number;
  step: number;
  nowTime: string;
}) {
  const [done, setDone] = useState<BasalToday>(today);
  const [units, setUnits] = useState(today?.units ?? defaultUnits);
  const [time, setTime] = useState(today?.time ?? nowTime);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    const previous = done;
    setDone({ units, time });
    startTransition(async () => {
      const result = await logBasalAction({ units, time });
      if (!result.ok) {
        setDone(previous);
        setError(Object.values(result.fieldErrors ?? {})[0] ?? "Oups, on réessaie ?");
      }
    });
  }

  function undo() {
    setError(null);
    const previous = done;
    setDone(null);
    startTransition(async () => {
      const result = await undoBasalAction();
      if (!result.ok) {
        setDone(previous);
        setError("Oups, on réessaie ?");
      }
    });
  }

  return (
    <section aria-label="Insuline lente" className="flex flex-col gap-2">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex items-center gap-3 rounded-[24px] bg-mint-soft p-4"
          >
            <motion.span
              initial={{ scale: 0.4, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 14 }}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-mint text-white"
            >
              <Check size={26} strokeWidth={3} aria-hidden="true" />
            </motion.span>
            <div className="flex-1">
              <p className="font-display text-lg leading-snug font-semibold text-mint-ink">
                Lente faite aujourd&apos;hui ✓
              </p>
              <p className="text-sm font-bold text-mint-ink/80 tabular">
                {formatNumber(done.units)} U à {done.time.replace(":", " h ")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={pending}
              icon={<Undo2 size={18} />}
              className="min-h-12 text-mint-ink hover:bg-mint/15"
            >
              Annuler
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="todo"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col gap-4 rounded-[24px] bg-surface p-4 shadow-soft"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lavender-soft text-lavender-ink">
                <Moon size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-lg leading-snug font-semibold">Ta lente du jour</p>
                <p className="text-sm text-ink-soft">Une petite coche quand c&apos;est fait</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Stepper
                  label="unités de lente"
                  size="md"
                  value={units}
                  onChange={setUnits}
                  step={step}
                  min={0.5}
                  max={100}
                  suffix="U"
                />
              </div>
              <label className="flex flex-col items-center gap-0.5">
                <span className="sr-only">Heure de la lente</span>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="min-h-12 rounded-[16px] border-2 border-line bg-surface-2 px-2 text-base font-bold text-ink tabular outline-none focus:border-coral"
                />
              </label>
            </div>
            <Button onClick={save} loading={pending} icon={<Check size={20} strokeWidth={3} />}>
              Lente faite
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <Notice tone="warm">{error}</Notice>}
    </section>
  );
}
