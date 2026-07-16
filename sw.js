// sw.js — เวอร์ชันทำลายตัวเอง (kill switch)
// เนื่องจากตัว cache-first เดิมทำให้เกิดปัญหาหน้าเว็บว่าง/ค้างซ้ำๆ
// sw.js ตัวนี้จะ: ลบ cache เก่าทั้งหมด -> unregister ตัวเอง -> สั่งให้ทุกหน้าที่เปิดอยู่ reload
// ผลคือหลังจากนี้เว็บจะโหลดจาก network ตรงๆ ทุกครั้ง ไม่มี service worker คอย intercept อีกต่อไป

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // ลบ cache ทั้งหมดที่เคยสร้างไว้ (ทุกเวอร์ชัน)
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // unregister ตัวเอง
      await self.registration.unregister();

      // สั่งให้ client (แท็บที่เปิดอยู่) reload เพื่อโหลดหน้าใหม่แบบไม่มี SW
      const clientsList = await self.clients.matchAll({ type: "window" });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});

// ไม่ต้อง intercept fetch ใดๆ ทั้งสิ้น ปล่อยให้ network จัดการตามปกติ
