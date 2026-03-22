# fitnessLA

fitnessLA คือระบบ frontdesk + POS + accounting สำหรับยิม โดยวางแกนเป็น accounting-first operations:

- เปิดกะและปิดกะต้อง trace ได้
- การขายสินค้า, สมาชิก, และบริการเทรนต้องผูกกับข้อมูลธุรกรรมจริง
- ข้อมูลสมาชิกและเทรนเนอร์ต้องควบคุมสิทธิ์จาก role จริง
- รายงานต้องอ่านจาก backend truth ไม่ใช่ mock state เมื่ออยู่ใน real mode

## Current Scope

ระบบใน workspace นี้ครอบคลุมงานหลักดังนี้:

- Better Auth login/session สำหรับ real mode
- เปิดกะ, ปิดกะ, blind-drop flow
- POS สำหรับสินค้า, สมาชิก, และบริการเทรน
- จัดการสินค้าและผังบัญชี
- รายจ่ายหน้าร้าน
- ทะเบียนสมาชิก
- หน้าจัดการเทรนเนอร์
- รายงานสรุปยอด, สรุปกะ, กำไรขาดทุน, สมุดรายวันแยกประเภท

## What Changed Recently

รอบล่าสุดมีการเติมงานหลักเหล่านี้:

- attendance สำหรับ admin/cashier พร้อมเวลาเข้างาน-ออกงาน, late warning, และ attendance logs บนฐานข้อมูลจริง
- owner อนุมัติเครื่องลงเวลาแบบ approved device token แทนการพึ่ง IP อย่างเดียว
- หน้า `admin/users` แสดงรายชื่อ staff, เวลางาน, active attendance device และตาราง attendance ย้อนหลัง
- หน้า `dashboard` รองรับ check-in/check-out และแสดงสถานะสิทธิ์เครื่องสำหรับลงเวลา
- เพิ่มหน้า `pos/products` สำหรับจัดการสินค้า POS แยกจากหน้าเคาน์เตอร์ขาย
- เพิ่ม stock adjustment พร้อมประวัติการเติมสินค้าในฐานข้อมูลจริง
- เพิ่ม browser smoke สำหรับ attendance machine flow และปรับ POS live smoke ให้ครอบคลุม flow ใหม่
- มีสรุปรายละเอียดรอบนี้ใน `docs/Handoff_2026-03-22_Attendance_Device_And_POS_Changes.md`

## Tech Stack

- Next.js 16.1.6
- React 19
- TypeScript
- Prisma + PostgreSQL
- Better Auth
- Vitest
- Playwright

## Project Structure

โฟลเดอร์สำคัญ:

- `src/app` หน้า UI และ route handlers
- `src/features` business adapters, auth, operations, POS state
- `src/lib` contracts, auth, prisma, helpers, mock data
- `prisma` schema, migrations, seed scripts
- `tests/backend` route/service tests
- `tests/frontend` page/component tests
- `tests/browser` Playwright smoke tests
- `docs` runbooks, plans, handoff notes, reports

## Environment

ขั้นต่ำควรมี `.env` แบบนี้สำหรับ real mode:

```dotenv
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
BETTER_AUTH_SECRET="replace-with-a-long-random-local-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000/api/auth"
NEXT_PUBLIC_APP_ADAPTER="real"
FITNESSLA_SEED_PASSWORD="ChangeMe123!"
PLAYWRIGHT_REAL_OWNER_USERNAME="owner"
PLAYWRIGHT_REAL_OWNER_PASSWORD="ChangeMe123!"
PLAYWRIGHT_REAL_ADMIN_USERNAME="admin"
PLAYWRIGHT_REAL_ADMIN_PASSWORD="ChangeMe123!"
```

หมายเหตุ:

- แนะนำให้ `BETTER_AUTH_URL` และ browser ใช้ `localhost` ตรงกัน
- browser smoke setup จะรัน `prisma generate`, `prisma migrate deploy`, และ seed sample trainer/member ให้เอง
- permanent rerun smoke สำหรับบัญชีจริงจะอ่าน credential จาก `PLAYWRIGHT_REAL_OWNER_USERNAME`, `PLAYWRIGHT_REAL_OWNER_PASSWORD`, `PLAYWRIGHT_REAL_ADMIN_USERNAME`, `PLAYWRIGHT_REAL_ADMIN_PASSWORD`

## Setup

ติดตั้ง dependencies:

```bash
npm install
```

เตรียม Prisma client และ database:

