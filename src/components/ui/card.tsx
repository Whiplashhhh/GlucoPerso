import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("relative rounded-[var(--radius-card)] bg-surface p-5 shadow-soft", className)}
      {...props}
    />
  );
}

/** Gentle inline message: never alarming red. */
export function Notice({
  tone = "info",
  className,
  ...props
}: ComponentProps<"div"> & { tone?: "info" | "warm" | "success" }) {
  const tones = {
    info: "bg-sky-soft text-ink",
    warm: "bg-amber-soft text-amber-ink",
    success: "bg-mint-soft text-mint-ink",
  };
  return (
    <div
      role="status"
      className={cn("rounded-[18px] px-4 py-3 text-[15px] font-semibold", tones[tone], className)}
      {...props}
    />
  );
}
