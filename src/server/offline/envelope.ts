import "server-only";
import { createDecipheriv, createECDH, hkdfSync } from "node:crypto";
import { ENVELOPE_INFO, type Envelope } from "@/lib/offline/envelope";

const TAG_BYTES = 16;

/**
 * Opens an envelope sealed by `sealEnvelope` (src/lib/offline/envelope.ts).
 * Throws when it was not made for this key or was tampered with.
 */
export function openEnvelope(privateKey: Buffer, envelope: Envelope): unknown {
  const epk = Buffer.from(envelope.epk, "base64url");
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(privateKey);
  const shared = ecdh.computeSecret(epk);
  const key = Buffer.from(hkdfSync("sha256", shared, epk, ENVELOPE_INFO, 32));
  const data = Buffer.from(envelope.ct, "base64url");
  if (data.length <= TAG_BYTES) throw new Error("Envelope too short");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64url"));
  decipher.setAuthTag(data.subarray(data.length - TAG_BYTES));
  const plaintext = Buffer.concat([
    decipher.update(data.subarray(0, data.length - TAG_BYTES)),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8"));
}
