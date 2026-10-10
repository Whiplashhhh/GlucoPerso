"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useId } from "react";

/** Small bottom sheet dialog for gentle confirmations. */
export function Modal({
  open,
  onClose,
  title,
  art,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional little buddy shown above the title. */
  art?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-[hsl(330_35%_10%/0.38)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md rounded-t-[var(--radius-sheet)] bg-surface px-5 pt-3 pb-safe shadow-lift md:rounded-[var(--radius-sheet)] md:pb-0"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-surface-3 md:invisible" />
            {art && <div className="-mt-2 mb-2 flex justify-center">{art}</div>}
            <h2 id={titleId} className="mb-3 text-center text-2xl font-semibold">
              {title}
            </h2>
            <div className="pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
