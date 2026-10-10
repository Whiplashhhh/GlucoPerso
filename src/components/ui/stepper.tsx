"use client";

import { Minus, Plus } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Big friendly − value + control for small numeric settings. */
export function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  digits = 1,
  prefix,
  suffix,
  size = "lg",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
  digits?: number;
  prefix?: string;
  suffix?: string;
  size?: "lg" | "md";
}) {
  const clamp = (next: number) =>
    Math.min(max, Math.max(min, Math.round(next * 10 ** digits) / 10 ** digits));
  const buttonClass =
    "grid shrink-0 place-items-center rounded-full bg-surface-2 text-ink transition active:scale-90 disabled:opacity-40 hover:bg-surface-3";
  return (
    <div className="flex items-center justify-between gap-3" role="group" aria-label={label}>
      <button
        type="button"
        className={cn(buttonClass, size === "lg" ? "size-14" : "size-12")}
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label={`Diminuer ${label}`}
      >
        <Minus size={24} strokeWidth={2.6} />
      </button>
      <output
        aria-live="polite"
        className={cn(
          "flex items-baseline gap-1.5 font-display font-semibold text-ink tabular",
          size === "lg" ? "text-5xl" : "text-3xl",
        )}
      >
        {prefix && <span className="text-xl font-bold text-ink-soft">{prefix}</span>}
        {/* Glucose in g/L reads « 0,70 », never « 0,7 ». */}
        {digits >= 2
          ? value.toLocaleString("fr-FR", {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
            })
          : formatNumber(value, digits)}
        {suffix && <span className="text-xl font-bold text-ink-soft">{suffix}</span>}
      </output>
      <button
        type="button"
        className={cn(buttonClass, size === "lg" ? "size-14" : "size-12")}
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label={`Augmenter ${label}`}
      >
        <Plus size={24} strokeWidth={2.6} />
      </button>
    </div>
  );
}
