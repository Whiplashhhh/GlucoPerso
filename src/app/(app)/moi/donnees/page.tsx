import { Archive, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Cloud } from "@/components/illustrations/buddies";
import { ExportPicker } from "@/components/settings/export-picker";
import { BackLink, IconBubble, SettingsSection } from "@/components/settings/section";
import { buttonClass } from "@/components/ui/button";
import { dayKey } from "@/lib/dates";
import { periodStart } from "@/lib/period";
import { requireAppUser } from "@/server/session";
import { DeleteAccount } from "./delete-account";

export const metadata: Metadata = { title: "Mes données" };

export default async function DataPage() {
  const { settings } = await requireAppUser();
  const now = new Date();
  const tz = settings.timezone;
  const from = dayKey(periodStart("30", now, tz) ?? now, tz);

  return (
    <div className="flex flex-col gap-8 pt-4">
      <div className="flex flex-col gap-2">
        <BackLink />
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[2.1rem] leading-tight font-semibold">Mes données</h1>
            <p className="mt-1 text-ink-soft">Elles sont à toi, et à personne d&apos;autre.</p>
          </div>
          <Cloud className="w-20 shrink-0" />
        </header>
      </div>

      <div className="flex gap-3 rounded-[24px] bg-sky-soft p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-ink-soft" size={22} aria-hidden="true" />
        <p className="text-[15px] font-semibold text-ink">
          Ton carnet n&apos;est partagé avec personne. Tes photos restent sur le serveur, servies à
          toi seule.
        </p>
      </div>

      <SettingsSection title="Pour mon diabéto" id="diabeto">
        <ExportPicker defaultFrom={from} defaultTo={dayKey(now, tz)} />
      </SettingsSection>

      <SettingsSection title="Tout exporter" id="export">
        <div className="flex flex-col gap-4 rounded-[24px] bg-surface p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <IconBubble tone="mint">
              <Archive size={22} />
            </IconBubble>
            <p className="text-ink-soft">
              Une archive ZIP avec toutes tes données (format JSON) et les photos de tes repas.
            </p>
          </div>
          <a href="/api/export/all" download className={buttonClass("soft", "lg")}>
            Exporter toutes mes données
          </a>
        </div>
      </SettingsSection>

      <SettingsSection title="Supprimer mon compte" id="suppression">
        <DeleteAccount />
      </SettingsSection>
    </div>
  );
}
