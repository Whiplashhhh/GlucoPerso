import type { CSSProperties } from "react";
import { OutcomeDot } from "@/components/outcome-dot";
import type { Outcome } from "@/lib/glucose";
import { MOMENT_EMOJI, MOMENT_LABEL } from "@/lib/moments";
import { OUTCOME_INFO } from "@/lib/outcomes";
import type { MomentStats } from "@/lib/stats";

/** Pile poil first: the bar reads from the good news. */
const ORDER: Outcome[] = ["PERFECT", "TOO_MUCH", "NOT_ENOUGH"];

/**
 * Fill per outcome: solid, stripes or dots, so the bars never rely on colour
 * alone (colour-blind friendly, prints fine).
 */
const FILL: Record<Outcome, CSSProperties> = {
  PERFECT: { background: "var(--mint)" },
  TOO_MUCH: {
    backgroundColor: "var(--lavender)",
    backgroundImage:
      "repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in oklab, var(--surface) 55%, transparent) 5px 8px)",
  },
  NOT_ENOUGH: {
    backgroundColor: "var(--amber)",
    backgroundImage:
      "radial-gradient(circle, color-mix(in oklab, var(--surface) 60%, transparent) 1.6px, transparent 2px)",
    backgroundSize: "7px 7px",
  },
};

export function OutcomeBars({ perMoment }: { perMoment: MomentStats[] }) {
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-wrap gap-x-4 gap-y-2 px-1" aria-label="Légende">
        {ORDER.map((outcome) => (
          <li key={outcome} className="flex items-center gap-2 text-sm font-bold text-ink-soft">
            <span className="h-3.5 w-6 rounded-[5px]" style={FILL[outcome]} aria-hidden="true" />
            {OUTCOME_INFO[outcome].short}
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-4">
        {perMoment.map((entry) => {
          const percent = Math.round((entry.counts.PERFECT / entry.total) * 100);
          return (
            <li key={entry.moment} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2 px-1">
                <p className="font-extrabold text-ink">
                  {MOMENT_EMOJI[entry.moment]} {MOMENT_LABEL[entry.moment]}
                </p>
                <p className="text-sm font-bold text-ink-soft tabular">
                  {entry.counts.PERFECT > 0 ? `${percent} % pile poil · ` : ""}
                  {entry.total} repas
                </p>
              </div>
              <div
                className="flex h-6 w-full gap-[2px] overflow-hidden rounded-[8px]"
                role="img"
                aria-label={ORDER.map(
                  (outcome) => `${OUTCOME_INFO[outcome].short} : ${entry.counts[outcome]}`,
                ).join(", ")}
              >
                {ORDER.filter((outcome) => entry.counts[outcome] > 0).map((outcome) => (
                  <span
                    key={outcome}
                    title={`${OUTCOME_INFO[outcome].short} : ${entry.counts[outcome]}`}
                    className="h-full first:rounded-l-[8px] last:rounded-r-[8px]"
                    style={{ ...FILL[outcome], flexGrow: entry.counts[outcome], flexBasis: 0 }}
                  />
                ))}
              </div>
              <p className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[13px] font-bold text-ink-faint">
                {ORDER.map((outcome) => (
                  <span key={outcome} className="inline-flex items-center gap-1">
                    <span aria-hidden="true" className="inline-flex">
                      <OutcomeDot outcome={outcome} size={14} />
                    </span>
                    {entry.counts[outcome]} {OUTCOME_INFO[outcome].short.toLowerCase()}
                  </span>
                ))}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
