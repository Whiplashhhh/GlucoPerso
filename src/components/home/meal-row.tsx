import Link from "next/link";
import { Bowl } from "@/components/illustrations/buddies";
import { OutcomeDot } from "@/components/outcome-dot";
import { photoUrl } from "@/lib/dishes";
import { formatGrams, formatUnits } from "@/lib/format";
import type { Outcome } from "@/lib/glucose";
import { OUTCOME_INFO } from "@/lib/outcomes";

export type MealRowData = {
  id: string;
  name: string;
  time: string;
  carbsGrams: number;
  insulinUnits: number;
  outcome: Outcome | null;
  photoId: string | null;
  notes?: string | null;
};

/** Compact meal card used on the home screen and in the calendar. */
export function MealRow({ meal }: { meal: MealRowData }) {
  return (
    <Link
      href={`/repas/${meal.id}`}
      className="flex items-center gap-3 rounded-[22px] bg-surface p-2.5 pr-4 shadow-soft transition-transform active:scale-[0.98]"
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-[16px] bg-surface-2">
        {meal.photoId ? (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated photo route
          <img
            src={photoUrl(meal.photoId)}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <Bowl className="size-full p-1.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{meal.name}</p>
        <p className="text-sm text-ink-soft tabular">
          {meal.time} · {formatGrams(meal.carbsGrams)} · {formatUnits(meal.insulinUnits)}
        </p>
        {meal.notes && <p className="truncate text-sm text-ink-faint">📝 {meal.notes}</p>}
      </div>
      <span className="flex items-center gap-1.5 text-xs font-extrabold text-ink-soft">
        <OutcomeDot outcome={meal.outcome} size={14} />
        <span className="max-w-20 text-right leading-tight">
          {meal.outcome ? OUTCOME_INFO[meal.outcome].short : "En attente"}
        </span>
      </span>
    </Link>
  );
}
