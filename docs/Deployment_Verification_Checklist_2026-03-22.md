# Deployment Verification Checklist 2026-03-22

ใช้ checklist นี้หลัง deploy source ปัจจุบันขึ้น Vercel เพื่อยืนยันว่า runtime บน production ตรงกับ build ล่าสุดและพร้อมรัน production smoke ต่อ

## ก่อนกด Deploy

- ยืนยันว่า branch ที่จะ deploy คือ `main`
- ยืนยันว่า `npm run build` ผ่านใน workspace ล่าสุด
- ยืนยันว่า source ล่าสุดมี route เหล่านี้อยู่ใน build output:
  - `/admin/attendance`
  - `/api/v1/admin/users/attendance-summary`
  - `/api/v1/admin/users/bulk-delete`
- ยืนยันว่า `.env` และค่าใน Vercel production ใช้ฐานข้อมูล production ที่ถูกต้อง

## หลัง Deploy สำเร็จทันที

- เปิด production URL: `https://fitness-la.vercel.app`
- login ด้วย owner: `phuwasit` / `phuwasit1!`
- เปิด `/dashboard` แล้วตรวจว่ามี quick link `attendance ทีม`
- เปิด `/admin/attendance` โดยตรงและยืนยันว่าหน้าโหลดได้
- เปิด `/pos/products` ด้วย cashier หรือ owner แล้วตรวจว่าเข้าได้ตาม role ปัจจุบัน

## Verification สำคัญของรอบนี้

- ยิง checkout สินค้า `GOODS` 1 รายการ ต้องได้ 2xx
- ยิง checkout `MEMBERSHIP` 1 รายการ ต้องได้ 2xx
- ยิง checkout `PT` 1 รายการพร้อมเลือก trainer ต้องได้ 2xx
- หลัง membership checkout ไป `/members` แล้วค้นหาชื่อลูกค้าที่เพิ่งซื้อ ต้องพบ record
- หลัง PT checkout ไป `/trainers` แล้วตรวจ enrollment ต้องพบ record

## ผล rerun production ล่าสุด

- วันที่ทดสอบ: 2026-03-22
- production URL ที่ใช้ทดสอบ: `https://fitness-la.vercel.app`
- owner login ผ่าน
- พบ quick link `attendance ทีม` บน `/dashboard` แล้ว ยืนยันได้ว่า deploy ใหม่ขึ้นจริง
- เปิด `/admin/attendance` ได้
- เปิด `/pos/products` ได้เมื่อ rerun ด้วยวิธีตรวจที่ถูกต้อง รอบก่อนที่เห็นหน้า unauthenticated เป็น false negative จากสคริปต์ตรวจเอง
- checkout สินค้า `GOODS` ผ่าน: SKU `SNK-001` ได้สถานะ `201`
- checkout `MEMBERSHIP` ยังไม่ผ่าน: SKU `MEM-001` ได้สถานะ `500` พร้อม response `INTERNAL_SERVER_ERROR`
- checkout `PT` ยังไม่ผ่าน: SKU `PT-001` ได้สถานะ `500` พร้อม response `INTERNAL_SERVER_ERROR`
- การตรวจผลต่อใน `/members` ยังไม่ผ่าน เพราะ membership order ไม่ถูกสร้างสำเร็จบน production
- การตรวจผลต่อใน `/trainers` ยังไม่ผ่าน เพราะ PT order ไม่ถูกสร้างสำเร็จบน production

## รายการที่ยังไม่ผ่านของรอบนี้

- `MEMBERSHIP` checkout บน production ยังคืน `500`
- `PT` checkout บน production ยังคืน `500`
- การยืนยัน record ใน `/members` และ `/trainers` ยัง fail ตาม upstream order failure

## ข้อสรุปของสถานะรอบนี้

- deploy ล่าสุดขึ้น production แล้วจริง
- route attendance ใหม่ใช้งานได้จริงบน production
- ปัญหาหลักที่ยังเหลืออยู่จำกัดอยู่ที่ branch การสร้าง order สำหรับ `MEMBERSHIP` และ `PT`
- หากจะไล่ root cause ต่อ ต้องดู Vercel function logs ของ `POST /api/v1/orders` เพื่อเอา error จริงหลัง generic `500`

## ถ้า Deploy แล้วยัง fail เหมือนเดิม

- ตรวจว่า deployment ใช้ commit ล่าสุดจริง
- ตรวจ Vercel build logs ว่าไม่มี fallback ไป build เก่าหรือ env เก่า
- ตรวจว่า production domain ชี้ deployment ล่าสุด ไม่ใช่ deployment ก่อนหน้า
- เปรียบเทียบ response ของ `POST /api/v1/orders` ระหว่าง production กับ local `next start`

## เกณฑ์ผ่านสั้น

- owner login ผ่าน
- `attendance ทีม` route ใช้งานได้
- `MEMBERSHIP` checkout ผ่าน
- `PT` checkout ผ่าน
- members/trainers อ่านผลจาก order ที่เพิ่งสร้างได้
- พร้อมรัน [docs/Production_Full_Smoke_Test_2026-03-22.md](c:\Users\ASUS\Desktop\fitnessLA\docs\Production_Full_Smoke_Test_2026-03-22.md) ต่อแบบเต็มรอบ