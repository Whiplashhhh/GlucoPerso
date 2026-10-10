"use client";

import { type ReactNode, createContext, useCallback, useContext, useRef, useState } from "react";
import { Toast } from "@/components/toast";
import type { ActionState } from "@/server/action-state";
import { deleteMealAction, restoreMealAction } from "@/server/actions/meals";

type MealUndo = {
  /** Meals deleted optimistically: every list hides them right away. */
  hidden: ReadonlySet<string>;
  remove: (mealId: string) => void;
};

const MealUndoContext = createContext<MealUndo>({ hidden: new Set(), remove: () => {} });

export const useMealUndo = () => useContext(MealUndoContext);

type Notice = { seq: number; message: string; mealId?: string };

/**
 * Lives in the app layout so the « Repas supprimé · Annuler » toast survives
 * the navigation back from the meal detail.
 */
export function MealUndoProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);
  const pending = useRef(new Map<string, Promise<ActionState>>());

  const setVisible = useCallback((mealId: string, visible: boolean) => {
    setHidden((current) => {
      const next = new Set(current);
      if (visible) next.delete(mealId);
      else next.add(mealId);
      return next;
    });
  }, []);

  const remove = useCallback(
    (mealId: string) => {
      setVisible(mealId, false);
      setNotice({ seq: Date.now(), message: "Repas supprimé", mealId });
      const request = deleteMealAction(mealId).catch(() => ({ ok: false }) as ActionState);
      pending.current.set(mealId, request);
      void request.then((result) => {
        if (result.ok) return;
        setVisible(mealId, true);
        setNotice({ seq: Date.now(), message: "Oups, ce repas n'a pas pu être supprimé." });
      });
    },
    [setVisible],
  );

  async function undo(mealId: string) {
    setNotice(null);
    const deleted = await pending.current.get(mealId);
    pending.current.delete(mealId);
    if (deleted?.ok) {
      const restored = await restoreMealAction(mealId).catch(() => ({ ok: false }));
      if (!restored.ok) {
        setNotice({ seq: Date.now(), message: "Oups, on n'a pas pu le remettre." });
        return;
      }
    }
    setVisible(mealId, true);
  }

  return (
    <MealUndoContext value={{ hidden, remove }}>
      {children}
      {notice && (
        <Toast
          key={notice.seq}
          message={notice.message}
          duration={notice.mealId ? 6000 : 4000}
          onDone={() => setNotice((current) => (current?.seq === notice.seq ? null : current))}
          action={
            notice.mealId ? (
              <button
                type="button"
                onClick={() => undo(notice.mealId as string)}
                className="min-h-11 shrink-0 rounded-full bg-coral px-4 font-extrabold text-on-coral active:scale-95"
              >
                Annuler
              </button>
            ) : undefined
          }
        />
      )}
    </MealUndoContext>
  );
}
