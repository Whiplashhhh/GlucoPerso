"use client";

import { KeyRound, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { RecoveryCodes } from "@/components/recovery-codes";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { regenerateRecoveryCodesAction } from "@/server/actions/settings";

export function CodesGenerator({ left }: { left: number }) {
  const [confirming, setConfirming] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await regenerateRecoveryCodesAction();
      setConfirming(false);
      if (!result.ok || !result.data) {
        setError("Oups, les codes n'ont pas pu être créés. On réessaie ?");
        return;
      }
      setCodes(result.data.codes);
    });
  }

  if (codes) return <RecoveryCodes codes={codes} continueHref="/moi" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-[24px] bg-surface p-5 shadow-soft">
        <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-amber-soft text-amber-ink">
          <KeyRound size={26} aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-3xl leading-none font-semibold tabular">{left}</p>
          <p className="text-[15px] font-bold text-ink-soft">
            code{left > 1 ? "s" : ""} encore disponible{left > 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <p className="px-1 text-ink-soft">
        Tu as perdu tes codes, ou tu en as beaucoup utilisé ? Génère-en de nouveaux : les anciens ne
        marcheront plus.
      </p>
      {error && <Notice tone="warm">{error}</Notice>}
      <Button size="lg" onClick={() => setConfirming(true)} icon={<RefreshCw size={20} />}>
        Générer de nouveaux codes
      </Button>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="De nouveaux codes ?">
        <div className="flex flex-col gap-4">
          <p className="text-center text-ink-soft">
            Tes anciens codes seront remplacés et ne fonctionneront plus. Les nouveaux ne
            s&apos;affichent qu&apos;une fois : garde-les bien.
          </p>
          <Button size="lg" onClick={generate} loading={pending}>
            Oui, générer
          </Button>
          <Button variant="soft" onClick={() => setConfirming(false)}>
            Finalement non
          </Button>
        </div>
      </Modal>
    </div>
  );
}
