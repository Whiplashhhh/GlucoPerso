"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { Envelope } from "@/lib/offline/envelope";
import { type RatioTable, resolveRatio } from "@/lib/moments";
import { offlinePayloadSchema, syncInputSchema } from "@/lib/validation/offline";
import type { ActionState } from "@/server/action-state";
import { openEnvelope } from "@/server/offline/envelope";
import { offlineKeyPair } from "@/server/offline/keys";
import { createMeal, hasClientMeal } from "@/server/repos/meals";
import { getRatioTable } from "@/server/repos/settings";
import { requireAppUser } from "@/server/session";

/**
 * saved: in her journal (now or by an earlier sync), drop it from the device.
 * rejected: unreadable or invalid, drop it too (it can never be saved).
 * other-account: noted while someone else was signed in, keep it for them.
 */
export type SyncStatus = "saved" | "rejected" | "other-account";

/** Saves meals noted offline (sealed envelopes) into her journal. */
export async function syncOfflineMealsAction(
  input: unknown,
): Promise<ActionState<{ results: { id: string; status: SyncStatus }[] }>> {
  const { user } = await requireAppUser();
  const parsed = syncInputSchema.safeParse(input);
  if (!parsed.success) return { error: "File d'attente illisible." };

  const ratios = await getRatioTable(user.id);
  const results: { id: string; status: SyncStatus }[] = [];
  for (const envelope of parsed.data) {
    results.push({ id: envelope.id, status: await saveEnvelope(user.id, envelope, ratios) });
  }
  if (results.some((result) => result.status === "saved")) revalidatePath("/", "layout");
  return { ok: true, data: { results } };
}

async function saveEnvelope(
  userId: string,
  envelope: Envelope,
  ratios: RatioTable,
): Promise<SyncStatus> {
  let opened: unknown;
  try {
    opened = openEnvelope(offlineKeyPair().privateKey, envelope);
  } catch {
    return "rejected";
  }
  const payload = offlinePayloadSchema.safeParse(opened);
  if (!payload.success) return "rejected";
  if (payload.data.userId !== userId) return "other-account";
  if (await hasClientMeal(userId, envelope.id)) return "saved";

  const meal = { ...payload.data.meal, photoId: null };
  const ratio = resolveRatio(meal.moment, ratios)?.gramsPerUnit ?? null;
  try {
    await createMeal(userId, meal, ratio, envelope.id);
  } catch (error) {
    // Two syncs racing for the same meal: the other one saved it.
    const duplicate =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!duplicate) throw error;
  }
  return "saved";
}
