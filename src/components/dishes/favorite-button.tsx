"use client";

import { Star } from "lucide-react";
import { motion } from "motion/react";
import { useOptimistic, useState, useTransition } from "react";
import { Toast } from "@/components/toast";
import { cn } from "@/lib/cn";
import { setDishFavoriteAction } from "@/server/actions/dishes";

/** Optimistic favourite toggle: the star answers at once, the server follows. */
export function FavoriteButton({ dishId, isFavorite }: { dishId: string; isFavorite: boolean }) {
  const [favorite, setFavorite] = useOptimistic(isFavorite);
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(0);

  function toggle() {
    const next = !favorite;
    startTransition(async () => {
      setFavorite(next);
      const result = await setDishFavoriteAction(dishId, next).catch(() => ({ ok: false }));
      if (!result.ok) setFailed(Date.now());
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={favorite}
        aria-label="Favori"
        className={cn(
          "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-extrabold transition-[transform,background-color,border-color] active:scale-95",
          favorite
            ? "border-amber bg-amber-soft text-amber-ink"
            : "border-line bg-surface text-ink-soft hover:border-amber",
        )}
      >
        <motion.span
          key={String(favorite)}
          initial={favorite ? { scale: 0.4, rotate: -40 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 14 }}
          className="grid"
        >
          <Star
            size={20}
            strokeWidth={2.4}
            fill={favorite ? "var(--amber)" : "none"}
            className={favorite ? "text-amber" : undefined}
          />
        </motion.span>
        Favori
      </button>
      {failed > 0 && (
        <Toast key={failed} message="Oups, je n'ai pas pu changer le favori. On réessaie ?" />
      )}
    </>
  );
}
