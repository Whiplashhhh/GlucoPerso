import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfDay, startOfMonth } from "date-fns";

/** Start (inclusive) and end (exclusive) of the local day containing `date`. */
export function dayRange(date: Date, timeZone: string): { start: Date; end: Date } {
  const start = startOfDay(new TZDate(date, timeZone));
  return { start: new Date(start.getTime()), end: new Date(addDays(start, 1).getTime()) };
}

/** Local calendar day as "yyyy-MM-dd". */
export function dayKey(date: Date, timeZone: string): string {
  return format(new TZDate(date, timeZone), "yyyy-MM-dd");
}

/** "HH:mm" in the user's timezone. */
export function timeIn(date: Date, timeZone: string): string {
  return format(new TZDate(date, timeZone), "HH:mm");
}

/** First instant of the month `monthKey` ("yyyy-MM") in the user's timezone. */
export function monthStart(monthKey: string, timeZone: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  const local = new TZDate(year ?? 1970, (month ?? 1) - 1, 1, timeZone);
  return new Date(startOfMonth(local).getTime());
}
