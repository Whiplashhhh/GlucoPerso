/**
 * IndexedDB storage for offline entry (browser only).
 *   config: what the offline form needs, written while signed in and online:
 *           the server's public key, her user id and glucose unit. No health data.
 *   queue:  sealed envelopes (src/lib/offline/envelope.ts) waiting to be synced.
 *           The device cannot read them back.
 */
import type { GlucoseUnit } from "@/lib/glucose";
import type { Envelope } from "@/lib/offline/envelope";

export type OfflineConfig = { publicKey: string; userId: string; glucoseUnit: GlucoseUnit };
export type QueuedMeal = Envelope & { queuedAt: string };

const DB_NAME = "glucoperso-offline";
const CONFIG = "config";
const QUEUE = "queue";
const CONFIG_KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(CONFIG);
      request.result.createObjectStore(QUEUE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const request = action(transaction.objectStore(store));
      transaction.oncomplete = () => resolve(request ? request.result : undefined);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export function offlineStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined" && typeof crypto?.subtle !== "undefined";
}

export async function saveOfflineConfig(config: OfflineConfig) {
  await run(CONFIG, "readwrite", (store) => store.put(config, CONFIG_KEY));
}

export async function readOfflineConfig(): Promise<OfflineConfig | null> {
  return (await run<OfflineConfig>(CONFIG, "readonly", (store) => store.get(CONFIG_KEY))) ?? null;
}

export async function clearOfflineConfig() {
  await run(CONFIG, "readwrite", (store) => store.delete(CONFIG_KEY));
}

export async function enqueue(meal: QueuedMeal) {
  await run(QUEUE, "readwrite", (store) => store.add(meal));
}

export async function listQueue(): Promise<QueuedMeal[]> {
  return (await run<QueuedMeal[]>(QUEUE, "readonly", (store) => store.getAll())) ?? [];
}

export async function removeFromQueue(ids: string[]) {
  if (!ids.length) return;
  await run(QUEUE, "readwrite", (store) => {
    for (const id of ids) store.delete(id);
  });
}
