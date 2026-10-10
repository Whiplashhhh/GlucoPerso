import { parseDateRange } from "@/lib/period";
import { buildReportPdf } from "@/server/export/pdf";
import { attachment, badRequest, exportOwner, unauthorized } from "@/server/export/respond";
import { mealsForExport, ratioChangesBetween } from "@/server/repos/export";
import { getRatioTable } from "@/server/repos/settings";

/** A4 report of a period for the diabetologist. */
export async function GET(request: Request) {
  const owner = await exportOwner();
  if (!owner) return unauthorized();
  const { searchParams } = new URL(request.url);
  const { timezone, glucoseUnit } = owner.settings;
  const parsed = parseDateRange(
    { from: searchParams.get("from"), to: searchParams.get("to") },
    timezone,
  );
  if (!parsed.ok) return badRequest(parsed.error);
  const { from, to, start, end } = parsed.range;

  const [meals, changes, ratios] = await Promise.all([
    mealsForExport(owner.user.id, start, end),
    ratioChangesBetween(owner.user.id, start, end),
    getRatioTable(owner.user.id),
  ]);
  const pdf = await buildReportPdf({
    name: owner.user.name,
    from,
    to,
    unit: glucoseUnit,
    timeZone: timezone,
    ratios,
    changes,
    meals,
  });
  return attachment(new Uint8Array(pdf), "application/pdf", `glucoperso-${from}-au-${to}.pdf`);
}
