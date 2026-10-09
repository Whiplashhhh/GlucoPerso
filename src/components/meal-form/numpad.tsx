"use client";

import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"] as const;

/** Applies a key press to a typed decimal string ("12,5"). */
export function applyKey(current: string, key: string, maxDecimals: number): string {
  if (key === "back") return current.slice(0, -1);
  if (key === ",") {
    if (maxDecimals === 0 || current.includes(",")) return current;
    return current === "" ? "0," : `${current},`;
  }
  const [whole = "", decimals] = current.split(",");
  if (decimals !== undefined && decimals.length >= maxDecimals) return current;
  if (decimals === undefined && whole.length >= 3) return current;
  if (current === "0") return key;
  return current + key;
}

export function NumPad({ onKey, label }: { onKey: (key: string) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          aria-label={key === "back" ? "Effacer" : key === "," ? "Virgule" : key}
          className="grid h-14 place-items-center rounded-[18px] bg-surface font-display text-[1.7rem] font-semibold text-ink tabular shadow-soft transition active:scale-95 active:bg-surface-2"
        >
          {key === "back" ? <Delete size={26} strokeWidth={2.2} /> : key}
        </button>
      ))}
    </div>
  );
}
