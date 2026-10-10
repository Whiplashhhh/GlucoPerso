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

/**
 * Counts one failure. The row is locked (`SELECT … FOR UPDATE`) while the
 * new count is computed, so a burst of parallel attempts can't lose
 * increments and every failure weighs on the lockout.
 */
export async function registerFailure(key: string, now = new Date()): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "AuthThrottle" ("key", "failures", "updatedAt")
      VALUES (${key}, 0, ${now})
      ON CONFLICT ("key") DO NOTHING
    `;
    const [entry] = await tx.$queryRaw<{ failures: number; updatedAt: Date }[]>`
      SELECT "failures", "updatedAt" FROM "AuthThrottle" WHERE "key" = ${key} FOR UPDATE
    `;
    const stale = !entry || now.getTime() - entry.updatedAt.getTime() > FAILURE_MEMORY_MS;
    const failures = (stale ? 0 : entry.failures) + 1;
    const lockMs = lockoutDurationMs(failures);
    await tx.authThrottle.update({
      where: { key },
      data: { failures, lockedUntil: lockMs > 0 ? new Date(now.getTime() + lockMs) : null },
    });
  });
}

export async function registerSuccess(key: string): Promise<void> {
  await db.authThrottle.deleteMany({ where: { key } });
}
