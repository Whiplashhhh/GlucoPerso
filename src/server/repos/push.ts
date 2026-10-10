import "server-only";
import { db } from "@/lib/db";
import type { PushSubscriptionInput } from "@/lib/validation/push";

/**
 * Saves this device's subscription for her. An endpoint belongs to one browser:
 * if another account had it (shared device), it moves to her.
 */
export async function savePushSubscription(userId: string, input: PushSubscriptionInput) {
  const data = { userId, p256dh: input.keys.p256dh, auth: input.keys.auth };
  await db.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: { endpoint: input.endpoint, ...data },
    update: data,
  });
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
}
