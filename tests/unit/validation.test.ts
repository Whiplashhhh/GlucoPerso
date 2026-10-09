import { describe, expect, it } from "vitest";
import { recoverSchema, registerSchema } from "@/lib/validation/auth";
import { decimal, email, timezone } from "@/lib/validation/common";
import { onboardingSchema } from "@/lib/validation/settings";

describe("common validation", () => {
  it("accepts comma decimals", () => {
    expect(decimal.parse("4,5")).toBe(4.5);
    expect(decimal.parse(12)).toBe(12);
    expect(decimal.safeParse("").success).toBe(false);
    expect(decimal.safeParse("abc").success).toBe(false);
  });

  it("normalises emails", () => {
    expect(email.parse("  Lea@Example.ORG ")).toBe("lea@example.org");
    expect(email.safeParse("lea@").success).toBe(false);
  });

  it("checks timezones", () => {
    expect(timezone.safeParse("Europe/Paris").success).toBe(true);
    expect(timezone.safeParse("Mars/Olympus").success).toBe(false);
  });
});

describe("auth validation", () => {
  it("requires a 10+ character password", () => {
    const base = { name: "Léa", email: "lea@example.org", inviteCode: "" };
    expect(registerSchema.safeParse({ ...base, password: "court" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "une jolie phrase" }).success).toBe(true);
  });

  it("validates recovery input", () => {
    expect(
      recoverSchema.safeParse({
        email: "lea@example.org",
        code: "K7QF-9XMB-2RTA",
        password: "nouveau mot",
      }).success,
    ).toBe(true);
    expect(
      recoverSchema.safeParse({ email: "lea@example.org", code: "123", password: "x" }).success,
    ).toBe(false);
  });
});

describe("onboarding validation", () => {
  const valid = {
    name: "Léa",
    glucoseUnit: "G_L",
    penIncrement: 0.5,
    defaultRatio: 12,
    usePerMomentRatios: true,
    momentRatios: { DINNER: 14 },
    hypoThreshold: 0.7,
    timezone: "Europe/Paris",
  };

  it("accepts a complete onboarding", () => {
    expect(onboardingSchema.parse(valid).momentRatios).toEqual({ DINNER: 14 });
  });

  it("rejects out-of-range values", () => {
    expect(onboardingSchema.safeParse({ ...valid, penIncrement: 2 }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, defaultRatio: 0 }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, hypoThreshold: 2 }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, momentRatios: { BRUNCH: 10 } }).success).toBe(
      false,
    );
  });
});
