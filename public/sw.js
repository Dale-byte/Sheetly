// Sheetly service worker.
// Pre-caches the shell + the static budget app so the PWA works offline.
// Bump VERSION whenever the precache list or app assets change.
const VERSION = "v1";
const CACHE = `sheetly-${VERSION}`;
const BASE = "/sheetly";

const PRECACHE = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/404.html`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/budget/`,
  `${BASE}/budget/index.html`,
  `${BASE}/budget/styles.css?v=mob-7`,
  `${BASE}/budget/app.js?v=mob-7`,
  `${BASE}/budget/sync.js`,
  `${BASE}/budget/calculator.js?v=2`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/icon-maskable-512.png`,
  `${BASE}/icons/apple-touch-icon.png`,
  `${BASE}/icons/icon.svg`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // SPA navigations: network first, fall back to the cached shell offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match(`${BASE}/`)),
        ),
    );
    return;
  }

  // Everything else: cache first, fetch and populate on miss.
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});
