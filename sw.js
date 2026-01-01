const APP_VERSION = "20260101r1";
const CACHE_NAME = `yalokgar-v${APP_VERSION}`;
const SCOPE_URL = new URL(self.registration.scope);
const toScopeUrl = (p) => new URL(p, SCOPE_URL).toString();
const toVersionedUrl = (p) => {
  const u = new URL(p, SCOPE_URL);
  u.searchParams.set("v", APP_VERSION);
  return u.toString();
};
const APP_SHELL = [
  toScopeUrl("./"),
  toScopeUrl("./index.html"),
  toScopeUrl("./404.html"),
  toVersionedUrl("./styles.css"),
  toVersionedUrl("./script.js"),
  toVersionedUrl("./manifest.webmanifest"),
  toScopeUrl("./photo_2025-05-15_16-53-42.jpg"),
  toScopeUrl("./file_00000000ff7471f4a5d8a5817cf43992.png"),
  toScopeUrl("./robots.txt"),
  toScopeUrl("./sitemap.xml"),
  toScopeUrl("./assets/favicon.svg"),
  toScopeUrl("./assets/images/og-image.jpg"),
  toScopeUrl("./assets/images/profile.jpg"),
  toScopeUrl("./assets/images/profile@2x.jpg")
];

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

function isBypassPathname(pathname) {
  const p = pathname.toLowerCase();
  return p.endsWith("/sw.js") || p.endsWith("/sw.js/");
}

function isCriticalAssetRequest(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (isBypassPathname(url.pathname)) return false;
  const dst = request.destination || "";
  if (dst === "script" || dst === "style") return true;
  const p = url.pathname.toLowerCase();
  if (p.endsWith(".css") || p.endsWith(".js") || p.endsWith(".mjs")) return true;
  if (p.endsWith(".webmanifest")) return true;
  return false;
}

function shouldForceNetwork(request) {
  const cacheMode = request.cache || "default";
  if (cacheMode === "no-store" || cacheMode === "reload") return true;
  const cc = request.headers.get("cache-control") || "";
  return /no-cache|no-store|max-age=0/i.test(cc);
}

function withCacheMode(request, cacheMode) {
  try {
    return new Request(request, { cache: cacheMode });
  } catch (_) {
    return request;
  }
}

async function networkFirst(request, cache, fetchRequest = request) {
  try {
    const response = await fetch(fetchRequest);
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

  if (isSameOrigin(request.url) && isBypassPathname(url.pathname)) {
    return;
  }
  
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

  if (isSameOrigin(request.url) && isCriticalAssetRequest(request, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const fetchReq = shouldForceNetwork(request) ? request : withCacheMode(request, "no-store");
      const response = await networkFirst(request, cache, fetchReq);
      return response || new Response("", { status: 504 });
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
