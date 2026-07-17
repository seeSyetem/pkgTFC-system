// sw.js — เวอร์ชันทำลายตัวเอง (kill switch) แบบปลอดภัย
// ลบ cache เก่าทั้งหมด -> unregister ตัวเอง
// (ไม่สั่ง navigate เอง เพราะบาง browser จะ throw error; ให้ผู้ใช้ refresh มือ 1 ครั้งหลังจากนี้)

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (e) {
        console.warn("SW: cache delete failed", e);
      }
      try {
        await self.registration.unregister();
      } catch (e) {
        console.warn("SW: unregister failed", e);
      }
    })()
  );
});
