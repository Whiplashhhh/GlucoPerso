import { describe, expect, it } from "vitest";
import { applyKey } from "@/components/meal-form/numpad";
import { cleanDishName, normalizeDishName, photoUrl } from "@/lib/dishes";
import { detectImageKind, isSupportedKind } from "@/lib/photos/magic";
import { mealInputSchema } from "@/lib/validation/meal";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string, pad = 0) =>
  new Uint8Array([...Array(pad).fill(0), ...Array.from(value, (c) => c.charCodeAt(0))]);

describe("image magic bytes", () => {
  it("recognises real image types", () => {
    expect(detectImageKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(detectImageKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(detectImageKind(text("RIFF\0\0\0\0WEBPVP8 "))).toBe("webp");
    expect(detectImageKind(text("GIF89a"))).toBe("gif");
    expect(detectImageKind(text("ftypheic", 4))).toBe("heic");
  });

  it("rejects anything else, whatever its name", () => {
    expect(detectImageKind(text("<svg xmlns="))).toBeNull();
    expect(detectImageKind(text("%PDF-1.7"))).toBeNull();
    expect(detectImageKind(bytes())).toBeNull();
    expect(isSupportedKind("heic")).toBe(false);
    expect(isSupportedKind("jpeg")).toBe(true);
    expect(isSupportedKind(null)).toBe(false);
  });
});

describe("dish names", () => {
  it("normalises for fuzzy matching", () => {
    expect(normalizeDishName("  Crêpes   au Nutella ! ")).toBe("crepes au nutella");
    expect(normalizeDishName("Pâtes-pesto")).toBe("pates pesto");
  });

  it("cleans the display name", () => {
    expect(cleanDishName("  raclette   savoyarde ")).toBe("Raclette savoyarde");
  });

  it("builds authenticated photo urls", () => {
    expect(photoUrl("abc")).toBe("/api/photos/abc?size=thumb");
    expect(photoUrl("abc", "full")).toBe("/api/photos/abc");
  });
});

describe("numeric keypad", () => {
  it("types numbers with a comma", () => {
    let value = "";
    for (const key of ["4", ",", "5", "5"]) value = applyKey(value, key, 1);
    expect(value).toBe("4,5");
  });

  it("respects decimals, length and leading zeros", () => {
    expect(applyKey("", ",", 1)).toBe("0,");
    expect(applyKey("12", ",", 0)).toBe("12");
    expect(applyKey("1,2", ",", 2)).toBe("1,2");
    expect(applyKey("123", "4", 0)).toBe("123");
    expect(applyKey("0", "7", 0)).toBe("7");
    expect(applyKey("60", "back", 0)).toBe("6");
  });
});

describe("meal validation", () => {
  const base = {
    name: "Raclette",
    eatenAt: new Date().toISOString(),
    moment: "DINNER",
    carbsGrams: "60",
    insulinUnits: "6,5",
  };

  it("accepts a quick entry with defaults", () => {
    const meal = mealInputSchema.parse(base);
    expect(meal.insulinUnits).toBe(6.5);
    expect(meal.correctionUnits).toBe(0);
    expect(meal.tags).toEqual([]);
    expect(meal.notes).toBeNull();
    expect(meal.photoId).toBeNull();
    expect(meal.glucoseBefore).toBeNull();
  });

  it("de-duplicates tags and keeps the correction inside the dose", () => {
    const meal = mealInputSchema.parse({ ...base, tags: ["SPORT", "SPORT"], correctionUnits: 1 });
    expect(meal.tags).toEqual(["SPORT"]);
    expect(mealInputSchema.safeParse({ ...base, correctionUnits: 9 }).success).toBe(false);
  });

  it("refuses implausible values", () => {
    expect(mealInputSchema.safeParse({ ...base, name: " " }).success).toBe(false);
    expect(mealInputSchema.safeParse({ ...base, insulinUnits: 80 }).success).toBe(false);
    expect(mealInputSchema.safeParse({ ...base, glucoseBefore: 12 }).success).toBe(false);
    expect(mealInputSchema.safeParse({ ...base, tags: ["PIZZA"] }).success).toBe(false);
    const future = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    expect(mealInputSchema.safeParse({ ...base, eatenAt: future }).success).toBe(false);
  });
});
