import "server-only";
import { createECDH, hkdfSync } from "node:crypto";
import { env } from "@/lib/env";

let cached: { publicKey: string; privateKey: Buffer } | undefined;

/**
 * P-256 key pair the offline queue is encrypted for, derived from
 * BETTER_AUTH_SECRET. Changing that secret leaves meals still waiting on a
 * device unreadable (the sync then drops them).
 */
export function offlineKeyPair() {
  if (cached) return cached;
  const privateKey = Buffer.from(
    hkdfSync("sha256", env.BETTER_AUTH_SECRET, "glucoperso", "offline queue p-256", 32),
  );
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(privateKey);
  cached = { publicKey: ecdh.getPublicKey("base64url", "uncompressed"), privateKey };
  return cached;
}
