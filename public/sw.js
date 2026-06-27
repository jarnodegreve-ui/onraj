// ONRAJ service worker — offline-shell + push-meldingen.
// Bump CACHE_VERSION bij elke wijziging aan dit bestand of de precache-assets,
// zodat oude caches bij activatie worden opgeruimd.

const CACHE_VERSION = "onraj-v1";
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_ICONS = ["/icon-192.png", "/icon-512.png"];

// ── Install: leg de offline-shell vast ───────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then(async (cache) => {
      // De offline-pagina is de kern van de shell: apart cachen zodat één
      // ontbrekend icoon (addAll is alles-of-niets) deze niet meesleurt.
      await cache.add(OFFLINE_URL).catch(() => {});
      await cache.addAll(PRECACHE_ICONS).catch(() => {});
    }),
  );
  self.skipWaiting();
});

// ── Activate: ruim oude cache-versies op ─────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) => key.startsWith("onraj-") && !key.startsWith(CACHE_VERSION),
          )
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// ── Fetch: hybride strategie ─────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // mutaties altijd naar het netwerk

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // extern (Supabase) → netwerk
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return; // auth/data nooit cachen
  }

  // Navigatie (HTML): network-first, val terug op de offline-pagina. Niet
  // cachen — privé data blijft zo altijd vers.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((res) => res ?? Response.error()),
      ),
    );
    return;
  }

  // Statische assets: cache-first met runtime-vulling.
  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME).then((cache) => cache.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
});

// ── Push-meldingen (ongewijzigd behouden) ────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "ONRAJ";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
