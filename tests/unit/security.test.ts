import { describe, expect, it } from "vitest";
import { generateCode, hashCode, normalizeCode, throttleKey } from "@/lib/security/codes";
import { UNKNOWN_IP, clientIpFromForwarded } from "@/lib/security/ip";
import { FREE_ATTEMPTS, formatWait, lockoutDurationMs } from "@/lib/security/lockout";
import { redactLogMessage } from "@/lib/security/redact";
import { isSameOrigin } from "@/server/origin";

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

describe("client IP from X-Forwarded-For", () => {
  it("believes a single value written by the proxy", () => {
    expect(clientIpFromForwarded("203.0.113.7")).toBe("203.0.113.7");
    expect(clientIpFromForwarded(" 2001:DB8::1 ")).toBe("2001:db8::1");
  });

  it("never believes a forged chain without trusted proxies", () => {
    expect(clientIpFromForwarded("1.2.3.4, 203.0.113.7")).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded("not-an-ip")).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded("")).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded(null)).toBe(UNKNOWN_IP);
  });

  it("reads the chain from the right, skipping trusted proxies", () => {
    const trusted = ["10.0.0.0/8", "192.0.2.10"];
    // The client forged "1.2.3.4"; the CDN (192.0.2.10) saw 203.0.113.7.
    expect(clientIpFromForwarded("1.2.3.4, 203.0.113.7, 192.0.2.10", trusted)).toBe("203.0.113.7");
    expect(clientIpFromForwarded("203.0.113.7, 10.1.2.3", trusted)).toBe("203.0.113.7");
    expect(clientIpFromForwarded("10.1.2.3", trusted)).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded("garbage, 10.1.2.3", trusted)).toBe(UNKNOWN_IP);
  });
});

describe("same-origin guard for mutating route handlers", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost:3000/api/photos", { method: "POST", headers });

  it("accepts the app's own origin", () => {
    const ok = request({ origin: "http://localhost:3000", host: "localhost:3000" });
    expect(isSameOrigin(ok)).toBe(true);
  });

  it("refuses other origins, a missing Origin and garbage", () => {
    const evil = request({ origin: "https://evil.example", host: "localhost:3000" });
    expect(isSameOrigin(evil)).toBe(false);
    expect(isSameOrigin(request({ host: "localhost:3000" }))).toBe(false);
    expect(isSameOrigin(request({ origin: "null", host: "localhost:3000" }))).toBe(false);
  });
});

describe("log redaction", () => {
  it("masks email addresses and cuts long messages", () => {
    expect(redactLogMessage("Sign-up attempt for existing email: lea.martin+gp@exemple.org")).toBe(
      "Sign-up attempt for existing email: [email]",
    );
    expect(redactLogMessage("<lea@exemple.org>")).toBe("<[email]>");
    expect(redactLogMessage("x".repeat(500))).toHaveLength(301);
  });
});
