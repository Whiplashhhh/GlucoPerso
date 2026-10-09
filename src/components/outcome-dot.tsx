import type { Outcome } from "@/lib/glucose";
import { OUTCOME_INFO } from "@/lib/outcomes";
import { cn } from "@/lib/cn";

/**
 * Outcome marker that never relies on colour alone: a circle for « pile
 * poil », a downward drop for « un peu trop », an upward triangle for « pas
 * assez », a hollow ring when waiting for feedback.
 */
export function OutcomeDot({
  outcome,
  size = 12,
  className,
}: {
  outcome: Outcome | null;
  size?: number;
  className?: string;
}) {
  const label = outcome ? OUTCOME_INFO[outcome].label : "En attente de ton retour";
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={cn("shrink-0", className)}
    >
      {outcome === "PERFECT" && <circle cx="6" cy="6" r="5" fill="var(--mint)" />}
      {outcome === "TOO_MUCH" && (
        <path d="M6 11.2 1.6 5.4a4.6 4.6 0 0 1 8.8 0Z" fill="var(--lavender)" />
      )}
      {outcome === "NOT_ENOUGH" && (
        <path d="M6 1 11 10.6H1Z" fill="var(--amber)" strokeLinejoin="round" />
      )}
      {outcome === null && (
        <circle cx="6" cy="6" r="4.2" fill="none" stroke="var(--ink-faint)" strokeWidth="1.8" />
      )}
    </svg>
  );
}
