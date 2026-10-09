"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export function Switch({
  label,
  description,
  checked,
  onChange,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="flex flex-col">
        <span className="font-bold text-ink">{label}</span>
        {description && <span className="text-sm text-ink-soft">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative flex h-9 w-[3.75rem] shrink-0 items-center rounded-full p-1 transition-colors",
          checked ? "justify-end bg-mint" : "justify-start bg-surface-3",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
          className="block size-7 rounded-full bg-white shadow-soft"
        />
      </button>
    </div>
  );
}
