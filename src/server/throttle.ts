import "server-only";
import { db } from "@/lib/db";
import { FAILURE_MEMORY_MS, formatWait, lockoutDurationMs } from "@/lib/security/lockout";

export class LockedError extends Error {
  constructor(public readonly retryInMs: number) {
    super(`Trop d'essais d'un coup. On souffle un peu : réessaie dans ${formatWait(retryInMs)} 🌿`);
    this.name = "LockedError";
  }
}

/** Throws LockedError while the key is locked. */
export async function assertNotLocked(key: string, now = new Date()): Promise<void> {
  const entry = await db.authThrottle.findUnique({ where: { key } });
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    throw new LockedError(entry.lockedUntil.getTime() - now.getTime());
  }
}

export async function registerFailure(key: string, now = new Date()): Promise<void> {
  const entry = await db.authThrottle.findUnique({ where: { key } });
  const stale = !entry || now.getTime() - entry.updatedAt.getTime() > FAILURE_MEMORY_MS;
  const failures = (stale ? 0 : entry.failures) + 1;
  const lockMs = lockoutDurationMs(failures);
  const lockedUntil = lockMs > 0 ? new Date(now.getTime() + lockMs) : null;
  await db.authThrottle.upsert({
    where: { key },
    create: { key, failures, lockedUntil },
    update: { failures, lockedUntil },
  });
}

export async function registerSuccess(key: string): Promise<void> {
  await db.authThrottle.deleteMany({ where: { key } });
}

/** Simple fixed-budget limiter for actions outside Better Auth (sign-up, recovery). */
export async function consumeAttempt(key: string, now = new Date()): Promise<void> {
  await assertNotLocked(key, now);
  await registerFailure(key, now);
}
