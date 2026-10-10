"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMealUndo } from "@/components/meals/meal-undo";
import { cn } from "@/lib/cn";

/** Goes back in history when there is somewhere to go, else to `fallback`. */
function useGoBack(fallback: string) {
  const router = useRouter();
  return () => {
    if (window.history.length > 1) router.back();
    else router.replace(fallback);
  };
}

export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const goBack = useGoBack(fallback);
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Retour"
      className={cn(
        "grid size-12 place-items-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur transition-transform active:scale-90",
        className,
      )}
    >
      <ArrowLeft size={24} strokeWidth={2.4} />
    </button>
  );
}

/** Optimistic delete: back to the list at once, with « Annuler » in a toast. */
export function DeleteMealButton({ mealId, fallback }: { mealId: string; fallback: string }) {
  const { remove } = useMealUndo();
  const goBack = useGoBack(fallback);
  return (
    <button
      type="button"
      onClick={() => {
        remove(mealId);
        goBack();
      }}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] px-5 font-bold text-ink-soft transition-[transform,background-color] hover:bg-surface-2 active:scale-[0.97]"
    >
      <Trash2 size={20} />
      Supprimer
    </button>
  );
}
