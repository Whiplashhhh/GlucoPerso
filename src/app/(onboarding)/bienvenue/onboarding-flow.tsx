"use client";

import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useTransition } from "react";
import { Celebration } from "@/components/celebration";
import { Bowl, Croissant, Strawberry, Sun } from "@/components/illustrations/buddies";
import { Button } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { fromUnit, type GlucoseUnit, toUnit } from "@/lib/glucose";
import { MEAL_MOMENTS, MOMENT_EMOJI, MOMENT_LABEL, type MealMoment } from "@/lib/moments";
import { onboardingSchema } from "@/lib/validation/settings";
import { completeOnboardingAction } from "@/server/actions/onboarding";

const STEPS = 4;

export function OnboardingFlow({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>("G_L");
  const [penIncrement, setPenIncrement] = useState<0.5 | 1>(1);
  const [defaultRatio, setDefaultRatio] = useState(10);
  const [usePerMoment, setUsePerMoment] = useState(false);
  const [momentRatios, setMomentRatios] = useState<Record<MealMoment, number>>({
    BREAKFAST: 10,
    LUNCH: 10,
    AFTERNOON_SNACK: 10,
    DINNER: 10,
    SNACK: 10,
  });
  const [hypo, setHypo] = useState(0.7);

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setError(null);
    setStep(next);
  };

  function finish() {
    const input = {
      name,
      glucoseUnit,
      penIncrement,
      defaultRatio,
      usePerMomentRatios: usePerMoment,
      momentRatios: usePerMoment ? momentRatios : {},
      hypoThreshold: hypo,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris",
    };
    const parsed = onboardingSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Un petit souci dans les réglages.");
      return;
    }
    startTransition(async () => {
      const result = await completeOnboardingAction(parsed.data);
      if (!result.ok) {
        setError(Object.values(result.fieldErrors ?? {})[0] ?? "Oups, on réessaie ?");
        return;
      }
      setDone(true);
    });
  }

  // Let the celebration play, then go home; cancelled if she leaves first.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => router.replace("/"), 1900);
    return () => clearTimeout(timer);
  }, [done, router]);

  const canContinue = step !== 0 || name.trim().length > 0;

  if (done) {
    return (
      <Screen>
        <Celebration />
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <motion.div
            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
          >
            <Sun className="w-40" mood="joy" />
          </motion.div>
          <h1 className="text-4xl font-semibold">C&apos;est prêt, {name.trim()} !</h1>
          <p className="max-w-xs text-lg text-ink-soft">Ton carnet est tout neuf. On y va ?</p>
        </div>
      </Screen>
    );
  }

  const content: { art: ReactNode; title: string; subtitle: string; body: ReactNode }[] = [
    {
      art: <Sun className="w-36" mood="joy" />,
      title: "Enchantée !",
      subtitle: "Je suis ton nouveau carnet. Comment je t'appelle ?",
      body: (
        <TextField
          label="Ton prénom"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="given-name"
          maxLength={40}
        />
      ),
    },
    {
      art: <Croissant className="w-36" mood="happy" />,
      title: "Tes petites habitudes",
      subtitle: "Pour te parler dans ta langue de tous les jours.",
      body: (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="pl-1 text-sm font-bold text-ink-soft">Ta glycémie s&apos;affiche en…</p>
            <Segmented
              label="Unité de glycémie"
              value={glucoseUnit}
              onChange={setGlucoseUnit}
              options={[
                { value: "G_L", label: "g/L", hint: "ex. 1,20" },
                { value: "MG_DL", label: "mg/dL", hint: "ex. 120" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="pl-1 text-sm font-bold text-ink-soft">Ton stylo de rapide avance de…</p>
            <Segmented
              label="Incrément du stylo"
              value={penIncrement}
              onChange={setPenIncrement}
              options={[
                { value: 0.5, label: "0,5 U", hint: "demi-unités" },
                { value: 1, label: "1 U", hint: "unités entières" },
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      art: <Bowl className="w-36" mood="happy" />,
      title: "Tes ratios de départ",
      subtitle: "Ceux que t'a donnés ton diabéto : 1 unité pour combien de grammes de glucides ?",
      body: (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <p className="text-center text-sm font-bold text-ink-soft">1 unité pour</p>
            <Stepper
              label="ratio général"
              value={defaultRatio}
              onChange={setDefaultRatio}
              step={0.5}
              min={1}
              max={100}
              suffix="g"
            />
          </Card>
          <Switch
            label="Un ratio différent selon le moment"
            description="Petit-déj, déjeuner, goûter, dîner, encas"
            checked={usePerMoment}
            onChange={(checked) => {
              setUsePerMoment(checked);
              if (checked) {
                setMomentRatios({
                  BREAKFAST: defaultRatio,
                  LUNCH: defaultRatio,
                  AFTERNOON_SNACK: defaultRatio,
                  DINNER: defaultRatio,
                  SNACK: defaultRatio,
                });
              }
            }}
          />
          <AnimatePresence initial={false}>
            {usePerMoment && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col gap-2 overflow-hidden"
              >
                {MEAL_MOMENTS.map((moment) => (
                  <li key={moment} className="rounded-[20px] bg-surface p-3 shadow-soft">
                    <p className="mb-1 pl-1 text-sm font-bold text-ink-soft">
                      {MOMENT_EMOJI[moment]} {MOMENT_LABEL[moment]}
                    </p>
                    <Stepper
                      label={`ratio ${MOMENT_LABEL[moment]}`}
                      size="md"
                      value={momentRatios[moment]}
                      onChange={(value) =>
                        setMomentRatios((current) => ({ ...current, [moment]: value }))
                      }
                      step={0.5}
                      min={1}
                      max={100}
                      prefix="1 U /"
                      suffix="g"
                    />
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      ),
    },
    {
      art: <Strawberry className="w-32" mood="happy" />,
      title: "Ton seuil d'hypo",
      subtitle: "En dessous, on considère que c'est une hypo. Par défaut 0,70 g/L.",
      body: (
        <Card className="flex flex-col gap-3">
          <Stepper
            label="seuil d'hypo"
            value={toUnit(hypo, glucoseUnit)}
            onChange={(value) => setHypo(fromUnit(value, glucoseUnit))}
            step={glucoseUnit === "MG_DL" ? 5 : 0.05}
            min={glucoseUnit === "MG_DL" ? 50 : 0.5}
            max={glucoseUnit === "MG_DL" ? 120 : 1.2}
            digits={glucoseUnit === "MG_DL" ? 0 : 2}
            suffix={glucoseUnit === "MG_DL" ? "mg/dL" : "g/L"}
          />
          <p className="text-center text-sm text-ink-soft">
            Tu pourras tout changer plus tard dans « Moi ».
          </p>
        </Card>
      ),
    },
  ];

  const current = content[step]!;

  return (
    <Screen>
      <div className="flex items-center justify-between gap-3 pt-4">
        <button
          type="button"
          onClick={() => go(step - 1)}
          className={cn(
            "grid size-12 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2",
            step === 0 && "invisible",
          )}
          aria-label="Étape précédente"
        >
          <ArrowLeft size={24} />
        </button>
        <div
          className="flex gap-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS}
          aria-valuenow={step + 1}
          aria-label={`Étape ${step + 1} sur ${STEPS}`}
        >
          {Array.from({ length: STEPS }, (_, index) => (
            <motion.span
              key={index}
              className="h-2.5 rounded-full"
              animate={{
                width: index === step ? 28 : 10,
                backgroundColor: index <= step ? "var(--coral)" : "var(--surface-3)",
              }}
            />
          ))}
        </div>
        <span className="size-12" />
      </div>

      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.section
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction * 48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -48 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="flex flex-1 flex-col gap-6 pt-6 pb-4"
        >
          <motion.div
            className="flex justify-center"
            initial={{ scale: 0.7, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.05 }}
          >
            {current.art}
          </motion.div>
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-[2.1rem] leading-tight font-semibold">{current.title}</h1>
            <p className="mx-auto max-w-sm text-lg text-ink-soft">{current.subtitle}</p>
          </div>
          {current.body}
          {step === STEPS - 1 && (
            <p className="text-center text-sm text-ink-soft">
              Résumé : ratio général {formatNumber(defaultRatio)} g/U, stylo par{" "}
              {formatNumber(penIncrement)} U.
            </p>
          )}
        </motion.section>
      </AnimatePresence>

      <div className="sticky bottom-0 flex flex-col gap-3 bg-gradient-to-t from-bg via-bg to-transparent pt-6 pb-6">
        {error && <Notice tone="warm">{error}</Notice>}
        {step < STEPS - 1 ? (
          <Button size="lg" onClick={() => go(step + 1)} disabled={!canContinue}>
            Continuer
          </Button>
        ) : (
          <Button size="lg" onClick={finish} loading={pending}>
            C&apos;est parti !
          </Button>
        )}
      </div>
    </Screen>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-safe pb-safe">
      {children}
    </main>
  );
}
