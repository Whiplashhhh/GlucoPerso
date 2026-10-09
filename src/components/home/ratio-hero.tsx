"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type PanInfo, motion } from "motion/react";
import { useState } from "react";
import { Sparkle } from "@/components/illustrations/buddies";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { MOMENT_EMOJI, MOMENT_LABEL, type RatioMoment } from "@/lib/moments";
import type { Confidence } from "@/lib/ratio";

export type RatioSlide = {
  key: RatioMoment;
  gramsPerUnit: number;
  confidence: Confidence;
  mealCount: number;
};

const CONFIDENCE: Record<Confidence, { label: string; level: number }> = {
  low: { label: "faible", level: 1 },
  medium: { label: "moyenne", level: 2 },
  good: { label: "bonne", level: 3 },
};

/** The hero: today's ratio in big, the other moments one swipe away. */
export function RatioHero({
  slides,
  initialKey,
}: {
  slides: RatioSlide[];
  initialKey: RatioMoment;
}) {
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      slides.findIndex((slide) => slide.key === initialKey),
    ),
  );
  const go = (next: number) => setIndex(Math.min(slides.length - 1, Math.max(0, next)));

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -50 || info.velocity.x < -400) go(index + 1);
    else if (info.offset.x > 50 || info.velocity.x > 400) go(index - 1);
  }

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Tes ratios"
      className="relative overflow-hidden rounded-[28px] bg-coral-soft shadow-soft"
    >
      <Sparkle className="absolute top-5 right-6 w-5 text-coral" />
      <Sparkle className="absolute top-14 right-14 w-3 text-amber" />
      <div
        aria-hidden="true"
        className="absolute -right-16 -bottom-20 size-56 rounded-full bg-coral/15"
      />
      <motion.div
        className="flex"
        drag={slides.length > 1 ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={onDragEnd}
        animate={{ x: `${-index * 100}%` }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        {slides.map((slide, position) => {
          const confidence = CONFIDENCE[slide.confidence];
          return (
            <div
              key={slide.key}
              role="group"
              aria-roledescription="diapositive"
              aria-label={`${MOMENT_LABEL[slide.key]} : 1 unité pour ${formatNumber(slide.gramsPerUnit)} grammes`}
              aria-hidden={position !== index}
              className="relative w-full shrink-0 px-6 pt-5 pb-6"
            >
              <p className="text-sm font-extrabold tracking-wide text-coral-ink uppercase">
                {MOMENT_EMOJI[slide.key]}{" "}
                {slide.key === "DEFAULT" ? "Ton ratio" : `Ton ratio · ${MOMENT_LABEL[slide.key]}`}
              </p>
              <div className="mt-2 flex items-end gap-3">
                <span className="pb-3 font-display text-2xl font-semibold text-ink-soft">
                  1&nbsp;U pour
                </span>
                <span className="font-display text-[5.5rem] leading-[0.85] font-semibold text-ink tabular">
                  {formatNumber(slide.gramsPerUnit)}
                </span>
                <span className="pb-3 font-display text-3xl font-semibold text-ink-soft">g</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-ink-soft">
                <span className="flex gap-1" aria-hidden="true">
                  {[1, 2, 3].map((bar) => (
                    <span
                      key={bar}
                      className={cn(
                        "h-2 w-5 rounded-full",
                        bar <= confidence.level ? "bg-coral-strong" : "bg-surface/80",
                      )}
                    />
                  ))}
                </span>
                Confiance {confidence.label}
                <span className="font-semibold text-ink-faint">
                  · {slide.mealCount} repas évalué{slide.mealCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </motion.div>
      {slides.length > 1 && (
        <div className="relative flex items-center justify-between px-3 pb-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Ratio précédent"
            className="grid size-11 place-items-center rounded-full text-coral-ink disabled:opacity-30"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex gap-1.5">
            {slides.map((slide, position) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Voir le ratio ${MOMENT_LABEL[slide.key]}`}
                aria-current={position === index}
                className="grid size-6 place-items-center"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all",
                    position === index ? "w-5 bg-coral-strong" : "w-2 bg-coral/40",
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === slides.length - 1}
            aria-label="Ratio suivant"
            className="grid size-11 place-items-center rounded-full text-coral-ink disabled:opacity-30"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      )}
    </section>
  );
}
