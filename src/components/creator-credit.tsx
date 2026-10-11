import { CREATOR } from "@/lib/credits";

/** Discreet signature: who made the app. */
export function CreatorCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[13px] leading-snug text-ink-faint ${className}`}>
      GlucoPerso, créé avec ❤️ par {CREATOR}
    </p>
  );
}
