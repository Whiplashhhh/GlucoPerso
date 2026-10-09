/** Failed attempts allowed before the first lock. */
export const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 60 * 60_000;
/** Failure history is forgotten after a quiet day. */
export const FAILURE_MEMORY_MS = 24 * 60 * 60_000;

/**
 * Progressive lockout: nothing for the first attempts, then 30 s, 1 min,
 * 2 min… doubling up to one hour.
 */
export function lockoutDurationMs(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  const exponent = failures - FREE_ATTEMPTS;
  return Math.min(BASE_LOCK_MS * 2 ** exponent, MAX_LOCK_MS);
}

export function formatWait(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (ms < 60_000) return "quelques secondes";
  return minutes === 1 ? "une minute" : `${minutes} minutes`;
}
