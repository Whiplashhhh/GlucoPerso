import { mealsCsv } from "@/lib/export/meals";
import { parseDateRange } from "@/lib/period";
import { attachment, badRequest, exportOwner, unauthorized } from "@/server/export/respond";
import { mealsForExport } from "@/server/repos/export";

/** Meals of a period as a `;`-separated CSV for French Excel. */
export async function GET(request: Request) {
  const owner = await exportOwner();
  if (!owner) return unauthorized();
  const { searchParams } = new URL(request.url);
  const parsed = parseDateRange(
    { from: searchParams.get("from"), to: searchParams.get("to") },
    owner.settings.timezone,
  );
  if (!parsed.ok) return badRequest(parsed.error);
  const { from, to, start, end } = parsed.range;

  const meals = await mealsForExport(owner.user.id, start, end);
  const csv = mealsCsv(meals, {
    unit: owner.settings.glucoseUnit,
    timeZone: owner.settings.timezone,
  });
  return attachment(csv, "text/csv; charset=utf-8", `glucoperso-repas-${from}-au-${to}.csv`);
}
