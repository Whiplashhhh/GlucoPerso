"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { profileSchema } from "@/lib/validation/settings";
import { updateProfileAction } from "@/server/actions/settings";

export function ProfileCard({ name, email }: { name: string; email: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [shown, setShown] = useState(name);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function save() {
    const parsed = profileSchema.safeParse({ name: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    startTransition(async () => {
      const result = await updateProfileAction(parsed.data);
      if (!result.ok) {
        setError(result.fieldErrors?.name ?? "Oups, on réessaie ?");
        return;
      }
      setShown(parsed.data.name);
      setEditing(false);
      setError(undefined);
    });
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-coral-soft p-5 shadow-soft">
      <div
        aria-hidden="true"
        className="absolute -top-12 -right-10 size-40 rounded-full bg-coral/15"
      />
      {editing ? (
        <div className="relative flex flex-col gap-3">
          <TextField
            label="Ton prénom"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="given-name"
            maxLength={40}
            error={error}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="soft"
              onClick={() => {
                setEditing(false);
                setDraft(shown);
                setError(undefined);
              }}
            >
              Annuler
            </Button>
            <Button onClick={save} loading={pending}>
              Enregistrer
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full bg-surface font-display text-3xl font-semibold text-coral-ink shadow-soft"
          >
            {shown.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-2xl leading-tight font-semibold">{shown}</p>
            <p className="truncate text-[15px] text-ink-soft">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Modifier mon prénom"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-surface/70 text-coral-ink transition active:scale-90"
          >
            <Pencil size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
