import { describe, expect, it } from "vitest";
import { generateCode, hashCode, normalizeCode, throttleKey } from "@/lib/security/codes";
import { FREE_ATTEMPTS, formatWait, lockoutDurationMs } from "@/lib/security/lockout";

describe("codes", () => {
  it("generates readable grouped codes without ambiguous letters", () => {
    const code = generateCode();
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(new Set(Array.from({ length: 50 }, () => generateCode())).size).toBe(50);
  });

  it("normalises what people type", () => {
    expect(normalizeCode(" ab0o-il1u ")).toBe("AB00111V");
    expect(hashCode("k7qf-9xmb-2rta")).toBe(hashCode("K7QF9XMB2RTA"));
    expect(hashCode("AAAA-AAAA-AAAA")).not.toBe(hashCode("AAAA-AAAA-AAAB"));
  });

  it("never keeps raw emails in throttle keys", () => {
    const key = throttleKey("signin", " Lea@Example.org ");
    expect(key).toBe(throttleKey("signin", "lea@example.org"));
    expect(key).not.toContain("lea");
    expect(key.startsWith("signin:")).toBe(true);
  });
});

describe("progressive lockout", () => {
  it("lets the first attempts through", () => {
    for (let failures = 0; failures < FREE_ATTEMPTS; failures += 1) {
      expect(lockoutDurationMs(failures)).toBe(0);
    }
  });

  it("doubles the lock up to one hour", () => {
    expect(lockoutDurationMs(FREE_ATTEMPTS)).toBe(30_000);
    expect(lockoutDurationMs(FREE_ATTEMPTS + 1)).toBe(60_000);
    expect(lockoutDurationMs(FREE_ATTEMPTS + 2)).toBe(120_000);
    expect(lockoutDurationMs(FREE_ATTEMPTS + 20)).toBe(3_600_000);
  });

  it("explains the wait kindly", () => {
    expect(formatWait(20_000)).toBe("quelques secondes");
    expect(formatWait(60_000)).toBe("une minute");
    expect(formatWait(150_000)).toBe("3 minutes");
  });
});
