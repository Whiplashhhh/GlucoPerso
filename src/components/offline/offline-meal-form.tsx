"use client";

import { CloudOff, Lock } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/field";
import { parseDecimal } from "@/lib/format";
import { GLUCOSE_UNIT_LABEL, fromUnit } from "@/lib/glucose";
import {
  MEAL_MOMENTS,
  MOMENT_EMOJI,
  MOMENT_LABEL,
  type MealMoment,
  momentForHour,
} from "@/lib/moments";
import { sealEnvelope } from "@/lib/offline/envelope";
import {
  type OfflineConfig,
  enqueue,
  listQueue,
  offlineStorageAvailable,
  readOfflineConfig,
} from "@/lib/offline/store";
import { type OfflinePayload, offlinePayloadSchema } from "@/lib/validation/offline";

const HOUR_MS = 60 * 60 * 1000;

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Today at "HH:mm" on this device; yesterday if that would be in the future (late dinner). */
function eatenAtFor(time: string): Date {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  if (date.getTime() > Date.now() + HOUR_MS) date.setDate(date.getDate() - 1);
  return date;
}

type Values = {
  name: string;
  time: string;
  moment: MealMoment;
  carbs: string;
  units: string;
  glucose: string;
};

function initialValues(): Values {
  return {
    name: "",
    time: nowTime(),
    moment: momentForHour(new Date().getHours()),
    carbs: "",
    units: "",
    glucose: "",
  };
}

/**
 * Notes a meal without network. It is encrypted right away for the server
 * (the phone cannot read it back) and joins her journal at the next sync.
 * Shown only on a device where she was signed in (see OfflineSync).
 */
export function OfflineMealForm() {
  const [config, setConfig] = useState<OfflineConfig | null>(null);
  const [values, setValues] = useState<Values>(initialValues);
  const [momentTouched, setMomentTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [waiting, setWaiting] = useState(0);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!offlineStorageAvailable()) return;
    Promise.all([readOfflineConfig(), listQueue()])
      .then(([stored, queue]) => {
        setConfig(stored);
        setWaiting(queue.length);
      })
      .catch(() => undefined);
  }, []);

  if (!config) return null;
  const unit = config.glucoseUnit;

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setSaved(false);
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "time" && !momentTouched) {
        next.moment = momentForHour(Number(String(value).split(":")[0] ?? 0));
      }
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!config) return;
    const glucose = parseDecimal(values.glucose);
    const payload: OfflinePayload = {
      v: 1,
      userId: config.userId,
      meal: {
        name: values.name,
        eatenAt: eatenAtFor(values.time),
        moment: values.moment,
        carbsGrams: values.carbs,
        insulinUnits: values.units,
        correctionUnits: 0,
        glucoseBefore: glucose === null ? null : fromUnit(glucose, unit),
        tags: [],
        notes: null,
        photoId: null,
        // No dose calculation offline: she types what she injected.
        confirmedHighDose: true,
      },
    };
    const parsed = offlinePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path.at(-1) ?? "form")] ??= issue.message;
      }
      if (values.carbs.trim() === "") next.carbsGrams = "Combien de glucides ?";
      if (values.units.trim() === "") next.insulinUnits = "Combien d'unités ?";
      setErrors(next);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const envelope = await sealEnvelope(config.publicKey, parsed.data);
      await enqueue({ ...envelope, queuedAt: new Date().toISOString() });
      setWaiting((count) => count + 1);
      setValues(initialValues());
      setMomentTouched(false);
      setSaved(true);
    } catch {
      setErrors({ form: "Oups, je n'ai pas pu le garder sur ce téléphone." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="offline-entry-title"
      className="flex flex-col gap-4 rounded-[28px] bg-surface p-5 text-left shadow-soft"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-lavender-soft text-lavender-ink">
          <CloudOff size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 id="offline-entry-title" className="text-xl leading-tight font-semibold">
            Noter mon repas quand même
          </h2>
          <p className="text-sm text-ink-soft">
            Hors ligne, je ne peux pas calculer ta dose : note ce que tu as injecté.
          </p>
        </div>
      </div>

      {saved && (
        <Notice tone="success">Noté ! Il rejoindra ton carnet dès que le réseau revient.</Notice>
      )}

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Qu'est-ce qu'on mange ?"
          value={values.name}
          onChange={(event) => set("name", event.target.value)}
          error={errors.name}
          maxLength={80}
          autoComplete="off"
        />
        <TextField
          label="À quelle heure ?"
          type="time"
          value={values.time}
          onChange={(event) => set("time", event.target.value)}
          error={errors.eatenAt}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1.5 pl-1 text-sm font-bold text-ink-soft">Moment</legend>
          <div className="flex flex-wrap gap-2">
            {MEAL_MOMENTS.map((moment) => (
              <Chip
                key={moment}
                selected={values.moment === moment}
                onClick={() => {
                  setMomentTouched(true);
                  set("moment", moment);
                }}
              >
                {MOMENT_EMOJI[moment]} {MOMENT_LABEL[moment]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Glucides (g)"
            inputMode="decimal"
            value={values.carbs}
            onChange={(event) => set("carbs", event.target.value)}
            error={errors.carbsGrams}
          />
          <TextField
            label="Rapide (U)"
            inputMode="decimal"
            value={values.units}
            onChange={(event) => set("units", event.target.value)}
            error={errors.insulinUnits}
          />
        </div>
        <TextField
          label={`Glycémie avant (${GLUCOSE_UNIT_LABEL[unit]}), si tu l'as`}
          inputMode="decimal"
          value={values.glucose}
          onChange={(event) => set("glucose", event.target.value)}
          error={errors.glucoseBefore}
        />
        {errors.form && <Notice tone="warm">{errors.form}</Notice>}
        <Button type="submit" size="lg" loading={pending}>
          Garder ce repas
        </Button>
      </form>

      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Chiffré tout de suite : même ce téléphone ne peut pas le relire.
          {waiting > 0 && ` ${waiting} repas en attente d'envoi.`}
        </span>
      </p>
    </section>
  );
}
