import {
  ChartSpline,
  ChevronRight,
  FolderHeart,
  History,
  KeyRound,
  SlidersHorizontal,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Sun } from "@/components/illustrations/buddies";
import { MedicalNote } from "@/components/medical-note";
import { LinkRow, SettingsSection } from "@/components/settings/section";
import { formatNumber } from "@/lib/format";
import { MEAL_MOMENTS, MOMENT_EMOJI, MOMENT_LABEL, type RatioMoment } from "@/lib/moments";
import { themeChoiceOf } from "@/lib/theme";
import { remainingRecoveryCodes } from "@/server/repos/recovery";
import { getRatioTable } from "@/server/repos/settings";
import { requireAppUser } from "@/server/session";
import { ProfileCard } from "./profile-card";
import { SettingsPanel } from "./settings-panel";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Moi" };

export default async function MePage() {
  const { user, settings } = await requireAppUser();
  const [ratios, codesLeft] = await Promise.all([
    getRatioTable(user.id),
    remainingRecoveryCodes(user.id),
  ]);
  const shown: RatioMoment[] = (["DEFAULT", ...MEAL_MOMENTS] as const).filter(
    (moment) => ratios[moment] !== undefined,
  );

  return (
    <div className="flex flex-col gap-8 pt-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[2.2rem] leading-tight font-semibold">Moi</h1>
          <p className="mt-1 text-ink-soft">Ton carnet, réglé comme tu l&apos;aimes.</p>
        </div>
        <Sun className="-mt-1 w-14 shrink-0" mood="happy" />
      </header>

      <ProfileCard name={user.name} email={user.email} />

      <SettingsSection title="Mes ratios" id="ratios">
        <Link
          href="/moi/ratios"
          className="flex flex-col gap-4 rounded-[24px] bg-surface p-5 shadow-soft transition-transform active:scale-[0.98]"
        >
          <ul className="flex flex-wrap gap-2" aria-label="Ratios actuels">
            {shown.map((moment) => (
              <li
                key={moment}
                className="flex items-baseline gap-1.5 rounded-[16px] bg-coral-soft px-3 py-2 text-coral-ink"
              >
                <span className="text-sm font-bold">
                  {MOMENT_EMOJI[moment]} {MOMENT_LABEL[moment]}
                </span>
                <span className="font-display text-xl font-semibold text-ink tabular">
                  {formatNumber(ratios[moment] ?? 0)}
                </span>
                <span className="text-sm font-bold">g</span>
              </li>
            ))}
          </ul>
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-extrabold text-ink">
              <SlidersHorizontal size={20} className="text-coral-ink" aria-hidden="true" />
              Modifier mes ratios
            </span>
            <ChevronRight size={22} className="text-ink-faint" aria-hidden="true" />
          </span>
        </Link>
        <LinkRow
          href="/moi/ratios#historique"
          icon={<History size={22} />}
          tone="lavender"
          title="Historique de mes ratios"
          subtitle="Chaque changement, d'où il vient et pourquoi"
        />
      </SettingsSection>

      <SettingsSection title="Mon suivi" id="suivi">
        <LinkRow
          href="/moi/evolution"
          icon={<ChartSpline size={22} />}
          tone="mint"
          title="Mon évolution"
          subtitle="Tes ratios et tes repas en jolies courbes"
        />
        <LinkRow
          href="/moi/donnees"
          icon={<FolderHeart size={22} />}
          tone="sky"
          title="Mes données"
          subtitle="Tout exporter, ou supprimer mon compte"
        />
      </SettingsSection>

      <SettingsPanel
        initial={{
          glucoseUnit: settings.glucoseUnit,
          penIncrement: settings.penIncrement === 0.5 ? 0.5 : 1,
          hypoThreshold: settings.hypoThreshold,
          highThreshold: settings.highThreshold,
          doseConfirmThreshold: settings.doseConfirmThreshold,
          ratioMin: settings.ratioMin,
          ratioMax: settings.ratioMax,
          theme: themeChoiceOf(settings.theme),
          timezone: settings.timezone,
        }}
      />

      <SettingsSection title="Sécurité" id="securite">
        <LinkRow
          href="/moi/codes"
          icon={<KeyRound size={22} />}
          tone="amber"
          title="Codes de secours"
          subtitle={
            codesLeft > 0
              ? `${codesLeft} code${codesLeft > 1 ? "s" : ""} encore disponible${codesLeft > 1 ? "s" : ""}`
              : "Plus aucun code : pense à en générer"
          }
        />
        <SignOutButton />
      </SettingsSection>

      <MedicalNote />
    </div>
  );
}
