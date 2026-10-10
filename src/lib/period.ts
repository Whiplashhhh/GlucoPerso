import { TZDate } from "@date-fns/tz";
import { addDays, format, isValid, parse, subDays } from "date-fns";
import { z } from "zod";
import { dayKey } from "@/lib/dates";

/** Periods offered on « Mon évolution ». */
export const PERIODS = ["30", "90", "tout"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  "30": "30 j",
  "90": "90 j",
  tout: "Tout",
};

/** Used in sentences: « 68 % de pile poil ces 30 derniers jours ». */
export const PERIOD_IN_SENTENCE: Record<Period, string> = {
  "30": "ces 30 derniers jours",
  "90": "ces 3 derniers mois",
  tout: "depuis le début",
};

export function parsePeriod(value: unknown): Period {
  return PERIODS.find((period) => period === value) ?? "30";
}

/** First instant covered by a period, or null for « tout ». */
export function periodStart(period: Period, now: Date, timeZone: string): Date | null {
  if (period === "tout") return null;
  const days = Number(period);
  const first = subDays(new TZDate(now, timeZone), days - 1);
  return localDayStart(dayKey(first, timeZone), timeZone);
}

/** Longest export: a little more than 3 years. */
export const MAX_RANGE_DAYS = 1100;

const dayString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ")
  .refine((value) => isValid(parse(value, "yyyy-MM-dd", new Date(0))), "Cette date n'existe pas");

export const dateRangeSchema = z
  .object({ from: dayString, to: dayString })
  .refine(({ from, to }) => from <= to, {
    message: "La date de début doit précéder la date de fin",
    path: ["to"],
  });

export type DateRange = { from: string; to: string; start: Date; end: Date };

/** First instant of the local day `key` ("yyyy-MM-dd") in `timeZone`. */
export function localDayStart(key: string, timeZone: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(new TZDate(year ?? 1970, (month ?? 1) - 1, day ?? 1, timeZone).getTime());
}

/** Local "yyyy-MM-dd" + "HH:mm" in `timeZone` → instant. */
export function localDateTime(key: string, time: string, timeZone: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    new TZDate(
      year ?? 1970,
      (month ?? 1) - 1,
      day ?? 1,
      hours ?? 0,
      minutes ?? 0,
      timeZone,
    ).getTime(),
  );
}

/**
 * Parses `?from=YYYY-MM-DD&to=YYYY-MM-DD` into [start, end) instants in the
 * user's timezone. Missing values default to the last 30 days.
 */
export function parseDateRange(
  input: { from?: string | null; to?: string | null },
  timeZone: string,
  now = new Date(),
): { ok: true; range: DateRange } | { ok: false; error: string } {
  const today = dayKey(now, timeZone);
  const defaultFrom = dayKey(subDays(new TZDate(now, timeZone), 29), timeZone);
  const parsed = dateRangeSchema.safeParse({
    from: input.from || defaultFrom,
    to: input.to || today,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Période invalide" };
  }
  const { from, to } = parsed.data;
  const start = localDayStart(from, timeZone);
  const end = localDayStart(nextDay(to), timeZone);
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * 86_400_000) {
    return { ok: false, error: "Période trop longue (3 ans maximum)" };
  }
  return { ok: true, range: { from, to, start, end } };
}

function nextDay(key: string): string {
  return format(addDays(parse(key, "yyyy-MM-dd", new Date(0)), 1), "yyyy-MM-dd");
}

/** « du 01/09/2026 au 30/09/2026 » */
export function formatRange(from: string, to: string): string {
  const french = (key: string) => key.split("-").reverse().join("/");
  return from === to ? `le ${french(from)}` : `du ${french(from)} au ${french(to)}`;
}
