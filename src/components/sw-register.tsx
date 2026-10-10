"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker (public/sw.js), production only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Offline support is a nice-to-have: the app works without it.
    });
  }, []);
  return null;
}
