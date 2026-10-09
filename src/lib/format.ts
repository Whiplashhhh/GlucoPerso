const numberFormats = new Map<number, Intl.NumberFormat>();

/** French number: comma decimal, at most `digits` decimals, no trailing zeros. */
export function formatNumber(value: number, digits = 1): string {
  let format = numberFormats.get(digits);
  if (!format) {
    format = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits });
    numberFormats.set(digits, format);
  }
  return format.format(value);
}

export function formatUnits(units: number): string {
  return `${formatNumber(units)} U`;
}

export function formatGrams(grams: number): string {
  return `${formatNumber(grams, 0)} g`;
}

/** « 1 U / 12 g » */
export function formatRatio(gramsPerUnit: number): string {
  return `1 U / ${formatNumber(gramsPerUnit)} g`;
}

/** Parses a number typed with a comma or a dot; null when not a number. */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "" || !/^-?\d*\.?\d+$/.test(normalized)) return null;
  return Number(normalized);
}
