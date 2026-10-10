"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const dateInputClass =
  "min-h-12 w-full min-w-0 rounded-[16px] border-2 border-line bg-surface px-3 text-base font-bold text-ink tabular outline-none focus:border-coral";

/** Period picker + CSV / PDF downloads for the diabetologist. */
export function ExportPicker({
  defaultFrom,
  defaultTo,
  className,
}: {
  defaultFrom: string;
  defaultTo: string;
  className?: string;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const valid = Boolean(from && to && from <= to);
  const query = new URLSearchParams({ from, to }).toString();

  return (
    <div className={cn("flex flex-col gap-4 rounded-[24px] bg-surface p-5 shadow-soft", className)}>
      <p className="text-ink-soft">
        Un joli récapitulatif à montrer à ton diabéto&nbsp;: tes ratios, tes résultats par moment et
        tous tes repas. Le PDF se lit tel quel, le CSV s&apos;ouvre dans Excel.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="pl-1 text-sm font-bold text-ink-soft">Du</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            className={dateInputClass}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="pl-1 text-sm font-bold text-ink-soft">Au</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            max={defaultTo}
            onChange={(event) => setTo(event.target.value)}
            className={dateInputClass}
          />
        </label>
      </div>
      {!valid && <Notice tone="warm">Choisis une date de début avant la date de fin.</Notice>}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={valid ? `/api/export/pdf?${query}` : undefined}
          download
          aria-disabled={!valid}
          className={buttonClass("primary", "md", cn(!valid && "pointer-events-none opacity-50"))}
        >
          <FileText size={20} aria-hidden="true" />
          PDF
        </a>
        <a
          href={valid ? `/api/export/csv?${query}` : undefined}
          download
          aria-disabled={!valid}
          className={buttonClass("soft", "md", cn(!valid && "pointer-events-none opacity-50"))}
        >
          <FileSpreadsheet size={20} aria-hidden="true" />
          CSV
        </a>
      </div>
    </div>
  );
}
