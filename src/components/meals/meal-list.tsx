"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { type MealRowData, MealRow } from "@/components/home/meal-row";
import { useMealUndo } from "@/components/meals/meal-undo";

/** Meal rows that hide optimistically deleted meals right away. */
export function MealList({
  meals,
  empty = null,
  label,
}: {
  meals: MealRowData[];
  empty?: ReactNode;
  label?: string;
}) {
  const { hidden } = useMealUndo();
  const visible = meals.filter((meal) => !hidden.has(meal.id));
  if (!visible.length) return <>{empty}</>;
  return (
    <ul className="flex flex-col gap-2" aria-label={label}>
      <AnimatePresence initial={false}>
        {visible.map((meal) => (
          <motion.li
            key={meal.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <MealRow meal={meal} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
