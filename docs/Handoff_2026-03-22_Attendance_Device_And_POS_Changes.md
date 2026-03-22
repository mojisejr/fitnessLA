# Handoff 2026-03-22: Attendance Device And POS Changes

## Summary

รอบนี้มีการเพิ่มงานหลัก 2 กลุ่มที่กระทบทั้งฐานข้อมูลจริง, API, UI และ smoke tests:

1. Attendance สำหรับ admin/cashier แบบผูกกับเครื่องที่ owner อนุมัติ
2. หน้าแยกสำหรับจัดการสินค้า POS และเติมสต็อกพร้อมประวัติการเติม

ทั้งสองส่วนถูกต่อกับ real database แล้ว และมี migration สำหรับ schema ใหม่เรียบร้อย

## Attendance: What Was Added

- เพิ่ม field เวลางานใน user: `scheduledStartTime`, `scheduledEndTime`
- เพิ่มตาราง `staff_attendance_logs` สำหรับเก็บ check-in/check-out, สถานะมาสาย, มาก่อนเวลา, OT, early leave และ IP ที่ใช้ลงเวลา
- เปลี่ยนแนวคิดการจำกัดเครื่องจาก IP-only ไปเป็น approved device token
- เพิ่มตาราง `attendance_devices` สำหรับเก็บเครื่องที่ owner อนุมัติใช้งานลงเวลา
- เพิ่ม cookie `attendance_device_token` โดยเก็บเฉพาะ hash ในฐานข้อมูล
- owner สามารถอนุมัติ browser/เครื่องปัจจุบันให้เป็นเครื่องลงเวลาได้จากหน้า `admin/users`
- admin และ cashier ยัง login จากเครื่องอื่นได้ตามปกติ แต่จะ check-in ไม่ได้ถ้าไม่ใช่ browser ที่ได้รับอนุมัติ
- check-out ยังถูกบังคับให้ทำได้หลังปิดกะแล้วเท่านั้น

## Attendance: API And UI Surface

### API ที่เพิ่มหรือเปลี่ยน

- `GET /api/v1/admin/users`
  - คืนรายชื่อ admin/cashier พร้อม attendance rows ล่าสุด
- `PATCH /api/v1/admin/users/[userId]`
  - แก้เวลาเข้างานและเวลาออกงานของพนักงาน
- `GET /api/v1/attendance/status`
  - คืนสถานะ attendance ของ user ปัจจุบัน รวมถึงสิทธิ์ของเครื่อง
- `POST /api/v1/attendance/check-in`
  - ลงชื่อเข้างานและเตือนมาสายถ้ามี
- `POST /api/v1/attendance/check-out`
  - ลงชื่อออกงานหลังปิดกะ
- `GET /api/v1/attendance/device`
  - ตรวจสถานะเครื่องปัจจุบันและเครื่องที่อนุมัติอยู่
- `POST /api/v1/attendance/device`
  - owner อนุมัติเครื่องปัจจุบันสำหรับลงเวลา

### UI ที่เพิ่มหรือเปลี่ยน

- หน้า `dashboard`
  - admin/cashier เห็นการ์ด attendance สำหรับ check-in/check-out
  - owner เห็นภาพรวมทีมหน้าร้านและเงื่อนไขการลงเวลา
- หน้า `admin/users`
  - owner สร้าง admin/cashier พร้อมกำหนดเวลาเข้างานและออกงานได้
  - owner อนุมัติเครื่องลงเวลาได้จาก browser ปัจจุบัน
  - owner ดูตาราง attendance ย้อนหลังได้จากฐานข้อมูลจริง

## POS Products: What Was Added

- แยกงานจัดการสินค้าออกจากหน้า POS หลักไปที่หน้าใหม่ `pos/products`
- เพิ่ม route `GET/POST /api/v1/products/stock-adjustments`
- เพิ่มตาราง `product_stock_adjustments` สำหรับบันทึกประวัติการเติมสินค้า
- เพิ่มความสามารถเติม stock จากยอดเดิมแบบ inline ต่อสินค้า
- เพิ่ม history panel สำหรับดูว่าเติมเมื่อไร, เพิ่มเท่าไร, และเหลือเท่าไร
- เพิ่มเมนู `สินค้า POS` ใน app shell สำหรับ owner/admin
- ปรับ adapter ทั้ง mock และ real ให้รองรับ stock adjustment

## Database Changes

### Migrations ใหม่

- `prisma/migrations/20260322070000_phase12_product_stock_adjustments`
- `prisma/migrations/20260322104249_phase12_attendance_machine_control`
- `prisma/migrations/20260322114106_phase13_attendance_device_token`

### Schema ใหม่ที่สำคัญ

- `ProductStockAdjustment`
- `StaffAttendance`
- `AttendanceDevice`

## Validation That Passed

ยืนยันแล้วในรอบนี้:

- `npm run build`
- `npx vitest run tests/backend/attendance-routes.test.ts tests/backend/attendance-device-route.test.ts tests/backend/admin-users-route.test.ts`
- `node --env-file=.env ./node_modules/@playwright/test/cli.js test tests/browser/attendance-machine-flow.smoke.spec.ts -c playwright.local.config.ts`
- `node --env-file=.env ./node_modules/@playwright/test/cli.js test tests/browser/pos-live-full-flow.smoke.spec.ts -c playwright.config.ts`

ผลล่าสุดที่สำคัญ:

- attendance device flow ผ่าน browser smoke
- POS live full flow ผ่าน browser smoke
- production build ผ่าน

## Operational Notes

- หลังแก้ Prisma schema หรือเพิ่ม API สำคัญ ถ้า dev server ค้าง state เก่า ควร restart `next dev`
- attendance restriction ใช้เฉพาะตอน check-in ไม่ได้บล็อก login
- เมื่อ owner อนุมัติเครื่องใหม่ เครื่องเดิมจะถูก deactive และเหลือ active device เดียว

## Files Touched In This Round

กลุ่ม attendance:

- `prisma/schema.prisma`
- `src/features/staff/services.ts`
- `src/lib/attendance-device.ts`
- `src/lib/request-ip.ts`
- `src/lib/time.ts`
- `src/app/api/v1/attendance/*`
- `src/app/api/v1/admin/users/route.ts`
- `src/app/api/v1/admin/users/[userId]/route.ts`
- `src/app/(app)/admin/users/page.tsx`
- `src/app/(app)/dashboard/page.tsx`

กลุ่ม POS products:

- `src/app/(app)/pos/products/page.tsx`
- `src/app/api/v1/products/stock-adjustments/route.ts`
- `src/features/operations/services.ts`
- `src/features/adapters/mock-app-adapter.ts`
- `src/features/adapters/real-app-adapter.ts`
- `src/features/adapters/types.ts`
- `src/components/layout/app-shell.tsx`
- `src/app/(app)/pos/page.tsx`

กลุ่ม test และ seed:

- `tests/backend/*attendance*`
- `tests/browser/attendance-machine-flow.smoke.spec.ts`
- `tests/browser/pos-live-full-flow.smoke.spec.ts`
- `tests/browser/pos-product-management*.spec.ts`
- `tests/frontend/pos-inventory-management.test.tsx`
- `tests/frontend/pos-product-revenue-mapping.test.tsx`
- `prisma/seed-users.mjs`
- `scripts/seed-real-mode.mjs`