import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Bowl } from "@/components/illustrations/buddies";
import { MedicalNote } from "@/components/medical-note";
import { BackLink, SettingsSection } from "@/components/settings/section";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { MOMENT_EMOJI, MOMENT_LABEL } from "@/lib/moments";
import { getRatioTable, ratioHistory } from "@/server/repos/settings";
import { requireAppUser } from "@/server/session";
import { RatioEditor } from "./ratio-editor";

export const metadata: Metadata = { title: "Mes ratios" };

const ORIGIN = {
  ONBOARDING: { label: "départ", className: "bg-mint-soft text-mint-ink" },
  MANUAL: { label: "manuel", className: "bg-coral-soft text-coral-ink" },
  SUGGESTION: { label: "suggestion acceptée", className: "bg-lavender-soft text-lavender-ink" },
} as const;

export default async function RatiosPage() {
  const { user, settings } = await requireAppUser();
  const [ratios, history] = await Promise.all([getRatioTable(user.id), ratioHistory(user.id)]);
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: settings.timezone,
  });

  return (
    <div className="flex flex-col gap-8 pt-4">
      <div className="flex flex-col gap-2">
        <BackLink />
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[2.1rem] leading-tight font-semibold">Mes ratios</h1>
            <p className="mt-1 text-ink-soft">Ceux de ton équipe médicale, ajustés à ton rythme.</p>
          </div>
          <Bowl className="w-16 shrink-0" mood="happy" />
        </header>
      </div>

      <RatioEditor ratios={ratios} perMoment={settings.usePerMomentRatios} />

      <SettingsSection title="Historique de mes ratios" id="historique">
        {history.length === 0 ? (
          <p className="rounded-[24px] bg-surface-2 p-5 text-ink-soft">
            Aucun changement pour l&apos;instant.
          </p>
        ) : (
          <ol className="flex flex-col gap-2" aria-label="Historique des ratios">
            {history.map((change) => {
              const origin = ORIGIN[change.origin];
              return (
                <li
                  key={change.id}
                  className="flex flex-col gap-2 rounded-[22px] bg-surface p-4 shadow-soft"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-ink-soft">
                      {MOMENT_EMOJI[change.moment]} {MOMENT_LABEL[change.moment]} ·{" "}
                      <time dateTime={change.createdAt.toISOString()}>
                        {date.format(change.createdAt)}
                      </time>
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold",
                        origin.className,
                      )}
                    >
                      {origin.label}
                    </span>
                  </div>
                  <p className="flex items-center gap-2 font-display text-xl font-semibold tabular">
                    {change.fromValue === null ? (
                      <span className="text-ink-soft">Départ</span>
                    ) : (
                      <span className="text-ink-soft">{formatNumber(change.fromValue)} g</span>
                    )}
                    <ArrowRight size={18} className="text-ink-faint" aria-label="devient" />
                    <span>1 U / {formatNumber(change.toValue)} g</span>
                  </p>
                  {change.justification && (
                    <p className="text-[15px] text-ink-soft">« {change.justification} »</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </SettingsSection>

      <MedicalNote />
    </div>
  );
}
