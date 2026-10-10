import "server-only";
import PDFDocument from "pdfkit";
import { type ExportMeal, exportRow, pdfText } from "@/lib/export/meals";
import { formatNumber } from "@/lib/format";
import { GLUCOSE_UNIT_LABEL, type GlucoseUnit } from "@/lib/glucose";
import { MEAL_MOMENTS, MOMENT_LABEL, type RatioMoment, type RatioTable } from "@/lib/moments";
import { OUTCOME_INFO } from "@/lib/outcomes";
import { formatRange } from "@/lib/period";
import { summarizeOutcomes } from "@/lib/stats";

type RatioChangeRow = {
  moment: RatioMoment;
  fromValue: number | null;
  toValue: number;
  origin: "ONBOARDING" | "MANUAL" | "SUGGESTION";
  justification: string | null;
  createdAt: Date;
};

export type PdfReport = {
  name: string;
  from: string;
  to: string;
  unit: GlucoseUnit;
  timeZone: string;
  ratios: RatioTable;
  changes: RatioChangeRow[];
  meals: ExportMeal[];
  now?: Date;
};

const MARGIN = 40;
const INK = "#3a2930";
const SOFT = "#6d5560";
const ACCENT = "#c2553a";
const HEAD_FILL = "#f7ecdf";
const ZEBRA = "#fdf8f1";
const LINE = "#e8d7c4";

const ORIGIN_LABEL: Record<RatioChangeRow["origin"], string> = {
  ONBOARDING: "départ",
  MANUAL: "manuel",
  SUGGESTION: "suggestion acceptée",
};

type Column = { header: string; width: number; align?: "left" | "right" | "center" };

/** Clean A4 report for the diabetologist. Standard fonts only, no photos. */
export async function buildReportPdf(report: PdfReport): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN + 14, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: {
      Title: pdfText(`GlucoPerso — ${report.name} — ${formatRange(report.from, report.to)}`),
      Author: "GlucoPerso",
      Creator: "GlucoPerso",
    },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const width = doc.page.width - MARGIN * 2;
  const unitLabel = GLUCOSE_UNIT_LABEL[report.unit];
  const dateFormat = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: report.timeZone,
  });

  // Title block
  doc.rect(0, 0, doc.page.width, 6).fill(ACCENT);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(20);
  doc.text(pdfText("GlucoPerso — carnet pour le diabétologue"), MARGIN, MARGIN);
  doc.moveDown(0.2).font("Helvetica").fontSize(11).fillColor(SOFT);
  doc.text(pdfText(`${report.name} · période ${formatRange(report.from, report.to)}`));
  doc.text(
    `Généré le ${dateFormat.format(report.now ?? new Date())} · glycémies en ${unitLabel} · ` +
      `${report.meals.length} repas`,
  );

  // Current ratios
  section(doc, "Ratios actuels (1 unité pour … g de glucides)");
  const current = (["DEFAULT", ...MEAL_MOMENTS] as const)
    .filter((moment) => report.ratios[moment] !== undefined)
    .map((moment) => `${MOMENT_LABEL[moment]} : ${formatNumber(report.ratios[moment] ?? 0)} g`);
  doc.font("Helvetica").fontSize(10.5).fillColor(INK).text(current.join("   ·   "), MARGIN);

  // Ratio history
  section(doc, "Changements de ratio sur la période");
  if (report.changes.length === 0) {
    muted(doc, "Aucun changement de ratio sur cette période.");
  } else {
    table(
      doc,
      [
        { header: "Date", width: 62 },
        { header: "Moment", width: 62 },
        { header: "Ratio", width: 78 },
        { header: "Origine", width: 88 },
        { header: "Justification", width: width - 290 },
      ],
      report.changes.map((change) => [
        dateFormat.format(change.createdAt),
        MOMENT_LABEL[change.moment],
        `${change.fromValue === null ? "—" : `${formatNumber(change.fromValue)} g`} -> ${formatNumber(change.toValue)} g`,
        ORIGIN_LABEL[change.origin],
        change.justification ?? "",
      ]),
    );
  }

  // Outcomes
  section(doc, "Résultats par moment (selon son ressenti après le repas)");
  const summary = summarizeOutcomes(report.meals);
  if (summary.total === 0) {
    muted(doc, "Aucun repas évalué sur cette période.");
  } else {
    const percent = (part: number, total: number) => `${Math.round((part / total) * 100)} %`;
    table(
      doc,
      [
        { header: "Moment", width: 95 },
        { header: "Évalués", width: 70, align: "right" },
        { header: OUTCOME_INFO.PERFECT.label, width: 90, align: "right" },
        { header: OUTCOME_INFO.TOO_MUCH.label, width: 130, align: "right" },
        { header: OUTCOME_INFO.NOT_ENOUGH.label, width: width - 385, align: "right" },
      ],
      [
        ...summary.perMoment.map((entry) => [
          MOMENT_LABEL[entry.moment],
          String(entry.total),
          `${entry.counts.PERFECT} (${percent(entry.counts.PERFECT, entry.total)})`,
          `${entry.counts.TOO_MUCH} (${percent(entry.counts.TOO_MUCH, entry.total)})`,
          `${entry.counts.NOT_ENOUGH} (${percent(entry.counts.NOT_ENOUGH, entry.total)})`,
        ]),
        [
          "Total",
          String(summary.total),
          `${summary.counts.PERFECT} (${percent(summary.counts.PERFECT, summary.total)})`,
          `${summary.counts.TOO_MUCH} (${percent(summary.counts.TOO_MUCH, summary.total)})`,
          `${summary.counts.NOT_ENOUGH} (${percent(summary.counts.NOT_ENOUGH, summary.total)})`,
        ],
      ],
    );
  }

  // Meals
  section(doc, "Repas");
  if (report.meals.length === 0) {
    muted(doc, "Aucun repas sur cette période.");
  } else {
    const columns: Column[] = [
      { header: "Date", width: 50 },
      { header: "Heure", width: 32 },
      { header: "Moment", width: 50 },
      { header: "Plat", width: width - 412 },
      { header: "Gluc. g", width: 38, align: "right" },
      { header: "U (corr.)", width: 46, align: "right" },
      { header: "Ratio", width: 34, align: "right" },
      { header: `Avant`, width: 38, align: "right" },
      { header: `Après`, width: 38, align: "right" },
      { header: "Résultat", width: 86 },
    ];
    table(
      doc,
      columns,
      report.meals.map((meal) => {
        const cells = exportRow(meal, { unit: report.unit, timeZone: report.timeZone });
        const [date, time, moment, name, carbs, units, correction, ratio, before, after] = cells;
        const tags = cells[13] ? ` (${cells[13]})` : "";
        return [
          (date ?? "").slice(0, 5),
          time ?? "",
          moment ?? "",
          `${name ?? ""}${tags}`,
          carbs ?? "",
          correction ? `${units} (${correction})` : (units ?? ""),
          ratio ?? "",
          before ?? "",
          after ?? "",
          cells[12] ?? "",
        ];
      }),
      8,
    );
    doc.moveDown(0.4);
    muted(doc, `Glycémies en ${unitLabel}. « U (corr.) » : unités totales (dont correction).`);
  }

  // Footer on every page
  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const bottom = doc.page.height - MARGIN + 4;
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor(SOFT);
    doc.text(
      "Données saisies par la patiente dans GlucoPerso, à titre indicatif.",
      MARGIN,
      bottom,
      { width: width - 60, lineBreak: false },
    );
    doc.text(`${index + 1} / ${range.count}`, MARGIN + width - 60, bottom, {
      width: 60,
      align: "right",
      lineBreak: false,
    });
  }

  doc.end();
  return done;
}

