// GAINLINE service worker — makes the app usable offline once it has been
// opened at least once while online (or served locally).
//
// Strategy: network-first for the app's own files (index.html, style.css,
// app.js, manifest, icons). That means: whenever you're online, you always
// get the newest version — the cache is only a fallback for when the
// network request fails (i.e. you're offline). This avoids the classic PWA
// trap where an old cached build gets served forever even after the real
// files have changed.
const CACHE_NAME = "gainline-cache-v2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Network-first for everything this app touches — same-origin app files
  // and cross-origin assets (e.g. Google Fonts) alike — so you always see
  // the latest version while online, with cache only as an offline fallback.
  event.respondWith(networkFirst(req));
});
