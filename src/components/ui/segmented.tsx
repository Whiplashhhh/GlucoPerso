"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";

type Option<T extends string | number> = { value: T; label: string; hint?: string };

/** Pill toggle group (radio semantics) with a sliding highlight. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const groupId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex gap-1 rounded-[20px] bg-surface-2 p-1.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex min-h-12 flex-1 flex-col items-center justify-center rounded-[16px] px-3 py-2 font-bold transition-colors",
              selected ? "text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${groupId}-pill`}
                className="absolute inset-0 rounded-[16px] bg-surface shadow-soft"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
            <span className="relative">{option.label}</span>
            {option.hint && (
              <span className="relative text-xs font-semibold text-ink-faint">{option.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