function section(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 60);
  doc.moveDown(1.1);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(ACCENT).text(pdfText(title), MARGIN);
  doc.moveDown(0.35);
}

function muted(doc: PDFKit.PDFDocument, text: string) {
  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(SOFT).text(pdfText(text), MARGIN);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function table(doc: PDFKit.PDFDocument, columns: Column[], rows: string[][], fontSize = 9) {
  const padding = 4;
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  const drawRow = (cells: string[], options: { header?: boolean; fill?: string }) => {
    doc.font(options.header ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
    const texts = cells.map((cell) => pdfText(cell));
    const height =
      Math.max(
        ...texts.map((text, index) =>
          doc.heightOfString(text || " ", { width: (columns[index]?.width ?? 40) - padding * 2 }),
        ),
      ) +
      padding * 2;
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      if (!options.header) {
        drawRow(
          columns.map((column) => column.header),
          { header: true, fill: HEAD_FILL },
        );
      }
      doc.font(options.header ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
    }
    const top = doc.y;
    if (options.fill) doc.rect(MARGIN, top, totalWidth, height).fill(options.fill);
    let x = MARGIN;
    texts.forEach((text, index) => {
      const column = columns[index];
      if (!column) return;
      doc.fillColor(options.header ? SOFT : INK).text(text, x + padding, top + padding, {
        width: column.width - padding * 2,
        align: column.align ?? "left",
      });
      x += column.width;
    });
    doc
      .moveTo(MARGIN, top + height)
      .lineTo(MARGIN + totalWidth, top + height)
      .lineWidth(0.5)
      .strokeColor(LINE)
      .stroke();
    doc.x = MARGIN;
    doc.y = top + height;
  };

  drawRow(
    columns.map((column) => column.header),
    { header: true, fill: HEAD_FILL },
  );
  rows.forEach((row, index) => drawRow(row, { fill: index % 2 ? ZEBRA : undefined }));
}
