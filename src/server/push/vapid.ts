import "server-only";
import { createECDH, hkdfSync } from "node:crypto";
import { env } from "@/lib/env";

export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

let cached: VapidKeys | undefined;

/**
 * Web Push (VAPID) key pair. Without VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, a
 * P-256 key is derived from BETTER_AUTH_SECRET so reminders work with no extra
 * setup; it stays stable as long as that secret does.
 */
export function vapidKeys(): VapidKeys {
  if (cached) return cached;
  const subject =
    env.VAPID_SUBJECT ||
    (env.BETTER_AUTH_URL.startsWith("https://")
      ? new URL(env.BETTER_AUTH_URL).origin
      : "mailto:glucoperso@example.org");

  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    cached = { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject };
    return cached;
  }
  const secret = Buffer.from(
    hkdfSync("sha256", env.BETTER_AUTH_SECRET, "glucoperso", "web-push vapid p-256", 32),
  );
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(secret);
  cached = {
    publicKey: ecdh.getPublicKey("base64url", "uncompressed"),
    privateKey: secret.toString("base64url"),
    subject,
  };
  return cached;
}
