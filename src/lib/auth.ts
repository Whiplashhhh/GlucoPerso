import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { env, smtpEnabled } from "@/lib/env";
import { throttleKey } from "@/lib/security/codes";
import { redactLogMessage } from "@/lib/security/redact";
import { sendPasswordResetEmail } from "@/server/mailer";
import { LockedError, assertNotLocked, registerFailure, registerSuccess } from "@/server/throttle";

/** OWASP-recommended argon2id parameters. */
const ARGON2 = {
  // Algorithm.Argon2id (ambient const enum, unusable with isolatedModules).
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const SIGN_IN_PATH = "/sign-in/email";

function emailFromBody(body: unknown): string {
  if (body && typeof body === "object" && "email" in body && typeof body.email === "string") {
    return body.email;
  }
  return "";
}

export const auth = betterAuth({
  appName: "GlucoPerso",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  telemetry: { enabled: false },
  // Errors only, emails masked, extra arguments (request bodies, user
  // objects…) never printed.
  logger: {
    level: "error",
    log: (level, message) => console.error(`[auth] ${level}: ${redactLogMessage(message)}`),
  },
  // HTTP endpoints the app doesn't use: less surface for a stolen session.
  // (Sign-up stays reachable only to answer 403, see the hook below.)
  disabledPaths: [
    "/update-user",
    "/change-email",
    "/change-password",
    "/delete-user",
    "/delete-user/callback",
    "/verify-password",
    "/update-session",
    "/send-verification-email",
    "/verify-email",
    "/sign-in/social",
    "/link-social",
    "/unlink-account",
    "/list-accounts",
    "/account-info",
    "/refresh-token",
    "/get-access-token",
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: (password) => hash(password, ARGON2),
      verify: ({ hash: digest, password }) => verify(digest, password),
    },
    ...(smtpEnabled && {
      sendResetPassword: async ({ user, url }) => sendPasswordResetEmail(user.email, url),
      resetPasswordTokenExpiresIn: 60 * 60,
    }),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 120,
    customRules: {
      [SIGN_IN_PATH]: { window: 60, max: 6 },
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    ipAddress: env.TRUSTED_PROXIES.length ? { trustedProxies: env.TRUSTED_PROXIES } : undefined,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Accounts are only created by the register server action, which
      // enforces REGISTRATION_MODE and invite codes. The public endpoint is
      // closed to direct HTTP calls.
      if (ctx.path === "/sign-up/email" && ctx.request) {
        throw new APIError("FORBIDDEN", { message: "Inscription indisponible." });
      }
      if (ctx.path === SIGN_IN_PATH) {
        try {
          await assertNotLocked(throttleKey("signin", emailFromBody(ctx.body)));
        } catch (error) {
          if (error instanceof LockedError) {
            throw new APIError("TOO_MANY_REQUESTS", { message: error.message });
          }
          throw error;
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== SIGN_IN_PATH) return;
      const key = throttleKey("signin", emailFromBody(ctx.body));
      if (ctx.context.newSession) await registerSuccess(key);
      else await registerFailure(key);
    }),
  },
  // nextCookies must stay last so Server Actions can set the session cookie.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
