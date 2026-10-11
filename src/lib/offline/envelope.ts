/**
 * Sealed envelope for meals noted offline (ECIES-style, WebCrypto only).
 *
 * The device encrypts for the server's P-256 public key with a fresh ephemeral
 * key: ECDH → HKDF-SHA-256 → AES-256-GCM. It keeps no key able to decrypt, so
 * what waits in IndexedDB is unreadable on the phone itself; only the server
 * opens it (src/server/offline/envelope.ts).
 */

export const ENVELOPE_INFO = "glucoperso offline meal v1";

export type Envelope = {
  /** Random id, also the meal's `clientId`: a replayed sync never duplicates it. */
  id: string;
  /** Ephemeral public key, raw uncompressed P-256, base64url. */
  epk: string;
  iv: string;
  /** AES-GCM ciphertext followed by its 16-byte tag, base64url. */
  ct: string;
};

export function toBase64url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Encrypts `payload` (JSON) for the server whose raw public key is `serverKey`. */
export async function sealEnvelope(serverKey: string, payload: unknown): Promise<Envelope> {
  const { subtle } = globalThis.crypto;
  const server = await subtle.importKey(
    "raw",
    fromBase64url(serverKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ephemeral = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, [
    "deriveBits",
  ]);
  const shared = await subtle.deriveBits(
    { name: "ECDH", public: server },
    ephemeral.privateKey,
    256,
  );
  const epk = new Uint8Array(await subtle.exportKey("raw", ephemeral.publicKey));
  const hkdf = await subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  const key = await subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: epk, info: new TextEncoder().encode(ENVELOPE_INFO) },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    id: globalThis.crypto.randomUUID(),
    epk: toBase64url(epk),
    iv: toBase64url(iv),
    ct: toBase64url(ct),
  };
}