```bash
npx prisma generate
npx prisma migrate deploy
npm run db:seed:real-mode
```

เปิด dev server:

```bash
npm run dev
```

หน้า login อยู่ที่:

```text
http://localhost:3000/login
```

## Seeded Users

ค่า default จาก runbook:

- owner / ChangeMe123!
- admin / ChangeMe123!
- staff / ChangeMe123!

ถ้า override `FITNESSLA_SEED_PASSWORD` ให้ใช้ค่าตาม env แทน

## Commands

คำสั่งหลักที่ใช้บ่อย:

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:browser:install
npm run test:browser:smoke
npm run test:browser:smoke:headed
npm run test:browser:smoke:real-account
npm run test:browser:smoke:real-account:headed
npm run db:migrate
npm run db:seed
npm run db:seed:users
npm run db:seed:real-mode
```

## Validation Status

สิ่งที่ยืนยันแล้วในรอบนี้:

- focused Vitest สำหรับ members/trainers owner-only flows ผ่าน
- Playwright smoke สำหรับ owner/admin login และ navigation ไปหน้า members/trainers ผ่าน
- browser smoke setup apply migration ล่าสุด (`phase8_member_activation_toggle`) อัตโนมัติ

Focused test suite ที่ใช้ยืนยันรอบนี้:

```bash
npx vitest run tests/backend/members-routes.test.ts tests/backend/trainers-routes.test.ts tests/frontend/members-page.test.tsx tests/frontend/trainers-page.test.tsx --reporter=verbose
```

Browser smoke:

```bash
npm run test:browser:smoke
```

Permanent rerun smoke with real accounts from `.env`:

```bash
npm run test:browser:smoke:real-account
```

## Browser Smoke Behavior

ชุด Playwright ปัจจุบันตรวจสิ่งต่อไปนี้ใน real mode:

- owner login สำเร็จและเข้า dashboard ได้
- owner navigate ไปหน้า members และ trainers ได้
- owner ไม่เห็น read-only banner ของ members
- owner เห็นปุ่ม `เพิ่มเทรนเนอร์` บนหน้า trainers
- admin login สำเร็จและเข้า dashboard ได้
- admin เห็น members page แบบ read-only
- admin เห็น trainers page แบบ read-only
- admin ไม่เห็นปุ่ม `เพิ่มเทรนเนอร์`
- permanent real-account smoke rerun ผ่าน spec แยกที่อ่าน credential จาก `.env` โดยไม่ผูกกับ global setup

หมายเหตุการออกแบบ:

- smoke ใช้ in-app navigation จาก sidebar หลัง login เพื่อเช็ก page behavior บนหน้าจริงที่ render แล้ว
- global setup เตรียม Prisma client, migrations, และ sample data ก่อนทุก run

## Important Runtime Notes

- real mode ใช้ Better Auth session ร่วมกับ middleware route protection
- middleware รองรับการตรวจ Better Auth cookie ชื่อจริงที่มี prefix ได้แล้ว
- members/trainers mutation สำคัญถูกจำกัดให้ owner-only ทั้ง API และ UI
- การปิดใช้งานเทรนเนอร์จะถูกบล็อกถ้ายังมี active assignments
- สมาชิกที่ inactive จะ renew/restart ไม่ได้

## Recommended Local Run Order

ถ้าต้องการตรวจระบบ real mode แบบเร็วและไม่พลาด dependency:

1. `npm install`
2. `npx prisma generate`
3. `npx prisma migrate deploy`
4. `npm run db:seed:real-mode`
5. `npm run test`
6. `npm run test:browser:install`
7. `npm run test:browser:smoke`
8. `npm run dev`

## Documentation Map

เอกสารที่เกี่ยวข้องมากที่สุด:

- `project_map.md`
- `docs/API_Contract.md`
- `docs/DatabaseSchema.md`
- `docs/Local_Real_Mode_Runbook.md`
- `docs/Phase_G_Smoke_Checklist.md`
- `docs/Report_2026-03-21_Owner_Authorization_Members_Trainers.md`
- `docs/Plan_2026-03-21_System_100_Frontdesk_Members_Trainer_Report.md`
- `docs/IMP_2026-03-21_System_100_Frontdesk_Members_Trainer_Report.md`

## Next Maintenance Note

ถ้ามีการเพิ่ม field ใหม่ใน Prisma schema แล้วจะรัน browser smoke หรือ dev server ต่อทันที ให้ regenerate Prisma Client ก่อนเสมอ:

```bash
npx prisma generate
```
