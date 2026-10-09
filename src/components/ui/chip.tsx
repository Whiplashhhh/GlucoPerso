import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Toggleable pill used for tags and moments. */
export function Chip({
  selected = false,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 text-[15px] font-bold whitespace-nowrap transition-[transform,background-color,border-color] active:scale-95",
        selected
          ? "border-coral bg-coral-soft text-coral-ink"
          : "border-line bg-surface text-ink-soft hover:border-coral/50",
        className,
      )}
      {...props}
    />
  );
}
