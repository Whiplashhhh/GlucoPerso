"use client";

import { Check, LocateFixed } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Notice } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { SettingRow, SettingsSection } from "@/components/settings/section";
import { cn } from "@/lib/cn";
import { GLUCOSE_UNIT_LABEL, type GlucoseUnit, fromUnit, toUnit } from "@/lib/glucose";
import type { ThemeChoice } from "@/lib/theme";
import type { SettingsUpdate } from "@/lib/validation/settings";
import { updateSettingsAction } from "@/server/actions/settings";

export type SettingsValues = {
  glucoseUnit: GlucoseUnit;
  penIncrement: 0.5 | 1;
  hypoThreshold: number;
  highThreshold: number;
  doseConfirmThreshold: number;
  ratioMin: number;
  ratioMax: number;
  theme: ThemeChoice;
  timezone: string;
};

type Status = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 550;

/** Every change saves by itself; numbers wait a breath so taps can add up. */
export function SettingsPanel({ initial }: { initial: SettingsValues }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(initial);
  const timers = useRef(new Map<keyof SettingsValues, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  async function persist(update: Partial<SettingsValues>) {
    setStatus("saving");
    setError(null);
    const result = await updateSettingsAction(update satisfies SettingsUpdate);
    if (result.ok) {
      saved.current = { ...saved.current, ...update };
      setStatus("saved");
      return;
    }
    const message = result.error ?? Object.values(result.fieldErrors ?? {})[0];
    setError(message ?? "Oups, ce réglage n'a pas été enregistré.");
    setStatus("error");
    const keys = Object.keys(update) as (keyof SettingsValues)[];
    setValues((current) => {
      const reverted = { ...current };
      for (const key of keys) Object.assign(reverted, { [key]: saved.current[key] });
      return reverted;
    });
  }

  function change<K extends keyof SettingsValues>(key: K, value: SettingsValues[K], wait = 0) {
    setValues((current) => ({ ...current, [key]: value }));
    const previous = timers.current.get(key);
    if (previous) clearTimeout(previous);
    if (wait === 0) {
      void persist({ [key]: value } as Partial<SettingsValues>);
      return;
    }
    setStatus("saving");
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        void persist({ [key]: value } as Partial<SettingsValues>);
      }, wait),
    );
  }

  const unit = values.glucoseUnit;
  const mg = unit === "MG_DL";
  const glucoseStepper = {
    step: mg ? 5 : 0.05,
    digits: mg ? 0 : 2,
    suffix: GLUCOSE_UNIT_LABEL[unit],
  };

  const zones = timeZones(values.timezone);

  return (
    <SettingsSection title="Mes réglages" id="reglages" action={<SaveStatus status={status} />}>
      <div className="flex flex-col divide-y-2 divide-surface-2 rounded-[24px] bg-surface px-4 py-4 shadow-soft">
        <SettingRow label="Thème" hint="Clair, sombre ou comme ton téléphone.">
          <Segmented<ThemeChoice>
            label="Thème"
            value={values.theme}
            onChange={(value) => change("theme", value)}
            options={[
              { value: "system", label: "Système" },
              { value: "light", label: "Clair" },
              { value: "dark", label: "Sombre" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Unité de glycémie">
          <Segmented<GlucoseUnit>
            label="Unité de glycémie"
            value={values.glucoseUnit}
            onChange={(value) => change("glucoseUnit", value)}
            options={[
              { value: "G_L", label: "g/L", hint: "ex. 1,20" },
              { value: "MG_DL", label: "mg/dL", hint: "ex. 120" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Stylo de rapide" hint="De combien avance ton stylo à chaque clic.">
          <Segmented<0.5 | 1>
            label="Incrément du stylo"
            value={values.penIncrement}
            onChange={(value) => change("penIncrement", value)}
            options={[
              { value: 0.5, label: "0,5 U", hint: "demi-unités" },
              { value: 1, label: "1 U", hint: "unités entières" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Seuil d'hypo" hint="En dessous, on parle d'hypo.">
          <Stepper
            label="seuil d'hypo"
            size="md"
            {...glucoseStepper}
            min={mg ? 50 : 0.5}
            max={mg ? 120 : 1.2}
            value={toUnit(values.hypoThreshold, unit)}
            onChange={(value) => change("hypoThreshold", fromUnit(value, unit), DEBOUNCE_MS)}
          />
        </SettingRow>

        <SettingRow
          label="Seuil haut"
          hint="Au-dessus après un repas, je te proposerai « pas assez » (tu gardes le dernier mot)."
        >
          <Stepper
            label="seuil haut"
            size="md"
            {...glucoseStepper}
            min={mg ? 120 : 1.2}
            max={mg ? 300 : 3}
            value={toUnit(values.highThreshold, unit)}
            onChange={(value) => change("highThreshold", fromUnit(value, unit), DEBOUNCE_MS)}
          />
        </SettingRow>

        <SettingRow
          label="Petite vérification des doses"
          hint="Au-delà, je te demande juste de confirmer, au cas où un chiffre aurait glissé."
        >
          <Stepper
            label="seuil de confirmation de dose"
            size="md"
            step={1}
            digits={0}
            min={5}
            max={60}
            suffix="U"
            value={values.doseConfirmThreshold}
            onChange={(value) => change("doseConfirmThreshold", value, DEBOUNCE_MS)}
          />
        </SettingRow>

        <SettingRow
          label="Bornes des suggestions de ratio"
          hint="Je ne te proposerai jamais un ratio en dehors de ces limites."
        >
          <div className="flex flex-col gap-2">
            <BoundStepper
              title="Au plus petit"
              label="borne basse du ratio"
              value={values.ratioMin}
              step={0.5}
              min={1}
              max={20}
              onChange={(value) => change("ratioMin", value, DEBOUNCE_MS)}
            />
            <BoundStepper
              title="Au plus grand"
              label="borne haute du ratio"
              value={values.ratioMax}
              step={1}
              min={10}
              max={150}
              onChange={(value) => change("ratioMax", value, DEBOUNCE_MS)}
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Fuseau horaire"
          hint="Pour ranger tes repas au bon moment de la journée."
        >
          <div className="flex gap-2">
            <select
              aria-label="Fuseau horaire"
              value={values.timezone}
              onChange={(event) => change("timezone", event.target.value)}
              className="min-h-12 min-w-0 flex-1 rounded-[18px] border-2 border-line bg-surface px-3 text-base font-bold text-ink outline-none focus:border-coral"
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Utiliser le fuseau de cet appareil"
              title="Utiliser le fuseau de cet appareil"
              onClick={() => {
                const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (local && local !== values.timezone) change("timezone", local);
              }}
              className="grid size-12 shrink-0 place-items-center rounded-[18px] bg-surface-2 text-ink-soft transition active:scale-95"
            >
              <LocateFixed size={22} />
            </button>
          </div>
        </SettingRow>
      </div>
      {error && <Notice tone="warm">{error}</Notice>}
    </SettingsSection>
  );
}

/** One ratio bound: small caption over a − value + row. */
function BoundStepper({
  title,
  ...props
}: {
  title: string;
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[20px] bg-surface-2 px-3 pt-2 pb-3">
      <p className="text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">
        {title}
      </p>
      <Stepper {...props} size="md" digits={1} prefix="1 U /" suffix="g" />
    </div>
  );
}

function SaveStatus({ status }: { status: Status }) {
  return (
    <span aria-live="polite" className="min-h-7 text-sm font-bold">
      <AnimatePresence mode="wait" initial={false}>
        {status === "saving" && (
          <motion.span
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-ink-faint"
          >
            Enregistrement…
          </motion.span>
        )}
        {status === "saved" && (
          <motion.span
            key="saved"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-mint-soft px-3 py-1 text-mint-ink",
            )}
          >
            <Check size={16} strokeWidth={3} aria-hidden="true" />
            Enregistré
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

const COMMON_ZONES = [
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/Luxembourg",
  "Europe/Monaco",
  "America/Montreal",
  "America/Martinique",
  "America/Guadeloupe",
  "America/Cayenne",
  "Indian/Reunion",
  "Indian/Mayotte",
  "Pacific/Noumea",
  "Pacific/Tahiti",
  "UTC",
];

/** Short list (same on server and phone); the locate button covers travels. */
function timeZones(current: string): string[] {
  return [...new Set([current, ...COMMON_ZONES])];
}
