/** Authentication storage: password hashing, session rotation, lockout, invites. */
import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { throttleKey } from "@/lib/security/codes";
import { FREE_ATTEMPTS } from "@/lib/security/lockout";
import { claimInvite, createInvite } from "@/server/repos/invites";
import { LockedError, assertNotLocked, registerFailure, registerSuccess } from "@/server/throttle";

const PASSWORD = "une jolie phrase secrète";

async function signUp(email: string) {
  return auth.api.signUpEmail({ body: { name: "Léa", email, password: PASSWORD } });
}

describe("passwords and sessions", () => {
  it("stores passwords with argon2id (OWASP parameters), never in clear", async () => {
    const { user } = await signUp("argon@exemple.test");
    const account = await db.account.findFirstOrThrow({
      where: { userId: user.id, providerId: "credential" },
    });
    expect(account.password).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(account.password).not.toContain(PASSWORD);
  });

  it("issues a brand-new session token on every sign-in", async () => {
    await signUp("rotation@exemple.test");
    const first = await auth.api.signInEmail({
      body: { email: "rotation@exemple.test", password: PASSWORD },
    });
    const second = await auth.api.signInEmail({
      body: { email: "rotation@exemple.test", password: PASSWORD },
    });
    expect(first.token).toBeTruthy();
    expect(second.token).not.toBe(first.token);
    const tokens = await db.session.findMany({ where: { userId: first.user.id } });
    expect(new Set(tokens.map((session) => session.token)).size).toBe(tokens.length);
  });

  it("answers the same way for an unknown email and a wrong password", async () => {
    await signUp("enum@exemple.test");
    const attempt = (email: string, password: string) =>
      auth.api.signInEmail({ body: { email, password } }).then(
        () => "ok",
        (error: { status?: string; body?: { message?: string } }) =>
          `${error.status}:${error.body?.message}`,
      );
    const unknown = await attempt("personne@exemple.test", PASSWORD);
    const wrong = await attempt("enum@exemple.test", "pas le bon mot de passe");
    expect(unknown).not.toBe("ok");
    expect(unknown).toBe(wrong);
  });
});

describe("progressive lockout", () => {
  it("locks after the free attempts and unlocks on success", async () => {
    const key = throttleKey("signin", "lock@exemple.test");
    for (let i = 0; i < FREE_ATTEMPTS - 1; i += 1) await registerFailure(key);
    await expect(assertNotLocked(key)).resolves.toBeUndefined();
    await registerFailure(key);
    await expect(assertNotLocked(key)).rejects.toBeInstanceOf(LockedError);
    await registerSuccess(key);
    await expect(assertNotLocked(key)).resolves.toBeUndefined();
  });

  it("counts every failure of a parallel burst", async () => {
    const key = throttleKey("signin", "burst@exemple.test");
    await Promise.all(Array.from({ length: 20 }, () => registerFailure(key)));
    const entry = await db.authThrottle.findUniqueOrThrow({ where: { key } });
    expect(entry.failures).toBe(20);
    expect(entry.key).not.toContain("burst");
  });
});

describe("invites", () => {
  it("a code can be claimed once, even by parallel sign-ups", async () => {
    const code = await createInvite();
    const results = await Promise.all(Array.from({ length: 10 }, () => claimInvite(code)));
    expect(results.filter(Boolean)).toHaveLength(1);
    const stored = await db.inviteCode.findFirstOrThrow();
    expect(stored.codeHash).not.toContain(code.replace(/-/g, ""));
  });

  it("an expired code is refused", async () => {
    const code = await createInvite({ expiresAt: new Date(Date.now() - 1000) });
    expect(await claimInvite(code)).toBeNull();
  });
});
