import { dayKey, timeIn } from "@/lib/dates";
import { basalStatus } from "@/server/repos/basal";
import { BasalCard } from "./basal-card";

/** Server part of the long-acting card: loads today's log for this user. */
export async function BasalCheck({
  userId,
  timeZone,
  penIncrement,
}: {
  userId: string;
  timeZone: string;
  penIncrement: number;
}) {
  const now = new Date();
  const { today, lastUnits } = await basalStatus(userId, dayKey(now, timeZone));
  return (
    <BasalCard
      key={today ? `${today.units}-${today.takenAt.getTime()}` : "none"}
      today={today ? { units: today.units, time: timeIn(today.takenAt, timeZone) } : null}
      defaultUnits={lastUnits ?? 10}
      step={penIncrement}
      nowTime={timeIn(now, timeZone)}
    />
  );
}
