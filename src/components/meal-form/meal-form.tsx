"use client";

import { format } from "date-fns";
import { CalendarClock, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { doseHint } from "@/lib/dose";
import { formatNumber, formatRatio, parseDecimal } from "@/lib/format";
import { fromUnit, type GlucoseUnit, GLUCOSE_UNIT_LABEL } from "@/lib/glucose";
import {
  MEAL_MOMENTS,
  MOMENT_EMOJI,
  MOMENT_LABEL,
  type MealMoment,
  momentForHour,
  type RatioMoment,
  type RatioTable,
  resolveRatio,
} from "@/lib/moments";
import { MEAL_TAGS, type MealTag, TAG_INFO } from "@/lib/tags";
import type { DishMemory } from "@/server/repos/dishes";
import { createMealAction } from "@/server/actions/meals";
import { DishMemoryCard } from "./dish-memory";
import { NumPad, applyKey } from "./numpad";
import { PhotoPicker } from "./photo-picker";

type Field = "carbs" | "units" | "correction" | "glucose";

const RATIO_OF: Record<RatioMoment, string> = {
  DEFAULT: "ton ratio",
  BREAKFAST: "ton ratio du petit-déj",
  LUNCH: "ton ratio du midi",
  AFTERNOON_SNACK: "ton ratio du goûter",
  DINNER: "ton ratio du soir",
  SNACK: "ton ratio des encas",
};

export type MealFormSettings = {
  glucoseUnit: GlucoseUnit;
  penIncrement: number;
  doseConfirmThreshold: number;
};

const toText = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? "" : formatNumber(value, digits).replace(/\s/g, "");

export function MealForm({ ratios, settings }: { ratios: RatioTable; settings: MealFormSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unit = settings.glucoseUnit;

  const [photoId, setPhotoId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [memories, setMemories] = useState<DishMemory[]>([]);
  const [chosen, setChosen] = useState<DishMemory | null>(null);
  const [moment, setMoment] = useState<MealMoment>(() => momentForHour(new Date().getHours()));
  const [eatenAt, setEatenAt] = useState<Date | null>(null);
  const [values, setValues] = useState<Record<Field, string>>({
    carbs: "",
    units: "",
    correction: "",
    glucose: "",
  });
  const [active, setActive] = useState<Field>("carbs");
  const [tags, setTags] = useState<Set<MealTag>>(new Set());
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const searchSeq = useRef(0);

  const carbs = parseDecimal(values.carbs) ?? 0;
  const units = parseDecimal(values.units) ?? 0;
  const ratio = resolveRatio(moment, ratios);
  const hint = ratio ? doseHint(carbs, ratio.gramsPerUnit, settings.penIncrement) : null;

  // Fuzzy "already eaten" lookup, debounced.
  useEffect(() => {
    const query = name.trim();
    const seq = ++searchSeq.current;
    if (query.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/dishes/search?q=${encodeURIComponent(query)}`);
        const json = (await response.json()) as { results: DishMemory[] };
        if (seq === searchSeq.current) setMemories(json.results ?? []);
      } catch {
        if (seq === searchSeq.current) setMemories([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [name]);

  const visible = name.trim().length < 2 ? [] : memories;
  const top = visible[0];
  const best = chosen ?? (top && top.score >= 0.5 ? top : null);
  const suggestions = visible.filter(
    (memory) => memory.dishId !== best?.dishId && memory.name !== name.trim(),
  );

  const fieldConfig: Record<Field, { label: string; suffix: string; decimals: number }> = {
    carbs: { label: "Glucides", suffix: "g", decimals: 0 },
    units: { label: "Insuline rapide", suffix: "U", decimals: 1 },
    correction: { label: "dont correction", suffix: "U", decimals: 1 },
    glucose: {
      label: "Glycémie avant",
      suffix: GLUCOSE_UNIT_LABEL[unit],
      decimals: unit === "MG_DL" ? 0 : 2,
    },
  };

  function press(key: string) {
    setValues((current) => ({
      ...current,
      [active]: applyKey(current[active], key, fieldConfig[active].decimals),
    }));
    setErrors((current) => ({ ...current, [fieldKey(active)]: "" }));
  }

  function reuse(memory: DishMemory) {
    const last = memory.lastMeal;
    setName(memory.name);
    setChosen(memory);
    if (!last) return;
    setValues((current) => ({
      ...current,
      carbs: toText(last.carbsGrams, 0),
      units: toText(last.insulinUnits - last.correctionUnits),
    }));
    if (last.tags.includes("SLOW_ABSORPTION")) {
      setTags((current) => new Set(current).add("SLOW_ABSORPTION"));
    }
    setActive("units");
  }

  function toggleTag(tag: MealTag) {
    setTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function submit(confirmedHighDose = false) {
    setFormError(null);
    const glucose = parseDecimal(values.glucose);
    const input = {
      name,
      eatenAt: (eatenAt ?? new Date()).toISOString(),
      moment,
      carbsGrams: values.carbs === "" ? undefined : carbs,
      insulinUnits: values.units === "" ? undefined : units,
      correctionUnits: parseDecimal(values.correction) ?? 0,
      glucoseBefore: glucose === null ? null : fromUnit(glucose, unit),
      tags: [...tags],
      notes,
      photoId,
      confirmedHighDose,
    };
    const local: Record<string, string> = {};
    if (!name.trim()) local.name = "Comment s'appelle ce plat ?";
    if (values.carbs === "") local.carbsGrams = "Combien de glucides ?";
    if (values.units === "") local.insulinUnits = "Combien d'unités ?";
    if (Object.keys(local).length) {
      setErrors(local);
      if (local.carbsGrams) setActive("carbs");
      else if (local.insulinUnits) setActive("units");
      return;
    }
    if (!confirmedHighDose && units > settings.doseConfirmThreshold) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await createMealAction(input);
      if (result.ok && result.data) {
        router.push(`/?ajout=${result.data.id}`);
        return;
      }
      if (result.data?.needsConfirmation) {
        setConfirming(true);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setFormError(
        result.fieldErrors
          ? "Un petit détail à vérifier 👀"
          : "Oups, ça n'a pas marché. On réessaie ?",
      );
    });
  }

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 34 }}
      className="flex min-h-dvh flex-col"
    >
      <header className="sticky top-0 z-20 bg-bg/85 pt-safe backdrop-blur-lg">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Fermer"
            className="grid size-12 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
          >
            <X size={26} />
          </button>
          <h1 className="text-xl font-semibold">Nouveau repas</h1>
          <span className="size-12" />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 pt-2 pb-40">
        <PhotoPicker photoId={photoId} onChange={setPhotoId} />

        <section className="flex flex-col gap-3">
          <label htmlFor="meal-name" className="pl-1 text-sm font-bold text-ink-soft">
            Qu&apos;est-ce qu&apos;on mange ?
          </label>
          <input
            id="meal-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setChosen(null);
              setErrors((current) => ({ ...current, name: "" }));
            }}
            placeholder="Raclette, pâtes au pesto…"
            autoComplete="off"
            maxLength={80}
            aria-invalid={errors.name ? true : undefined}
            className={cn(inputClass, "text-xl font-semibold")}
          />
          {errors.name && (
            <p className="pl-1 text-sm font-semibold text-coral-ink">{errors.name}</p>
          )}
          {suggestions.length > 0 && (
            <ul
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
              aria-label="Plats similaires"
            >
              {suggestions.slice(0, 4).map((memory) => (
                <li key={memory.dishId}>
                  <Chip onClick={() => setChosen(memory)}>
                    {memory.isFavorite ? "⭐" : "🍽️"} {memory.name}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
          <AnimatePresence>
            {best && <DishMemoryCard key={best.dishId} memory={best} onReuse={() => reuse(best)} />}
          </AnimatePresence>
        </section>

        <section className="flex flex-col gap-3">
          <p className="pl-1 text-sm font-bold text-ink-soft">Quel moment ?</p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {MEAL_MOMENTS.map((value) => (
              <Chip key={value} selected={value === moment} onClick={() => setMoment(value)}>
                {MOMENT_EMOJI[value]} {MOMENT_LABEL[value]}
              </Chip>
            ))}
          </div>
          {eatenAt ? (
            <label className="flex items-center gap-3 rounded-[18px] bg-surface px-4 py-1 shadow-soft">
              <CalendarClock size={20} className="shrink-0 text-coral-ink" />
              <span className="text-sm font-bold text-ink-soft">Quand ?</span>
              <input
                type="datetime-local"
                aria-label="Date et heure du repas"
                value={format(eatenAt, "yyyy-MM-dd'T'HH:mm")}
                max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const next = new Date(event.target.value);
                  setEatenAt(next);
                  setMoment(momentForHour(next.getHours()));
                }}
                className="min-h-11 flex-1 bg-transparent text-right font-bold text-ink outline-none"
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setEatenAt(new Date())}
              className="flex min-h-12 items-center gap-3 rounded-[18px] bg-surface px-4 text-left shadow-soft"
            >
              <CalendarClock size={20} className="shrink-0 text-coral-ink" />
              <span className="flex-1 font-bold text-ink">Maintenant</span>
              <span className="text-sm font-bold text-coral-ink">Changer l&apos;heure</span>
            </button>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-label="Glucides et insuline">
          <div className="grid grid-cols-2 gap-3">
            <ValueTile
              label="Glucides"
              value={values.carbs}
              suffix="g"
              active={active === "carbs"}
              error={errors.carbsGrams}
              onSelect={() => setActive("carbs")}
              big
            />
            <ValueTile
              label="Insuline rapide"
              value={values.units}
              suffix="U"
              active={active === "units"}
              error={errors.insulinUnits}
              onSelect={() => setActive("units")}
              big
            />
          </div>

          {/* Fixed-height slot: the keypad below never moves while typing. */}
          <div className="relative min-h-[5.25rem]">
            {ratio && hint ? (
              <motion.div
                key="hint"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0"
              >
                <div className="flex h-full items-center gap-3 rounded-[20px] bg-mint-soft px-4 py-2 text-mint-ink">
                  <p className="flex-1 text-[15px] leading-snug font-semibold" aria-live="polite">
                    Avec {RATIO_OF[ratio.key]} ({formatRatio(ratio.gramsPerUnit)}) :{" "}
                    <span className="font-extrabold whitespace-nowrap tabular">
                      {formatNumber(carbs, 0)} g → {formatNumber(hint.rounded)} U
                    </span>{" "}
                    <span className="rounded-full bg-surface/70 px-2 py-0.5 text-xs font-extrabold tracking-wide uppercase">
                      indicatif
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setValues((current) => ({ ...current, units: toText(hint.rounded) }));
                      setActive("units");
                    }}
                    className="min-h-11 shrink-0 rounded-2xl bg-surface px-3 text-sm font-extrabold text-mint-ink shadow-soft active:scale-95"
                  >
                    Utiliser
                  </button>
                </div>
              </motion.div>
            ) : (
              <p className="absolute inset-0 flex items-center rounded-[20px] border-2 border-dashed border-line px-4 text-[15px] font-semibold text-ink-soft">
                {ratio
                  ? "Tape tes glucides, je te propose une dose indicative ✨"
                  : "Ajoute un ratio dans « Moi » pour voir une dose indicative."}
              </p>
            )}
          </div>

          <NumPad onKey={press} label={`Pavé numérique : ${fieldConfig[active].label}`} />

          <div className="grid grid-cols-2 gap-3">
            <ValueTile
              label="dont correction"
              value={values.correction}
              suffix="U"
              active={active === "correction"}
              error={errors.correctionUnits}
              onSelect={() => setActive("correction")}
              placeholder="0"
            />
            <ValueTile
              label="Glycémie avant"
              value={values.glucose}
              suffix={GLUCOSE_UNIT_LABEL[unit]}
              active={active === "glucose"}
              error={errors.glucoseBefore}
              onSelect={() => setActive("glucose")}
              placeholder="—"
            />
          </div>
          <p className="px-1 text-sm text-ink-soft">
            La correction sert à faire baisser une glycémie haute : elle n&apos;entre pas dans le
            calcul de ton ratio.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <p className="pl-1 text-sm font-bold text-ink-soft">Un petit contexte ?</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_TAGS.map((tag) => (
              <Chip key={tag} selected={tags.has(tag)} onClick={() => toggleTag(tag)}>
                {TAG_INFO[tag].emoji} {TAG_INFO[tag].label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <label htmlFor="meal-notes" className="pl-1 text-sm font-bold text-ink-soft">
            Notes
          </label>
          <textarea
            id="meal-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Resto, portion généreuse, dessert partagé…"
            className={cn(inputClass, "min-h-24 py-3")}
          />
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md bg-gradient-to-t from-bg via-bg/95 to-transparent px-5 pt-8 pb-safe">
        {formError && (
          <Notice tone="warm" className="mb-3">
            {formError}
          </Notice>
        )}
        <Button size="lg" className="mb-4 w-full" loading={pending} onClick={() => submit(false)}>
          Enregistrer le repas
        </Button>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`C'est bien ${formatNumber(units)} unités ?`}
      >
        <p className="mb-5 text-center text-ink-soft">
          C&apos;est un peu plus que d&apos;habitude, on vérifie juste ensemble 🙂
        </p>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => {
              setConfirming(false);
              submit(true);
            }}
          >
            Oui, c&apos;est bien ça
          </Button>
          <Button
            variant="soft"
            size="lg"
            onClick={() => {
              setConfirming(false);
              setActive("units");
            }}
          >
            Je corrige
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}

function fieldKey(field: Field): string {
  return {
    carbs: "carbsGrams",
    units: "insulinUnits",
    correction: "correctionUnits",
    glucose: "glucoseBefore",
  }[field];
}

function ValueTile({
  label,
  value,
  suffix,
  active,
  error,
  onSelect,
  big = false,
  placeholder = "0",
}: {
  label: string;
  value: string;
  suffix: string;
  active: boolean;
  error?: string;
  onSelect: () => void;
  big?: boolean;
  placeholder?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`${label} : ${value || "vide"} ${suffix}`}
      className={cn(
        "flex flex-col items-start gap-1 rounded-[22px] border-2 px-4 text-left transition-[border-color,background-color,transform] active:scale-[0.98]",
        big ? "py-3" : "py-2",
        active ? "border-coral bg-coral-soft/60" : "border-transparent bg-surface shadow-soft",
        error && !active && "border-coral-strong/60",
      )}
    >
      <span className="text-sm font-bold text-ink-soft">{label}</span>
      <span
        className={cn(
          "flex items-baseline gap-1 font-display font-semibold tabular",
          big ? "text-[2.6rem] leading-none" : "text-2xl",
          value ? "text-ink" : "text-ink-faint",
        )}
      >
        {value || placeholder}
        <span className="text-base font-bold text-ink-soft">{suffix}</span>
        {active && (
          <motion.span
            aria-hidden="true"
            className="ml-0.5 inline-block h-[0.8em] w-[3px] self-center rounded-full bg-coral"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </span>
      {error && <span className="text-xs font-bold text-coral-ink">{error}</span>}
    </button>
  );
}
