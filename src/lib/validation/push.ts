import { z } from "zod";

const base64url = z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/, "Clé invalide");
const endpoint = z.url({ protocol: /^https$/ }).max(2048);

/** A browser PushSubscription, as returned by `subscription.toJSON()`. */
export const pushSubscriptionSchema = z.object({
  endpoint,
  keys: z.object({
    p256dh: base64url.min(80).max(100),
    auth: base64url.min(16).max(32),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const pushEndpointSchema = z.object({ endpoint });
