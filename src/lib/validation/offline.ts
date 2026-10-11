import { z } from "zod";
import { mealInputSchema } from "@/lib/validation/meal";

const base64url = z.string().regex(/^[A-Za-z0-9_-]+$/);

/** At most this many envelopes per sync call (keeps it far below the 1 MB action limit). */
export const SYNC_BATCH = 20;

export const envelopeSchema = z.object({
  id: z.uuid(),
  // Raw P-256 public key (65 bytes) and AES-GCM IV (12 bytes), base64url.
  epk: base64url.length(87),
  iv: base64url.length(16),
  ct: base64url.min(24).max(12_000),
});

export const syncInputSchema = z.array(envelopeSchema).min(1).max(SYNC_BATCH);

/** What a sealed envelope holds once opened by the server. */
export const offlinePayloadSchema = z.object({
  v: z.literal(1),
  userId: z.string().min(1).max(64),
  meal: mealInputSchema,
});
export type OfflinePayload = z.input<typeof offlinePayloadSchema>;
