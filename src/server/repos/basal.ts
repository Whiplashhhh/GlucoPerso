import "server-only";
import { db } from "@/lib/db";

/** Today's long-acting log and the last units she took (to prefill). */
export async function basalStatus(userId: string, day: string) {
  const [today, last] = await Promise.all([
    db.basalLog.findUnique({ where: { userId_day: { userId, day } } }),
    db.basalLog.findFirst({ where: { userId }, orderBy: { day: "desc" }, select: { units: true } }),
  ]);
  return { today, lastUnits: last?.units ?? null };
}

/** One log per local day: a new tap replaces the day's entry. */
export async function upsertBasal(userId: string, day: string, units: number, takenAt: Date) {
  return db.basalLog.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, units, takenAt },
    update: { units, takenAt },
  });
}

export async function deleteBasal(userId: string, day: string): Promise<void> {
  await db.basalLog.deleteMany({ where: { userId, day } });
}
