/* GlucoPerso service worker: installable app shell + gentle offline page.
 *
 * Health data must never persist in the cache. This worker therefore only
 * stores:
 *   - the public offline page (/hors-ligne) and the static assets it needs;
 *   - immutable build assets (/_next/static/*: JS, CSS, fonts) and icons.
 * It never caches /api/* (photos included), RSC payloads, Server Actions or the
 * HTML of any other page: navigations go to the network and only fall back to
 * the offline page when the network is unreachable.
 *
 * Bump VERSION whenever this file's caching logic or the icons change.
 */
const VERSION = "v2";
const SHELL_CACHE = `gp-shell-${VERSION}`;
const STATIC_CACHE = `gp-static-${VERSION}`;
// Meals noted offline on this page never touch the caches: they wait in
// IndexedDB, encrypted for the server (src/lib/offline/).
const OFFLINE_URL = "/hors-ligne";
const STATIC_MAX_ENTRIES = 150;
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/splash/") ||
      SHELL_ASSETS.includes(url.pathname))
  );
}

/** Stores the offline page (fetched without cookies) and the build assets it references. */
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const response = await fetch(OFFLINE_URL, { cache: "no-store", credentials: "omit" });
  if (!response.ok || response.redirected) throw new Error("Offline page unavailable");
  const html = await response.clone().text();
  const assets = new Set(SHELL_ASSETS);
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
    assets.add(match[1].replace(/&amp;/g, "&"));
  }
  await cache.put(OFFLINE_URL, response);
  await Promise.all(
    [...assets].map(async (asset) => {
      try {
        const res = await fetch(asset, { credentials: "omit" });
        if (res.ok) await cache.put(asset, res);
      } catch {
        // A missing asset only degrades the offline page; keep installing.
      }
    }),
  );
}

async function trimCache(name, maxEntries) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  // Keys come back in insertion order: drop the oldest ones.
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - maxEntries)).map((k) => cache.delete(k)),
  );
}

async function cacheFirst(event) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const response = await fetch(event.request);
  if (response.ok && response.type === "basic") {
    const copy = response.clone();
    event.waitUntil(
      caches
        .open(STATIC_CACHE)
        .then((cache) => cache.put(event.request, copy))
        .then(() => trimCache(STATIC_CACHE, STATIC_MAX_ENTRIES)),
    );
  }
  return response;
}

async function networkThenOffline(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    const offline = await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE });
    return offline ?? Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("gp-") && !keep.has(n)).map((n) => caches.delete(n)),
      );
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkThenOffline(event));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event));
  }
  // Everything else (RSC payloads, data) goes straight to the network.
});
