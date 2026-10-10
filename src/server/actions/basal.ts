"use server";

import { revalidatePath } from "next/cache";
import { dayKey } from "@/lib/dates";
import { localDateTime } from "@/lib/period";
import { basalSchema } from "@/lib/validation/settings";
import { type ActionState, fieldErrorsOf } from "@/server/action-state";
import { deleteBasal, upsertBasal } from "@/server/repos/basal";
import { requireAppUser } from "@/server/session";

/** « Lente faite aujourd'hui ✓ »: the day is always today in her timezone. */
export async function logBasalAction(input: unknown): Promise<ActionState> {
  const { user, settings } = await requireAppUser();
  const parsed = basalSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const day = dayKey(new Date(), settings.timezone);
  const takenAt = localDateTime(day, parsed.data.time, settings.timezone);
  await upsertBasal(user.id, day, parsed.data.units, takenAt);
  revalidatePath("/");
  return { ok: true };
}

export async function undoBasalAction(): Promise<ActionState> {
  const { user, settings } = await requireAppUser();
  await deleteBasal(user.id, dayKey(new Date(), settings.timezone));
  revalidatePath("/");
  return { ok: true };
}
