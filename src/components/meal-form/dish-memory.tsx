"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { History, Lightbulb } from "lucide-react";
import { motion } from "motion/react";
import { Toast } from "@/components/illustrations/buddies";
import { Button } from "@/components/ui/button";
import { photoUrl } from "@/lib/dishes";
import { formatGrams, formatUnits } from "@/lib/format";
import { OUTCOME_INFO } from "@/lib/outcomes";
import type { DishMemory as Memory } from "@/server/repos/dishes";
import { cn } from "@/lib/cn";

/** « Déjà mangé » card with an optional reminder from her notes. */
export function DishMemoryCard({ memory, onReuse }: { memory: Memory; onReuse: () => void }) {
  const last = memory.lastMeal;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex flex-col gap-3"
    >
      {memory.reminder && (
        <div className="flex gap-3 rounded-[20px] bg-amber-soft px-4 py-3 text-amber-ink">
          <Lightbulb className="mt-0.5 shrink-0" size={20} />
          <p className="font-semibold">
            La dernière fois, tu avais noté&nbsp;:{" "}
            <span className="italic">«&nbsp;{memory.reminder}&nbsp;»</span>
          </p>
        </div>
      )}
      {last && (
        <div className="flex flex-col gap-3 rounded-[24px] bg-surface p-3 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="size-16 shrink-0 overflow-hidden rounded-[16px] bg-surface-2">
              {last.photoId ? (
                // eslint-disable-next-line @next/next/no-img-element -- authenticated photo route
                <img
                  src={photoUrl(last.photoId)}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Toast className="size-full p-1.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-xs font-extrabold tracking-wide text-ink-faint uppercase">
                <History size={14} /> Déjà mangé ·{" "}
                {formatDistanceToNowStrict(new Date(last.eatenAt), { locale: fr, addSuffix: true })}
              </p>
              <p className="truncate text-lg font-bold">{memory.name}</p>
              <p className="text-[15px] text-ink-soft tabular">
                {formatGrams(last.carbsGrams)} · {formatUnits(last.insulinUnits)}
                {last.correctionUnits > 0 && ` (dont ${formatUnits(last.correctionUnits)} corr.)`}
              </p>
            </div>
            {last.outcome && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-sm font-extrabold",
                  OUTCOME_INFO[last.outcome].soft,
                )}
              >
                {OUTCOME_INFO[last.outcome].emoji} {OUTCOME_INFO[last.outcome].short}
              </span>
            )}
          </div>
          {last.notes && <p className="px-1 text-[15px] text-ink-soft">📝 {last.notes}</p>}
          <Button variant="soft" onClick={onReuse}>
            Reprendre ces valeurs
          </Button>
        </div>
      )}
    </motion.div>
  );
}
