import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import { timeIn } from "@/lib/dates";
import { MOMENT_LABEL, type RatioMoment } from "@/lib/moments";
import { redactLogMessage } from "@/lib/security/redact";
import { vapidKeys } from "@/server/push/vapid";
import { FEEDBACK_DELAY_MS } from "@/server/repos/meals";

/** A reminder that could not go out on time (server down…) is still sent this late. */
export const REMINDER_GRACE_MS = 2 * 60 * 60 * 1000;
const BATCH = 100;
const INTERVAL_MS = 60 * 1000;

export type PushTarget = { endpoint: string; keys: { p256dh: string; auth: string } };
/** Delivers one payload; rejects with `{ statusCode }` like web-push does. */
export type PushSender = (target: PushTarget, payload: string) => Promise<void>;

export const webPushSender: PushSender = async (target, payload) => {
  const { publicKey, privateKey, subject } = vapidKeys();
  await webpush.sendNotification(target, payload, {
    vapidDetails: { subject, publicKey, privateKey },
    // Past this, the reminder is pointless: drop it rather than deliver it late.
    TTL: REMINDER_GRACE_MS / 1000,
    urgency: "normal",
  });
};

/** What the notification says. No meal name or numbers: it may show on a lock screen. */
export function reminderPayload(
  meal: { id: string; moment: RatioMoment; eatenAt: Date },
  timeZone: string,
) {
  return JSON.stringify({
    title: "Comment ça s'est passé ?",
    body: `Ton ${MOMENT_LABEL[meal.moment].toLowerCase()} de ${timeIn(meal.eatenAt, timeZone)} : un petit retour ?`,
    url: `/retour/${meal.id}`,
    tag: `meal-${meal.id}`,
  });
}

/**
 * Sends the « Comment ça s'est passé ? » push 2 h after each meal, unless she
 * already answered (or skipped) it, deleted the meal, or logged it after the
 * fact. Each meal is claimed atomically, so a reminder goes out at most once
 * even with several server instances. Returns the number of meals reminded.
 */
export async function sendDueReminders(send: PushSender = webPushSender, now = new Date()) {
  const dueBefore = new Date(now.getTime() - FEEDBACK_DELAY_MS);
  const waiting = { outcome: null, feedbackSkipped: false, deletedAt: null, reminderSentAt: null };
  const meals = await db.meal.findMany({
    where: {
      ...waiting,
      eatenAt: { lte: dueBefore, gte: new Date(dueBefore.getTime() - REMINDER_GRACE_MS) },
      user: { pushSubscriptions: { some: {} } },
    },
    orderBy: { eatenAt: "asc" },
    take: BATCH,
    select: {
      id: true,
      moment: true,
      eatenAt: true,
      createdAt: true,
      user: {
        select: {
          settings: { select: { timezone: true } },
          pushSubscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } },
        },
      },
    },
  });

  let reminded = 0;
  for (const meal of meals) {
    // Logged once the 2 h had passed: she can answer right away, no need to ping.
    if (meal.createdAt.getTime() > meal.eatenAt.getTime() + FEEDBACK_DELAY_MS) continue;
    const claimed = await db.meal.updateMany({
      where: { id: meal.id, ...waiting },
      data: { reminderSentAt: now },
    });
    if (claimed.count !== 1) continue;
    reminded += 1;

    const payload = reminderPayload(meal, meal.user.settings?.timezone ?? "Europe/Paris");
    for (const subscription of meal.user.pushSubscriptions) {
      try {
        await send(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // The browser dropped this subscription (uninstalled, permission revoked…).
          await db.pushSubscription.deleteMany({ where: { id: subscription.id } });
        } else {
          console.error(redactLogMessage(`[reminders] push failed (status ${status ?? "?"})`));
        }
      }
    }
  }
  return reminded;
}

declare global {
  var reminderLoop: ReturnType<typeof setInterval> | undefined;
}

/** Checks for due reminders every minute (started once per server, see src/instrumentation.ts). */
export function startReminderLoop() {
  if (globalThis.reminderLoop) return;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await sendDueReminders();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(redactLogMessage(`[reminders] ${message}`));
    } finally {
      running = false;
    }
  };
  globalThis.reminderLoop = setInterval(tick, INTERVAL_MS);
  globalThis.reminderLoop.unref();
}
