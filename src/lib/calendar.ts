import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Pure calendar helpers. Calendar days are plain "yyyy-MM-dd" strings built
 * with UTC arithmetic (no timezone involved); the user's timezone only
 * matters when converting days to instants (`gridRange`) or instants to days
 * (`groupByDay`).
 */

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY_KEY = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CalendarDay = { key: string; day: number; inMonth: boolean };

const pad = (value: number) => String(value).padStart(2, "0");

function utcKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function partsOf(key: string): [number, number, number] {
  const [year = 1970, month = 1, day = 1] = key.split("-").map(Number);
  return [year, month, day];
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && MONTH_KEY.test(value);
}

/** Valid "yyyy-MM-dd" that exists in the calendar (no 31 February). */
export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_KEY.test(value)) return false;
  const [year, month, day] = partsOf(value);
  return utcKey(new Date(Date.UTC(year, month - 1, day))) === value;
}

/** "yyyy-MM" of the local month containing `date`. */
export function monthKeyOf(date: Date, timeZone: string): string {
  return format(new TZDate(date, timeZone), "yyyy-MM");
}

export function monthOfDay(dayKey: string): string {
  return dayKey.slice(0, 7);
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = partsOf(monthKey);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return utcKey(date).slice(0, 7);
}

/**
 * Weeks (Monday first) covering the month, with the trailing days of the
 * previous month and the leading days of the next one to fill each row.
 */
export function buildMonthGrid(monthKey: string): CalendarDay[][] {
  const [year, month] = partsOf(monthKey);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const weekCount = Math.ceil((offset + daysInMonth) / 7);
  const weeks: CalendarDay[][] = [];
  for (let week = 0; week < weekCount; week += 1) {
    const row: CalendarDay[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(first.getTime() + (week * 7 + weekday - offset) * DAY_MS);
      row.push({
        key: utcKey(date),
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === month - 1,
      });
    }
    weeks.push(row);
  }
  return weeks;
}

/** Instant of local midnight starting `dayKey` in `timeZone` (DST-safe). */
export function startOfDayIn(dayKey: string, timeZone: string): Date {
  const [year, month, day] = partsOf(dayKey);
  return new Date(new TZDate(year, month - 1, day, timeZone).getTime());
}

function nextDayKey(dayKey: string): string {
  const [year, month, day] = partsOf(dayKey);
  return utcKey(new Date(Date.UTC(year, month - 1, day + 1)));
}

/** [start, end) instants covering every day shown in the month grid. */
export function gridRange(monthKey: string, timeZone: string): { start: Date; end: Date } {
  const weeks = buildMonthGrid(monthKey);
  const firstDay = weeks[0]?.[0]?.key ?? `${monthKey}-01`;
  const lastDay = weeks.at(-1)?.at(-1)?.key ?? `${monthKey}-01`;
  return {
    start: startOfDayIn(firstDay, timeZone),
    end: startOfDayIn(nextDayKey(lastDay), timeZone),
  };
}

/** Items grouped by local day, each day in chronological order. */
export function groupByDay<T extends { eatenAt: Date }>(
  items: readonly T[],
  timeZone: string,
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  const sorted = [...items].sort((a, b) => a.eatenAt.getTime() - b.eatenAt.getTime());
  for (const item of sorted) {
    const key = format(new TZDate(item.eatenAt, timeZone), "yyyy-MM-dd");
    (groups[key] ??= []).push(item);
  }
  return groups;
}

/** Items grouped by local month, keeping the input order (newest first in search). */
export function groupByMonth<T extends { eatenAt: Date }>(
  items: readonly T[],
  timeZone: string,
): { key: string; label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const key = monthKeyOf(item.eatenAt, timeZone);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label: monthLabel(key), items: [item] });
  }
  return groups;
}

/** « octobre 2026 » */
export function monthLabel(monthKey: string): string {
  const [year, month] = partsOf(monthKey);
  return format(new Date(year, month - 1, 1), "LLLL yyyy", { locale: fr });
}

/** « jeudi 9 octobre » */
export function dayLabel(dayKey: string): string {
  const [year, month, day] = partsOf(dayKey);
  return format(new Date(year, month - 1, day), "EEEE d MMMM", { locale: fr });
}

/** Weekday headers, Monday first. */
export const WEEKDAYS = [
  { short: "L", long: "lundi" },
  { short: "M", long: "mardi" },
  { short: "M", long: "mercredi" },
  { short: "J", long: "jeudi" },
  { short: "V", long: "vendredi" },
  { short: "S", long: "samedi" },
  { short: "D", long: "dimanche" },
] as const;
