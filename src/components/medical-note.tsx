import { HeartHandshake } from "lucide-react";

/** Permanent, discreet reminder that the app only gives hints. */
export function MedicalNote() {
  return (
    <p className="flex items-start gap-2 px-2 text-[13px] leading-snug text-ink-faint">
      <HeartHandshake size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      Indications basées sur ton historique, à titre indicatif seulement. Ne remplace pas
      l&apos;avis de ton équipe médicale.
    </p>
  );
}
