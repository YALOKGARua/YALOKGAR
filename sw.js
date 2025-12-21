const CACHE_NAME = "yalokgar-v20251221";
const SCOPE_URL = new URL(self.registration.scope);
const toScopeUrl = (p) => new URL(p, SCOPE_URL).toString();
const APP_SHELL = [
  toScopeUrl("./"),
  toScopeUrl("./index.html"),
  toScopeUrl("./404.html"),
  toScopeUrl("./styles.css"),
  toScopeUrl("./script.js"),
  toScopeUrl("./manifest.webmanifest"),
  toScopeUrl("./photo_2025-05-15_16-53-42.jpg"),
  toScopeUrl("./robots.txt"),
  toScopeUrl("./sitemap.xml"),
  toScopeUrl("./assets/favicon.svg"),
  toScopeUrl("./assets/images/og-image.jpg"),
  toScopeUrl("./assets/images/profile.jpg"),
  toScopeUrl("./assets/images/profile@2x.jpg")
];

const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { 
      await cache.addAll(APP_SHELL); 
    } catch (error) {
      console.warn("Cache addAll failed:", error);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME && key.startsWith("yalokgar-")) {
          return caches.delete(key);
        }
        return null;
      })
    );
    await self.clients.claim();
  })());
});

function isSameOrigin(url) {
  try { 
    return new URL(url, self.location.href).origin === self.location.origin; 
  } catch (_) { 
    return false; 
  }
}

function isStaticAsset(url) {
  return /\.(?:css|js|png|jpg|jpeg|webp|avif|svg|ico|gif|json|xml|txt|woff2?|ttf|eot)(?:\?.*)?$/i.test(url);
}

function isImageRequest(url) {
  return /\.(?:png|jpg|jpeg|webp|avif|gif|svg)(?:\?.*)?$/i.test(url);
}

async function networkFirst(request, cache) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    return cached;
  }
}

async function cacheFirst(request, cache) {
  const cached = await cache.match(request);
  if (cached) {
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response);
      }
    }).catch(() => {});
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return null;
  }
}

async function staleWhileRevalidate(request, cache) {
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  if (request.method !== "GET") return;
  
  const url = new URL(request.url);
  
  if (url.origin !== self.location.origin && !isImageRequest(request.url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const response = await networkFirst(request, cache);
        if (response) return response;
        
        const indexPage = await cache.match(toScopeUrl("./index.html"));
        if (indexPage) return indexPage;
        
        const notFoundPage = await cache.match(toScopeUrl("./404.html"));
        if (notFoundPage) return notFoundPage;
        
        return new Response("Offline", { 
          status: 503, 
          headers: { "Content-Type": "text/plain; charset=utf-8" } 
        });
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        const indexPage = await cache.match(toScopeUrl("./index.html"));
        return indexPage || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  if (isSameOrigin(request.url) && isStaticAsset(request.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      
      if (isImageRequest(request.url)) {
        const response = await cacheFirst(request, cache);
        return response || new Response("", { status: 404 });
      }
      
      const response = await staleWhileRevalidate(request, cache);
      return response || new Response("", { status: 504 });
    })());
    return;
  }

  if (isImageRequest(request.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const response = await cacheFirst(request, cache);
      return response || fetch(request).catch(() => new Response("", { status: 404 }));
    })());
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
