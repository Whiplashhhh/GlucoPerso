import type { Metadata } from "next";
import { type CalendarMeal, CalendarView } from "@/components/calendar/calendar-view";
import {
  buildMonthGrid,
  gridRange,
  isDayKey,
  isMonthKey,
  monthKeyOf,
  monthOfDay,
} from "@/lib/calendar";
import { dayKey, timeIn } from "@/lib/dates";
import { listMealsBetween } from "@/server/repos/meals";
import { requireAppUser } from "@/server/session";

export const metadata: Metadata = { title: "Calendrier" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendrier">) {
  const { user, settings } = await requireAppUser();
  const { mois, jour } = await searchParams;
  const tz = settings.timezone;
  const now = new Date();
  const todayKey = dayKey(now, tz);

  // `?jour=` alone is enough to open its month; invalid values fall back to today.
  const day = isDayKey(jour) ? jour : null;
  const monthKey = isMonthKey(mois) ? mois : day ? monthOfDay(day) : monthKeyOf(now, tz);
  const inGrid = (key: string) =>
    buildMonthGrid(monthKey).some((week) => week.some((cell) => cell.key === key));
  const selected = day && inGrid(day) ? day : monthOfDay(todayKey) === monthKey ? todayKey : null;

  const { start, end } = gridRange(monthKey, tz);
  const meals = await listMealsBetween(user.id, start, end);
  const rows: CalendarMeal[] = meals.map((meal) => ({
    id: meal.id,
    day: dayKey(meal.eatenAt, tz),
    name: meal.name,
    time: timeIn(meal.eatenAt, tz),
    carbsGrams: meal.carbsGrams,
    insulinUnits: meal.insulinUnits,
    outcome: meal.outcome,
    photoId: meal.photos[0]?.id ?? null,
    notes: meal.notes,
  }));

  return (
    <CalendarView monthKey={monthKey} todayKey={todayKey} initialDay={selected} meals={rows} />
  );
}
