"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { subscribePushAction, unsubscribePushAction } from "@/server/actions/push";

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function sameKey(current: ArrayBuffer | null, expected: Uint8Array) {
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === expected.length && bytes.every((byte, i) => byte === expected[i]);
}

/** iPhone/iPad Safari only offers push to apps added to the home screen. */
function needsInstall() {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/** Stops this device's reminders (on sign-out). Never throws. */
export async function forgetPushOnThisDevice() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;
    await unsubscribePushAction({ endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  } catch {
    // Best effort: the server also drops subscriptions the browser rejects.
  }
}

async function saveSubscription(subscription: PushSubscription) {
  const result = await subscribePushAction(subscription.toJSON());
  if (!result.ok) throw new Error(result.error);
}

/** « Rappel 2 h après le repas » for this device (Web Push, see public/sw.js). */
export function ReminderToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<State> => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return needsInstall() ? "install" : "unsupported";
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return "unsupported";
      if (Notification.permission === "denied") return "denied";
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription || Notification.permission !== "granted") return "off";
      const key = keyBytes(publicKey);
      if (!sameKey(subscription.options.applicationServerKey, key)) {
        // The server key changed (new secret): subscribe again with the new one.
        await subscription.unsubscribe();
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
      }
      // Re-sends it in case the server forgot it (expired, other account…).
      await saveSubscription(subscription);
      return "on";
    })()
      .catch((): State => "off")
      .then((next) => {
        if (!cancelled) setState(next);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function toggle(enable: boolean) {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      if (enable) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(publicKey),
        });
        await saveSubscription(subscription);
        setState("on");
      } else {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await unsubscribePushAction({ endpoint: subscription.endpoint });
          await subscription.unsubscribe();
        }
        setState("off");
      }
    } catch {
      setError("Oups, ça n'a pas marché. Réessaie dans un instant ?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-surface px-5 py-5 shadow-soft">
      <Switch
        label="Rappel 2 h après le repas"
        description="Une petite notification « Comment ça s'est passé ? » sur cet appareil, sauf si tu as déjà répondu."
        checked={state === "on"}
        onChange={(checked) => {
          if (!busy && (state === "on" || state === "off")) void toggle(checked);
        }}
      />
      {state === "install" && (
        <Notice>
          Sur iPhone, ajoute d&apos;abord GlucoPerso à ton écran d&apos;accueil (Partager → Sur
          l&apos;écran d&apos;accueil), puis ouvre-le depuis là pour activer les rappels.
        </Notice>
      )}
      {state === "unsupported" && (
        <Notice>Ce navigateur ne sait pas recevoir de notifications.</Notice>
      )}
      {state === "denied" && (
        <Notice tone="warm">
          Les notifications sont bloquées pour GlucoPerso. Tu peux les autoriser dans les réglages
          de ton téléphone ou de ton navigateur.
        </Notice>
      )}
      {error && <Notice tone="warm">{error}</Notice>}
    </div>
  );
}
