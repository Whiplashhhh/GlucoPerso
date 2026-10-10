"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Toast } from "@/components/toast";
import {
  type OfflineConfig,
  clearOfflineConfig,
  listQueue,
  offlineStorageAvailable,
  removeFromQueue,
  saveOfflineConfig,
} from "@/lib/offline/store";
import { SYNC_BATCH } from "@/lib/validation/offline";
import { syncOfflineMealsAction } from "@/server/actions/offline";

/**
 * Signed in and online: keeps what the offline form needs on this device and
 * sends the meals noted offline to her journal (now, and whenever the network
 * comes back).
 */
export function OfflineSync({ config }: { config: OfflineConfig }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const syncing = useRef(false);
  const { publicKey, userId, glucoseUnit } = config;

  useEffect(() => {
    if (!offlineStorageAvailable()) return;
    let active = true;

    async function flush() {
      if (syncing.current || !navigator.onLine) return;
      syncing.current = true;
      let saved = 0;
      try {
        const queue = await listQueue();
        for (let start = 0; start < queue.length; start += SYNC_BATCH) {
          const batch = queue
            .slice(start, start + SYNC_BATCH)
            .map(({ id, epk, iv, ct }) => ({ id, epk, iv, ct }));
          const result = await syncOfflineMealsAction(batch);
          if (!result.ok || !result.data) break;
          // Meals of another account stay on the device until they sign in.
          const settled = result.data.results.filter((item) => item.status !== "other-account");
          await removeFromQueue(settled.map((item) => item.id));
          saved += settled.filter((item) => item.status === "saved").length;
        }
      } catch {
        // Network dropped again: the queue stays, next try on « online ».
      } finally {
        syncing.current = false;
      }
      if (saved && active) {
        setMessage(
          saved > 1
            ? `${saved} repas notés hors ligne ont rejoint ton carnet ✨`
            : "Ton repas noté hors ligne a rejoint ton carnet ✨",
        );
        router.refresh();
      }
    }

    saveOfflineConfig({ publicKey, userId, glucoseUnit })
      .catch(() => undefined)
      .then(flush);
    window.addEventListener("online", flush);
    return () => {
      active = false;
      window.removeEventListener("online", flush);
    };
  }, [publicKey, userId, glucoseUnit, router]);

  return message ? <Toast message={message} onDone={() => setMessage(null)} /> : null;
}

/**
 * Signed-out pages: nobody can note meals offline for an account no longer
 * signed in on this device. Meals already waiting stay, for her next sign-in.
 */
export function ForgetOfflineAccount() {
  useEffect(() => {
    if (offlineStorageAvailable()) clearOfflineConfig().catch(() => undefined);
  }, []);
  return null;
}
