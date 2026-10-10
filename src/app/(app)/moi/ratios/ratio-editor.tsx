"use client";

import { Pencil, Plus, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { formatNumber } from "@/lib/format";
import {
  MEAL_MOMENTS,
  MOMENT_EMOJI,
  MOMENT_IN_SENTENCE,
  MOMENT_LABEL,
  type MealMoment,
  type RatioMoment,
  type RatioTable,
} from "@/lib/moments";
import { ratioEditSchema } from "@/lib/validation/settings";
import {
  removeMomentRatioAction,
  setRatioAction,
  togglePerMomentRatiosAction,
} from "@/server/actions/settings";

type Editing = { moment: RatioMoment; value: number; justification: string; isNew: boolean };

export function RatioEditor({ ratios, perMoment }: { ratios: RatioTable; perMoment: boolean }) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [shownPerMoment, setShownPerMoment] = useOptimistic(perMoment);
  const general = ratios.DEFAULT ?? 10;
  const ownMoments = MEAL_MOMENTS.filter((moment) => ratios[moment] !== undefined);

  function run(task: () => Promise<{ ok?: boolean; error?: string; fieldErrors?: object }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        const fieldError = Object.values(result.fieldErrors ?? {})[0] as string | undefined;
        setError(result.error ?? fieldError ?? "Oups, on réessaie ?");
        return;
      }
      setEditing(null);
      setConfirmOff(false);
    });
  }

  function saveEdit() {
    if (!editing) return;
    const parsed = ratioEditSchema.safeParse({
      moment: editing.moment,
      value: editing.value,
      justification: editing.justification,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Valeur invalide");
      return;
    }
    run(() => setRatioAction(parsed.data));
  }

  function toggle(enabled: boolean) {
    if (!enabled && ownMoments.length > 0) {
      setConfirmOff(true);
      return;
    }
    run(() => {
      setShownPerMoment(enabled);
      return togglePerMomentRatiosAction({ enabled });
    });
  }

  const open = (moment: RatioMoment, isNew = false) => {
    setError(null);
    setEditing({ moment, value: ratios[moment] ?? general, justification: "", isNew });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-[28px] bg-coral-soft p-5 shadow-soft">
        <div
          aria-hidden="true"
          className="absolute -right-14 -bottom-16 size-44 rounded-full bg-coral/15"
        />
        <p className="relative text-sm font-extrabold tracking-wide text-coral-ink uppercase">
          ✨ Ratio général
        </p>
        <div className="relative mt-2 flex items-end justify-between gap-3">
          <p className="flex items-end gap-2">
            <span className="pb-1.5 font-display text-xl font-semibold text-ink-soft">
              1 U pour
            </span>
            <span className="font-display text-6xl leading-none font-semibold tabular">
              {formatNumber(general)}
            </span>
            <span className="pb-1.5 font-display text-2xl font-semibold text-ink-soft">g</span>
          </p>
          <Button
            variant="soft"
            onClick={() => open("DEFAULT")}
            icon={<Pencil size={18} />}
            className="bg-surface/80"
            aria-label="Modifier le ratio général"
          >
            Modifier
          </Button>
        </div>
        <p className="relative mt-3 text-sm text-ink-soft">
          Utilisé pour tous les moments qui n&apos;ont pas leur propre ratio.
        </p>
      </div>

      <div className="rounded-[24px] bg-surface p-4 shadow-soft">
        <Switch
          label="Un ratio par moment"
          description="Petit-déj, déjeuner, goûter, dîner, encas"
          checked={shownPerMoment}
          onChange={toggle}
        />
      </div>

      <AnimatePresence initial={false}>
        {shownPerMoment && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="-m-2 flex flex-col gap-2 overflow-hidden p-2"
            aria-label="Ratios par moment"
          >
            {MEAL_MOMENTS.map((moment) => (
              <MomentRow
                key={moment}
                moment={moment}
                value={ratios[moment]}
                general={general}
                onEdit={() => open(moment, ratios[moment] === undefined)}
                onRemove={() => run(() => removeMomentRatioAction({ moment }))}
                disabled={pending}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {error && !editing && <Notice tone="warm">{error}</Notice>}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing
            ? editing.moment === "DEFAULT"
              ? "Ton ratio général"
              : `Ton ratio ${MOMENT_IN_SENTENCE[editing.moment]}`
            : ""
        }
      >
        {editing && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 rounded-[24px] bg-surface-2 p-4">
              <p className="text-center text-sm font-bold text-ink-soft">1 unité pour</p>
              <Stepper
                label={`ratio ${MOMENT_LABEL[editing.moment]}`}
                value={editing.value}
                onChange={(value) => setEditing({ ...editing, value })}
                step={0.5}
                min={1}
                max={150}
                suffix="g"
              />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-sm font-bold text-ink-soft">
                Pourquoi ce changement ? <span className="font-semibold">(facultatif)</span>
              </span>
              <textarea
                value={editing.justification}
                onChange={(event) => setEditing({ ...editing, justification: event.target.value })}
                maxLength={280}
                rows={2}
                placeholder="Conseil de mon diabéto, nouveau rythme…"
                className="w-full resize-none rounded-[18px] border-2 border-line bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-ink-faint focus:border-coral"
              />
            </label>
            {error && <Notice tone="warm">{error}</Notice>}
            <Button size="lg" onClick={saveEdit} loading={pending}>
              {editing.isNew ? "Ajouter ce ratio" : "Enregistrer"}
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={confirmOff} onClose={() => setConfirmOff(false)} title="Un seul ratio ?">
        <div className="flex flex-col gap-4">
          <p className="text-center text-ink-soft">
            Tes ratios par moment seront retirés : tous tes repas suivront le ratio général (
            {formatNumber(general)} g). Ton historique, lui, est gardé.
          </p>
          <Button
            size="lg"
            loading={pending}
            onClick={() =>
              run(() => {
                setShownPerMoment(false);
                return togglePerMomentRatiosAction({ enabled: false });
              })
            }
          >
            Oui, un seul ratio
          </Button>
          <Button variant="soft" onClick={() => setConfirmOff(false)}>
            Je garde mes ratios
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MomentRow({
  moment,
  value,
  general,
  onEdit,
  onRemove,
  disabled,
}: {
  moment: MealMoment;
  value: number | undefined;
  general: number;
  onEdit: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const own = value !== undefined;
  return (
    <li className="flex items-center gap-3 rounded-[22px] bg-surface p-3 pl-4 shadow-soft">
      <span aria-hidden="true" className="text-2xl">
        {MOMENT_EMOJI[moment]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-ink">{MOMENT_LABEL[moment]}</p>
        {own ? (
          <p className="font-display text-xl leading-tight font-semibold tabular">
            1 U / {formatNumber(value)} g
          </p>
        ) : (
          <p className="text-sm text-ink-soft">Suit le général ({formatNumber(general)} g)</p>
        )}
      </div>
      {own ? (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Revenir au ratio général pour ${MOMENT_LABEL[moment]}`}
            className="grid size-12 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 active:scale-90 disabled:opacity-40"
          >
            <Undo2 size={20} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Modifier le ratio ${MOMENT_LABEL[moment]}`}
            className="grid size-12 place-items-center rounded-full bg-coral-soft text-coral-ink transition active:scale-90"
          >
            <Pencil size={20} />
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          icon={<Plus size={18} />}
          className="min-h-12"
          aria-label={`Ajouter un ratio ${MOMENT_LABEL[moment]}`}
        >
          Ajouter
        </Button>
      )}
    </li>
  );
}
