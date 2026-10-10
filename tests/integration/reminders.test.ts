/**
 * « Comment ça s'est passé ? » push reminders: sent once, 2 h after the meal,
 * only while she hasn't answered, and only to her own devices.
 */
import { randomUUID } from "node:crypto";
import webpush from "web-push";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { type PushSender, type PushTarget, sendDueReminders } from "@/server/push/reminders";
import { setMealFeedback, skipMealFeedback, softDeleteMeal } from "@/server/repos/meals";
import { vapidKeys } from "@/server/push/vapid";
import { savePushSubscription } from "@/server/repos/push";
import { addMeal, createUser } from "./fixtures";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

async function subscribe(userId: string) {
  const endpoint = `https://push.example.test/${randomUUID()}`;
  await savePushSubscription(userId, {
    endpoint,
    keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
  });
  return endpoint;
}

/** Records deliveries; `fail` makes chosen endpoints answer with a status code. */
function recorder(fail: Record<string, number> = {}) {
  const sent: { target: PushTarget; payload: Record<string, string> }[] = [];
  const send: PushSender = async (target, payload) => {
    const status = fail[target.endpoint];
    if (status) throw Object.assign(new Error("push"), { statusCode: status });
    sent.push({ target, payload: JSON.parse(payload) });
  };
  const to = (endpoint: string) => sent.filter((item) => item.target.endpoint === endpoint);
  return { send, to };
}

/** A meal eaten 10 minutes ago, logged right away; `at` is 2 h 05 later. */
async function freshMeal(userId: string) {
  const meal = await addMeal(userId, {
    eatenAt: new Date(Date.now() - 10 * MINUTE),
    moment: "LUNCH",
  });
  return { meal, at: new Date(meal.eatenAt.getTime() + 2 * HOUR + 5 * MINUTE) };
}

describe("meal reminders", () => {
  it("sends one reminder 2 h after the meal, without health details", async () => {
    const alice = await createUser("Alice");
    const endpoint = await subscribe(alice.id);
    const { meal, at } = await freshMeal(alice.id);

    const early = recorder();
    await sendDueReminders(early.send, new Date(at.getTime() - 10 * MINUTE));
    expect(early.to(endpoint)).toHaveLength(0);

    const due = recorder();
    await sendDueReminders(due.send, at);
    expect(due.to(endpoint)).toHaveLength(1);
    const { payload } = due.to(endpoint)[0]!;
    expect(payload.title).toBe("Comment ça s'est passé ?");
    expect(payload.body).toMatch(/^Ton déjeuner de \d\d:\d\d/);
    expect(payload.url).toBe(`/retour/${meal.id}`);
    expect(JSON.stringify(payload)).not.toContain(meal.name);

    const again = recorder();
    await sendDueReminders(again.send, new Date(at.getTime() + MINUTE));
    expect(again.to(endpoint)).toHaveLength(0);
    const stored = await db.meal.findUniqueOrThrow({ where: { id: meal.id } });
    expect(stored.reminderSentAt).toEqual(at);
  });

  it("stays quiet when she already answered, skipped or deleted the meal", async () => {
    const alice = await createUser("Alice");
    const endpoint = await subscribe(alice.id);
    const answered = await freshMeal(alice.id);
    await setMealFeedback(alice.id, answered.meal.id, {
      outcome: "PERFECT",
      glucoseAfter: null,
      glucoseLow: null,
      glucoseHigh: null,
      hypoTreated: null,
      outcomeNote: null,
    });
    const skipped = await freshMeal(alice.id);
    await skipMealFeedback(alice.id, skipped.meal.id);
    const deleted = await freshMeal(alice.id);
    await softDeleteMeal(alice.id, deleted.meal.id);

    const { send, to } = recorder();
    await sendDueReminders(send, deleted.at);
    expect(to(endpoint)).toHaveLength(0);
  });

  it("does not ping for a meal logged after the 2 h had passed, nor very old ones", async () => {
    const alice = await createUser("Alice");
    const endpoint = await subscribe(alice.id);
    await addMeal(alice.id, { eatenAt: new Date(Date.now() - 3 * HOUR) });
    const { send, to } = recorder();
    await sendDueReminders(send, new Date());
    await sendDueReminders(send, new Date(Date.now() + 10 * HOUR));
    expect(to(endpoint)).toHaveLength(0);
  });

  it("only reaches her own devices and forgets the ones the browser dropped", async () => {
    const alice = await createUser("Alice");
    const bob = await createUser("Bob");
    const phone = await subscribe(alice.id);
    const oldLaptop = await subscribe(alice.id);
    const bobPhone = await subscribe(bob.id);
    const { at } = await freshMeal(alice.id);

    const { send, to } = recorder({ [oldLaptop]: 410 });
    await sendDueReminders(send, at);
    expect(to(phone)).toHaveLength(1);
    expect(to(bobPhone)).toHaveLength(0);
    expect(await db.pushSubscription.count({ where: { endpoint: oldLaptop } })).toBe(0);
    expect(await db.pushSubscription.count({ where: { endpoint: phone } })).toBe(1);
  });

  it("moves a shared device's subscription to whoever turned reminders on last", async () => {
    const alice = await createUser("Alice");
    const bob = await createUser("Bob");
    const endpoint = await subscribe(alice.id);
    await savePushSubscription(bob.id, {
      endpoint,
      keys: { p256dh: "C".repeat(87), auth: "b".repeat(22) },
    });
    const { at } = await freshMeal(alice.id);
    const { send, to } = recorder();
    await sendDueReminders(send, at);
    expect(to(endpoint)).toHaveLength(0);
  });
});

describe("VAPID keys", () => {
  it("derives a stable key pair that web-push accepts", () => {
    const keys = vapidKeys();
    expect(vapidKeys()).toEqual(keys);
    expect(Buffer.from(keys.publicKey, "base64url")).toHaveLength(65);
    expect(Buffer.from(keys.privateKey, "base64url")).toHaveLength(32);
    const headers = webpush.getVapidHeaders(
      "https://push.example.test",
      "mailto:test@example.org",
      keys.publicKey,
      keys.privateKey,
      "aes128gcm",
    );
    expect(headers.Authorization).toMatch(/^vapid t=.+, k=/);
  });
});
