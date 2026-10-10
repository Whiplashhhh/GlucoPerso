import type { Metadata } from "next";
import Link from "next/link";
import { Peach, Sparkle } from "@/components/illustrations/buddies";
import { MedicalNote } from "@/components/medical-note";
import { ExportPicker } from "@/components/settings/export-picker";
import { BackLink, SettingsSection } from "@/components/settings/section";
import { cn } from "@/lib/cn";
import { dayKey } from "@/lib/dates";
import { PERIODS, PERIOD_IN_SENTENCE, PERIOD_LABEL, parsePeriod, periodStart } from "@/lib/period";
import { outcomeHeadline, ratioTimeline, summarizeOutcomes } from "@/lib/stats";
import { firstMealAt, outcomesSince, ratioChangesBetween } from "@/server/repos/export";
import { requireAppUser } from "@/server/session";
import { OutcomeBars } from "./outcome-bars";
import { RatioChart } from "./ratio-chart";

export const metadata: Metadata = { title: "Mon évolution" };

export default async function EvolutionPage({ searchParams }: PageProps<"/moi/evolution">) {
  const { user, settings } = await requireAppUser();
  const period = parsePeriod((await searchParams).periode);
  const now = new Date();
  const tz = settings.timezone;
  const start = periodStart(period, now, tz);

  const [outcomes, changes, firstMeal] = await Promise.all([
    outcomesSince(user.id, start),
    ratioChangesBetween(user.id, null, now),
    firstMealAt(user.id),
  ]);
  const summary = summarizeOutcomes(outcomes);
  const headline = outcomeHeadline(summary, PERIOD_IN_SENTENCE[period]);
  const timeline = ratioTimeline(changes, start, now);
  const exportFrom = dayKey(start ?? firstMeal ?? now, tz);

  return (
    <div className="flex flex-col gap-8 pt-4">
      <div className="flex flex-col gap-2">
        <BackLink />
        <h1 className="text-[2.1rem] leading-tight font-semibold">Mon évolution</h1>
      </div>

      <nav aria-label="Période" className="-mt-4 flex gap-1 rounded-[20px] bg-surface-2 p-1.5">
        {PERIODS.map((value) => (
          <Link
            key={value}
            href={value === "30" ? "/moi/evolution" : `/moi/evolution?periode=${value}`}
            aria-current={value === period ? "page" : undefined}
            replace
            scroll={false}
            className={cn(
              "flex min-h-12 flex-1 items-center justify-center rounded-[16px] font-bold transition-colors",
              value === period ? "bg-surface text-ink shadow-soft" : "text-ink-soft",
            )}
          >
            {PERIOD_LABEL[value]}
          </Link>
        ))}
      </nav>

      <section
        aria-label="En résumé"
        className="relative overflow-hidden rounded-[28px] bg-mint-soft p-6 shadow-soft"
      >
        <Sparkle className="absolute top-5 right-6 w-5 text-mint" />
        <Sparkle className="absolute top-12 right-14 w-3 text-amber" />
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <h2 className="font-display leading-snug font-semibold text-ink">
              {headline.figure && (
                <span className="block text-[4.5rem] leading-[0.95] text-mint-ink tabular">
                  {headline.figure}
                </span>
              )}
              <span className="block text-2xl">{headline.title}</span>
            </h2>
            <p className="mt-1 text-[15px] text-ink-soft">{headline.subtitle}</p>
          </div>
          <Peach className="w-20 shrink-0" mood={summary.total ? "joy" : "calm"} />
        </div>
      </section>

      <SettingsSection title="Mes ratios dans le temps" id="courbe">
        <div className="rounded-[24px] bg-surface p-4 pt-5 shadow-soft">
          {timeline.rows.length > 0 ? (
            <RatioChart rows={timeline.rows} moments={timeline.moments} timeZone={tz} />
          ) : (
            <p className="p-2 text-ink-soft">Ta courbe apparaîtra ici.</p>
          )}
          <p className="mt-3 px-1 text-sm text-ink-soft">
            En grammes de glucides pour 1 unité. Chaque marche, c&apos;est un ajustement : le signe
            que ton carnet apprend avec toi.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="Mes repas, moment par moment" id="resultats">
        <div className="rounded-[24px] bg-surface p-5 shadow-soft">
          {summary.perMoment.length > 0 ? (
            <OutcomeBars perMoment={summary.perMoment} />
          ) : (
            <p className="text-ink-soft">
              Dis-moi comment se passent tes repas, et tu verras ici ce qui marche le mieux pour toi
              🌱
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="Pour mon diabéto" id="export">
        <ExportPicker key={exportFrom} defaultFrom={exportFrom} defaultTo={dayKey(now, tz)} />
      </SettingsSection>

      <MedicalNote />
    </div>
  );
}
