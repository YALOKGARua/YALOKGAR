const CACHE_NAME = "yalokgar-v20251103-1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/404.html",
  "/styles.css?v=20251103-1",
  "/script.js?v=20251103-1",
  "/manifest.webmanifest",
  "/assets/favicon.svg",
  "/assets/images/profile.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(APP_SHELL); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => { if (k !== CACHE_NAME && k.startsWith("yalokgar-")) return caches.delete(k); }));
    await self.clients.claim();
  })());
});

function isSameOrigin(url) {
  try { return new URL(url, self.location.href).origin === self.location.origin; } catch (_) { return false; }
}

function isStaticAsset(url) {
  return /\.(?:css|js|png|jpg|jpeg|webp|avif|svg|ico|gif|json|xml|txt)(?:\?.*)?$/i.test(url);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put("/index.html", fresh.clone());
        return fresh;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match("/index.html");
        if (cached) return cached;
        const nf = await cache.match("/404.html");
        if (nf) return nf;
        return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  if (isSameOrigin(request.url) && isStaticAsset(request.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const fetchAndUpdate = fetch(request).then((resp) => {
        if (resp && resp.status === 200) cache.put(request, resp.clone());
        return resp;
      }).catch(() => null);
      return cached || (await fetchAndUpdate) || new Response("", { status: 504 });
    })());
  }
});


