"use client";

import { Check, Combine, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { mergeDishAction, renameDishAction } from "@/server/actions/dishes";

export type MergeTarget = { id: string; name: string; count: number };

const OOPS = "Oups, ça n'a pas marché. On réessaie ?";
const meals = (count: number) => `${count} repas`;

/** « Renommer » and « Fusionner avec… » for a dish she owns. */
export function DishActions({
  dishId,
  name,
  count,
  targets,
}: {
  dishId: string;
  name: string;
  count: number;
  targets: MergeTarget[];
}) {
  const [renaming, setRenaming] = useState(false);
  const [merging, setMerging] = useState(false);
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Button variant="outline" size="lg" onClick={() => setRenaming(true)}>
        <Pencil size={20} />
        Renommer
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setMerging(true)}
        disabled={targets.length === 0}
      >
        <Combine size={20} />
        Fusionner…
      </Button>
      <RenameModal dishId={dishId} name={name} open={renaming} onClose={() => setRenaming(false)} />
      <MergeModal
        dishId={dishId}
        name={name}
        count={count}
        targets={targets}
        open={merging}
        onClose={() => setMerging(false)}
      />
    </div>
  );
}

function RenameModal({
  dishId,
  name,
  open,
  onClose,
}: {
  dishId: string;
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setValue(name);
    setError(undefined);
    setFormError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="Renommer le plat">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          startTransition(async () => {
            const result = await renameDishAction(dishId, value).catch(() => ({
              error: OOPS,
              fieldErrors: undefined,
              ok: false,
            }));
            if (result.ok) {
              onClose();
              return;
            }
            setError(result.fieldErrors?.name);
            if (!result.fieldErrors) setFormError(result.error ?? OOPS);
          });
        }}
      >
        <TextField
          label="Nouveau nom"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(undefined);
          }}
          maxLength={80}
          autoComplete="off"
          error={error}
          hint="Tes repas gardent le nom que tu avais noté."
        />
        {formError && <Notice tone="warm">{formError}</Notice>}
        <Button type="submit" size="lg" loading={pending}>
          Renommer
        </Button>
      </form>
    </Modal>
  );
}

function MergeModal({
  dishId,
  name,
  count,
  targets,
  open,
  onClose,
}: {
  dishId: string;
  name: string;
  count: number;
  targets: MergeTarget[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<MergeTarget | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setTarget(null);
    setConfirming(false);
    setError(null);
    onClose();
  }

  function merge() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const result = await mergeDishAction(dishId, target.id).catch(() => ({
        ok: false,
        data: undefined,
      }));
      if (result.ok && result.data) {
        router.replace(`/plats/${result.data.id}?fusion=1`);
        return;
      }
      setError(OOPS);
    });
  }

  return (
    <Modal open={open} onClose={close} title={confirming ? "On fusionne ?" : "Fusionner avec…"}>
      {confirming && target ? (
        <div className="flex flex-col gap-4">
          <p className="text-center text-ink-soft">
            {count > 1 ? `Les ${meals(count)}` : "Le repas"} de{" "}
            <strong className="text-ink">« {name} »</strong>{" "}
            {count > 1 ? "rejoindront" : "rejoindra"}{" "}
            <strong className="text-ink">« {target.name} »</strong>. « {name} » disparaîtra de ta
            liste, rien d&apos;autre ne change.
          </p>
          {error && <Notice tone="warm">{error}</Notice>}
          <div className="flex flex-col gap-2">
            <Button size="lg" loading={pending} onClick={merge}>
              Oui, fusionner
            </Button>
            <Button variant="soft" size="lg" onClick={() => setConfirming(false)}>
              Finalement non
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-center text-ink-soft">
            C&apos;est le même plat sous un autre nom ? Choisis celui qui le garde.
          </p>
          <ul
            role="radiogroup"
            aria-label="Plat qui garde les repas"
            className="-mx-1 flex max-h-[42dvh] flex-col gap-2 overflow-y-auto px-1 py-1"
          >
            {targets.map((option) => {
              const selected = option.id === target?.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTarget(option)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-[18px] border-2 px-4 text-left transition-colors",
                      selected
                        ? "border-coral bg-coral-soft text-coral-ink"
                        : "border-line bg-surface text-ink hover:border-coral/50",
                    )}
                  >
                    <span className="flex-1 truncate font-bold">{option.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-ink-soft">
                      {meals(option.count)}
                    </span>
                    {selected && <Check size={20} className="shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <Button size="lg" disabled={!target} onClick={() => setConfirming(true)}>
            Continuer
          </Button>
        </div>
      )}
    </Modal>
  );
}
