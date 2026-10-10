import { describe, expect, it } from "vitest";
import {
  CSV_BOM,
  type ExportMeal,
  buildCsv,
  csvCell,
  exportRow,
  mealsCsv,
  pdfText,
} from "@/lib/export/meals";

const meal: ExportMeal = {
  eatenAt: new Date("2026-09-14T18:30:00Z"),
  moment: "DINNER",
  name: "Raclette",
  carbsGrams: 65,
  insulinUnits: 7.5,
  correctionUnits: 1,
  ratioUsed: 10,
  glucoseBefore: 1.42,
  glucoseAfter: 1.1,
  glucoseLow: null,
  glucoseHigh: 1.85,
  outcome: "PERFECT",
  tags: ["SLOW_ABSORPTION", "ALCOHOL"],
  notes: 'Avec "beaucoup" de fromage; miam',
};

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Raclette")).toBe("Raclette");
    expect(csvCell("7,5")).toBe("7,5");
  });

  it("quotes separators, quotes and line breaks", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(csvCell("ligne\nsuivante")).toBe('"ligne\nsuivante"');
  });

  it("neutralises formulas (CSV injection)", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+33")).toBe("'+33");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-2;x")).toBe('"\'-2;x"');
  });
});

describe("meals CSV", () => {
  it("formats a row in French, in her unit and timezone", () => {
    expect(exportRow(meal, { unit: "G_L", timeZone: "Europe/Paris" })).toEqual([
      "14/09/2026",
      "20:30",
      "Dîner",
      "Raclette",
      "65",
      "7,5",
      "1",
      "10",
      "1,42",
      "1,1",
      "",
      "1,85",
      "Pile poil",
      "Absorption lente / gras, Alcool",
      'Avec "beaucoup" de fromage; miam',
    ]);
    const mg = exportRow(meal, { unit: "MG_DL", timeZone: "Europe/Paris" });
    expect(mg.slice(8, 12)).toEqual(["142", "110", "", "185"]);
  });

  it("starts with a BOM, uses ; and CRLF, and escapes notes", () => {
    const csv = mealsCsv([meal], { unit: "G_L", timeZone: "Europe/Paris" });
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toContain("Date;Heure;Moment;Plat;Glucides (g)");
    expect(lines[0]).toContain("Glycémie avant (g/L)");
    expect(lines[1]).toContain(';"Avec ""beaucoup"" de fromage; miam"');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe("");
  });

  it("builds an empty export with just the header", () => {
    expect(buildCsv([["a", "b"]])).toBe(`${CSV_BOM}a;b\r\n`);
  });
});

describe("pdfText", () => {
  it("drops emojis and keeps French accents", () => {
    expect(pdfText("Pile poil 🎯 à l'été — ça va ✨")).toBe("Pile poil à l'été — ça va");
    expect(pdfText("10 → 12 g")).toBe("10 -> 12 g");
    expect(pdfText("Œuf « cocotte »")).toBe("Œuf « cocotte »");
  });
});
