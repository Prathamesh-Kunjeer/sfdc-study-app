const CACHE_NAME = "sfdc-sprint-v36";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./interview-points.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

function normalizeUrl(url) {
  return new URL(url, self.location.href).href;
}

function cacheKeyWithoutSearch(url) {
  const cleanUrl = new URL(url);
  cleanUrl.search = "";
  return cleanUrl.href;
}

async function cacheStudyAssets(cache) {
  try {
    const response = await fetch(`./catalog.json?refresh=${Date.now()}`, { cache: "no-store" });
    if (response.ok) {
      const catalog = await response.json();
      const cacheKey = cacheKeyWithoutSearch(normalizeUrl("./catalog.json"));
      await cache.put(cacheKey, new Response(JSON.stringify(catalog), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }));
    }
    await notifyClients({ type: "CACHE_STATUS", status: "ready" });
  } catch (error) {
    console.warn("Catalog refresh skipped", error);
    await notifyClients({ type: "CACHE_STATUS", status: "ready" });
  }
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.map(normalizeUrl));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", response.clone());
        return response;
      } catch {
        return caches.match("./index.html");
      }
    })());
    return;
  }

  if (url.pathname.endsWith("/catalog.json") || url.pathname.endsWith("/data.js")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cacheKey = cacheKeyWithoutSearch(event.request.url);
      try {
        const response = await fetch(event.request, { cache: "no-store" });
        cache.put(cacheKey, response.clone());
        return response;
      } catch {
        const cached = await caches.match(cacheKey);
        if (cached) return cached;
        return Response.error();
      }
    })());
    return;
  }

  if (url.pathname.endsWith("/app.js") || url.pathname.endsWith("/styles.css")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(event.request, { cache: "no-store" });
        cache.put(event.request, response.clone());
        return response;
      } catch {
        return caches.match(event.request);
      }
    })());
    return;
  }

  if (url.pathname.includes("/content/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(event.request, { cache: "no-store" });
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return caches.match(cacheKeyWithoutSearch(event.request.url));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, response.clone());
    return response;
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_STUDY_ASSETS") return;

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cacheStudyAssets(cache);
  })());
});
