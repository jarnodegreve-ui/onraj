"use client";

import { useEffect } from "react";

/**
 * Registreert de service worker globaal bij app-load (alleen in productie, om
 * stale caches tijdens dev te vermijden). Idempotent: dezelfde /sw.js wordt ook
 * door de push-toggle gebruikt — meerdere registraties op dezelfde scope leveren
 * hetzelfde registration-object. Faalveilig en stil.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Stil: registratie kan falen (ondersteuning, netwerk) — geen alarm.
    });
  }, []);

  return null;
}
