"use server";

import { pushEndpointSchema, pushSubscriptionSchema } from "@/lib/validation/push";
import type { ActionState } from "@/server/action-state";
import { deletePushSubscription, savePushSubscription } from "@/server/repos/push";
import { requireAppUser } from "@/server/session";

/** Turns meal reminders on for this device (idempotent: also refreshes its keys). */
export async function subscribePushAction(input: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "Ce navigateur a renvoyé un abonnement invalide." };
  await savePushSubscription(user.id, parsed.data);
  return { ok: true };
}

export async function unsubscribePushAction(input: unknown): Promise<ActionState> {
  const { user } = await requireAppUser();
  const parsed = pushEndpointSchema.safeParse(input);
  if (!parsed.success) return { error: "Abonnement inconnu." };
  await deletePushSubscription(user.id, parsed.data.endpoint);
  return { ok: true };
}
