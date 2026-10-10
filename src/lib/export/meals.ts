import { dayKey, timeIn } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { GLUCOSE_UNIT_LABEL, type GlucoseUnit, type Outcome, toUnit } from "@/lib/glucose";
import { MOMENT_LABEL, type RatioMoment } from "@/lib/moments";
import { OUTCOME_INFO } from "@/lib/outcomes";
import { type MealTag, TAG_INFO } from "@/lib/tags";

/** The slice of a meal the doctor exports need. */
export type ExportMeal = {
  eatenAt: Date;
  moment: RatioMoment;
  name: string;
  carbsGrams: number;
  insulinUnits: number;
  correctionUnits: number;
  ratioUsed: number | null;
  glucoseBefore: number | null;
  glucoseAfter: number | null;
  glucoseLow: number | null;
  glucoseHigh: number | null;
  outcome: Outcome | null;
  tags: MealTag[];
  notes: string | null;
};

export type ExportOptions = { unit: GlucoseUnit; timeZone: string };

const glucose = (value: number | null, unit: GlucoseUnit) =>
  value === null ? "" : formatNumber(toUnit(value, unit), unit === "MG_DL" ? 0 : 2);

const number = (value: number | null, digits = 1) =>
  value === null ? "" : formatNumber(value, digits).replace(/\s/g, "");

/** One display row per meal, every cell already formatted in French. */
export function exportRow(meal: ExportMeal, { unit, timeZone }: ExportOptions): string[] {
  return [
    dayKey(meal.eatenAt, timeZone).split("-").reverse().join("/"),
    timeIn(meal.eatenAt, timeZone),
    MOMENT_LABEL[meal.moment],
    meal.name,
    number(meal.carbsGrams, 0),
    number(meal.insulinUnits),
    meal.correctionUnits ? number(meal.correctionUnits) : "",
    number(meal.ratioUsed),
    glucose(meal.glucoseBefore, unit),
    glucose(meal.glucoseAfter, unit),
    glucose(meal.glucoseLow, unit),
    glucose(meal.glucoseHigh, unit),
    meal.outcome ? OUTCOME_INFO[meal.outcome].label : "",
    meal.tags.map((tag) => TAG_INFO[tag].label).join(", "),
    meal.notes ?? "",
  ];
}

export function exportHeader(unit: GlucoseUnit): string[] {
  const u = GLUCOSE_UNIT_LABEL[unit];
  return [
    "Date",
    "Heure",
    "Moment",
    "Plat",
    "Glucides (g)",
    "Unités (U)",
    "Dont correction (U)",
    "Ratio utilisé (g/U)",
    `Glycémie avant (${u})`,
    `Glycémie après (${u})`,
    `Glycémie min (${u})`,
    `Glycémie max (${u})`,
    "Résultat",
    "Tags",
    "Notes",
  ];
}

/** Text cells starting like a formula are neutralised (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Escapes one cell for a `;`-separated CSV read by French Excel. */
export function csvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** UTF-8 BOM so Excel detects the encoding. */
export const CSV_BOM = "\uFEFF";

export function buildCsv(rows: readonly (readonly string[])[]): string {
  return CSV_BOM + rows.map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

export function mealsCsv(meals: readonly ExportMeal[], options: ExportOptions): string {
  return buildCsv([exportHeader(options.unit), ...meals.map((meal) => exportRow(meal, options))]);
}

/**
 * Keeps only what the standard PDF fonts (WinAnsi) can draw: emojis and other
 * symbols are dropped, a few common ones get a plain equivalent.
 */
export function pdfText(value: string): string {
  return value
    .replace(/→/g, "->")
    .replace(/[\u2009\u202F\u00A0]/g, " ")
    .replace(
      /[^\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u20AC\n]/gu,
      "",
    )
    .replace(/ {2,}/g, " ")
    .trim();
}
