// sw.js — เวอร์ชันนี้ทำหน้าที่ "ปลดระวาง" Service Worker เดิมทั้งหมด
// เพื่อกำจัดปัญหาหน้าเว็บโหลดจาก cache เก่าค้าง (v3 เดิมที่ทำ cache-first)
// เมื่อไฟล์นี้ถูกติดตั้งแทนที่ตัวเก่า มันจะ:
//   1. ลบ cache เก่าทุกตัวทิ้ง
//   2. ยกเลิกการลงทะเบียนตัวเอง (unregister)
//   3. บังคับให้ทุกหน้าเว็บที่เปิดอยู่ (clients) โหลดใหม่ครั้งเดียว
//      เพื่อให้หลุดจากการควบคุมของ Service Worker ไปตลอด

self.addEventListener("install", (event) => {
  // ข้ามขั้นตอนรอ ให้ตัวใหม่นี้ทำงานทันที แทนที่ตัวเก่า
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1) ลบ cache ทั้งหมดที่เคยสร้างไว้
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // 2) เข้าคุมทุกหน้าเว็บที่เปิดอยู่ชั่วคราว (จำเป็นต้องทำก่อน unregister)
      await self.clients.claim();

      // 3) ยกเลิกการลงทะเบียนตัวเอง — จากนี้ไปเบราว์เซอร์จะไม่มี SW คุมหน้าเว็บนี้อีก
      await self.registration.unregister();

      // 4) สั่งให้ทุกแท็บที่เปิดเว็บนี้อยู่ reload ใหม่หนึ่งครั้ง
      //    เพื่อให้โหลดไฟล์ตรงจากเซิร์ฟเวอร์ ไม่ผ่าน SW อีกต่อไป
      const allClients = await self.clients.matchAll({ type: "window" });
      allClients.forEach((client) => client.navigate(client.url));
    })()
  );
});

// ไม่ดัก fetch ใดๆ อีกต่อไป — ปล่อยให้ทุก request วิ่งตรงไปเซิร์ฟเวอร์ตามปกติ
