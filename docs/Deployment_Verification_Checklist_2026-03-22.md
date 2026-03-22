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