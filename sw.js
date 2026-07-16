// sw.js — cache เฉพาะ shell ของแอป (ไม่ cache ข้อมูล Supabase)
const CACHE_NAME = "packing-app-shell-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./supabase-api.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // อย่า cache request ไปหา Supabase — ต้องเป็นข้อมูลสดเสมอ
  if (url.hostname.includes("supabase.co")) {
    return;
  }

  // เฉพาะ same-origin GET requests เท่านั้นที่ทำ cache-first
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // สำหรับหน้า HTML/navigation ใช้ network-first เสมอ กัน cache เก่า/เสียค้างซ้ำตอน refresh
  const isNavigation =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone))
            .catch((err) => console.warn("SW: cache put failed", err));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // clone ทันทีก่อนทำอะไรอื่น กัน error "body already used"
          let responseClone;
          try {
            responseClone = networkResponse.clone();
          } catch (err) {
            console.warn("SW: clone response failed", err);
            return networkResponse;
          }
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone))
            .catch((err) => console.warn("SW: cache put failed", err));
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
