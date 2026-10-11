import { createECDH } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sealEnvelope } from "@/lib/offline/envelope";
import { openEnvelope } from "@/server/offline/envelope";

function serverKeys() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { publicKey: ecdh.getPublicKey("base64url"), privateKey: ecdh.getPrivateKey() };
}

const payload = { v: 1, userId: "u1", meal: { name: "Crêpes 🥞", carbsGrams: 40 } };

describe("offline envelope", () => {
  it("is sealed in the browser and opened only by the server", async () => {
    const server = serverKeys();
    const envelope = await sealEnvelope(server.publicKey, payload);
    expect(envelope.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Buffer.from(envelope.ct, "base64url").toString("utf8")).not.toContain("Cr");
    expect(openEnvelope(server.privateKey, envelope)).toEqual(payload);
  });

  it("uses a fresh key and IV every time", async () => {
    const server = serverKeys();
    const a = await sealEnvelope(server.publicKey, payload);
    const b = await sealEnvelope(server.publicKey, payload);
    expect(a.epk).not.toBe(b.epk);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("refuses another server's key and any tampering", async () => {
    const server = serverKeys();
    const envelope = await sealEnvelope(server.publicKey, payload);
    expect(() => openEnvelope(serverKeys().privateKey, envelope)).toThrow();

    const bytes = Buffer.from(envelope.ct, "base64url");
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    expect(() =>
      openEnvelope(server.privateKey, { ...envelope, ct: bytes.toString("base64url") }),
    ).toThrow();
    expect(() => openEnvelope(server.privateKey, { ...envelope, ct: "AAAA" })).toThrow();
  });
});
