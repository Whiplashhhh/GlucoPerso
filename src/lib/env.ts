import "server-only";
import { z } from "zod";

const csv = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be 32+ characters"),
  REGISTRATION_MODE: z.enum(["invite", "open", "closed"]).default("invite"),
  PHOTOS_DIR: z.string().min(1).default("./data/photos"),
  TRUSTED_PROXIES: csv,
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_FROM: z.string().default("GlucoPerso <noreply@example.org>"),
  // Web Push keys (base64url). Empty: derived from BETTER_AUTH_SECRET.
  VAPID_PUBLIC_KEY: z.string().default(""),
  VAPID_PRIVATE_KEY: z.string().default(""),
  // Contact sent to push services (mailto: or https:). Empty: BETTER_AUTH_URL.
  VAPID_SUBJECT: z.string().default(""),
});

export type Env = z.infer<typeof schema>;

// `next build` imports server modules to collect page data without any
// runtime secret available; real values are validated when the server starts.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

function load(): Env {
  const source = isBuild
    ? {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://build/build",
        BETTER_AUTH_SECRET:
          process.env.BETTER_AUTH_SECRET || "build-time-placeholder-secret-not-used-at-runtime",
      }
    : process.env;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${fields}. See .env.example.`);
  }
  return parsed.data;
}

export const env = load();

export const smtpEnabled = env.SMTP_HOST.length > 0;
