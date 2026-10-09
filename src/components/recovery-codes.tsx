"use client";

import { Check, Copy, Download, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Shows freshly generated recovery codes once, with copy and download. */
export function RecoveryCodes({ codes, continueHref }: { codes: string[]; continueHref: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const text = [
    "GlucoPerso — codes de récupération",
    "",
    "Chaque code permet une seule fois de choisir un nouveau mot de passe.",
    "Garde-les dans un endroit sûr (gestionnaire de mots de passe, papier rangé…).",
    "",
    ...codes,
    "",
  ].join("\n");

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "glucoperso-codes-de-recuperation.txt";
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }

  async function copy() {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-soft text-amber-ink">
            <KeyRound size={24} />
          </span>
          <div>
            <h2 className="text-2xl font-semibold">Tes codes de secours</h2>
            <p className="text-[15px] text-ink-soft">Affichés une seule fois</p>
          </div>
        </div>
        <p className="text-ink-soft">
          Si tu oublies ton mot de passe, un de ces codes te permettra d&apos;en choisir un nouveau,
          sans email. Mets-les à l&apos;abri 🔐
        </p>
        <ul
          aria-label="Codes de récupération"
          className="grid grid-cols-2 gap-2 rounded-[18px] bg-surface-2 p-3 font-mono text-[15px] font-bold tracking-wide tabular"
        >
          {codes.map((code) => (
            <li key={code} className="rounded-xl bg-surface px-2 py-2 text-center">
              {code}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={download} icon={<Download size={20} />}>
            Télécharger
          </Button>
          <Button
            variant="soft"
            onClick={copy}
            icon={copied ? <Check size={20} /> : <Copy size={20} />}
          >
            {copied ? "Copiés !" : "Copier"}
          </Button>
        </div>
      </Card>
      <ButtonLink
        href={continueHref}
        size="lg"
        aria-disabled={!saved}
        className={saved ? undefined : "pointer-events-none opacity-50"}
        tabIndex={saved ? undefined : -1}
      >
        C&apos;est noté, on continue
      </ButtonLink>
      {!saved && (
        <p className="text-center text-sm text-ink-soft">
          Télécharge ou copie tes codes pour continuer.
        </p>
      )}
    </div>
  );
}
