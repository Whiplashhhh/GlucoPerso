"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/format";
import { MOMENT_EMOJI, MOMENT_LABEL, type RatioMoment } from "@/lib/moments";
import type { RatioTimelineRow } from "@/lib/stats";

/** Fixed colour per moment (follows the entity, never its rank). CSS vars swap in dark mode. */
export const MOMENT_COLOR: Record<RatioMoment, string> = {
  DEFAULT: "var(--coral-strong)",
  BREAKFAST: "var(--amber)",
  LUNCH: "var(--mint)",
  AFTERNOON_SNACK: "var(--lavender)",
  DINNER: "var(--ink-soft)",
  SNACK: "var(--coral-ink)",
};

/** Dash per moment so lines stay apart without relying on colour. */
const MOMENT_DASH: Record<RatioMoment, string | undefined> = {
  DEFAULT: undefined,
  BREAKFAST: "6 4",
  LUNCH: undefined,
  AFTERNOON_SNACK: "2 4",
  DINNER: "8 3 2 3",
  SNACK: "4 4",
};

export function RatioChart({
  rows,
  moments,
  timeZone,
}: {
  rows: RatioTimelineRow[];
  moments: RatioMoment[];
  timeZone: string;
}) {
  const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone });
  const full = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone });

  return (
    <figure className="flex flex-col gap-3">
      {moments.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1" aria-label="Légende">
          {moments.map((moment) => (
            <li key={moment} className="flex items-center gap-1.5 text-sm font-bold text-ink-soft">
              <svg width="22" height="8" aria-hidden="true">
                <line
                  x1="1"
                  x2="21"
                  y1="4"
                  y2="4"
                  stroke={MOMENT_COLOR[moment]}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={MOMENT_DASH[moment]}
                />
              </svg>
              {MOMENT_EMOJI[moment]} {MOMENT_LABEL[moment]}
            </li>
          ))}
        </ul>
      )}
      <div className="h-56 w-full" role="img" aria-label="Courbe de tes ratios dans le temps">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value: number) => day.format(value)}
              tick={{ fill: "var(--ink-faint)", fontSize: 12, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              minTickGap={28}
            />
            <YAxis
              domain={["dataMin - 2", "dataMax + 2"]}
              allowDecimals={false}
              tickFormatter={(value: number) => `${formatNumber(value, 0)} g`}
              tick={{ fill: "var(--ink-faint)", fontSize: 12, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              cursor={{ stroke: "var(--ink-faint)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 16,
                boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.25)",
                color: "var(--ink)",
                fontWeight: 700,
              }}
              labelStyle={{ color: "var(--ink-soft)", marginBottom: 4 }}
              itemStyle={{ color: "var(--ink)", padding: 0 }}
              labelFormatter={(value) => full.format(Number(value))}
              formatter={(value, name) => [
                `1 U / ${formatNumber(Number(value))} g`,
                MOMENT_LABEL[name as RatioMoment] ?? String(name),
              ]}
            />
            {moments.map((moment) => (
              <Line
                key={moment}
                dataKey={moment}
                name={moment}
                type="stepAfter"
                stroke={MOMENT_COLOR[moment]}
                strokeWidth={2.5}
                strokeDasharray={MOMENT_DASH[moment]}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
