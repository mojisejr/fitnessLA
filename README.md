# fitnessLA

ระบบบริหารฟิตเนสที่วางแกนเป็น `accounting-first operations`: ทุกการเปิดกะ, ขายสินค้า, ขายสมาชิก, จ่ายค่าใช้จ่าย, และปิดกะ ต้องย้อน audit ได้และผูกกับบัญชีคู่แบบ deterministic.

## Current Runtime Truth

- real mode ใช้ Better-Auth cookie session เป็นเส้นทาง auth หลัก
- members page ใน real mode อ่านข้อมูลจาก backend/API truth แล้ว
- product management รองรับ `revenue_account_id`, `stock_on_hand`, `membership_period`, และ `membership_duration_days`
- membership checkout สร้าง member record จริงในฐานข้อมูล และ goods checkout ลด stock ใน backend truth
- dev DB smoke ล่าสุดผ่านครบ flow หลัก: login -> open shift -> create/edit product -> checkout membership -> verify members -> close shift

## Verified Smoke Baseline (2026-03-21)

flow ที่พิสูจน์ผ่านแล้วบน local real mode:

1. login ด้วย `owner / ChangeMe123!`
2. open shift ด้วย starting cash `500`
3. create product `SNK-002`
4. edit product เดิมเป็น `Smoke Snack Plus` ราคา `99` stock `15`
5. checkout `Monthly Membership` ให้ `Somchai Smoke`
6. เห็น member `MBR-2026-0001` บน `/members`
7. close shift ด้วย expected `1700`, actual `1700`, difference `0`

## Local Setup

1. ติดตั้ง dependencies

```bash
npm install
```

2. เตรียม `.env` สำหรับ real mode อย่างน้อยให้มี

```dotenv
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
BETTER_AUTH_SECRET="replace-with-a-long-random-local-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000/api/auth"
NEXT_PUBLIC_APP_ADAPTER="real"
FITNESSLA_SEED_PASSWORD="ChangeMe123!"
```

3. เช็ก migration truth ก่อน smoke

```bash
npx prisma migrate status
```

ถ้า dev DB drift จาก local migration history ให้แก้ drift ก่อน แล้วค่อยใช้ผล smoke เป็น evidence

4. apply migrations และ seed

```bash
npm run db:migrate
npm run db:seed:real-mode
```

5. start local server

```bash
npm run dev
```

จากนั้นเปิด `http://localhost:3000/login`

## Useful Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run db:migrate
npm run db:seed
npm run db:seed:users
npm run db:seed:real-mode
```

## Main Functional Areas

- `auth/session`: Better-Auth cookie session + protected app routes
- `shifts`: open/active/close shift พร้อม blind-drop cash control
- `pos/products`: create/update products, revenue account mapping, goods stock, membership metadata
- `orders`: checkout สินค้า/สมาชิก พร้อม accounting side effects
- `members`: list members และ backend routes สำหรับ renew/restart รอบสมาชิก
- `expenses`: petty cash + audit trail
- `reports`: daily summary, shift summary, general ledger CSV, inventory summary

## Important Reality Notes

- `GET /api/v1/shifts/:shiftId/inventory-summary` ยังไม่ใช่ opening-stock ledger เต็มรูปแบบ; ตอนนี้คืน deterministic sold totals สำหรับสินค้า `GOODS`
- members renew/restart routes พร้อมที่ API layer แล้ว แต่ปุ่มบน members page ยังไม่ได้ถูกเปิดใน UI
- smoke ที่มีความหมายต้องยืนยันก่อนว่า database schema ตรงกับ local migrations จริง

## Docs Map

- `project_map.md`
- `docs/API_Contract.md`
- `docs/DatabaseSchema.md`
- `docs/Local_Real_Mode_Runbook.md`
- `docs/Phase_G_Smoke_Checklist.md`
- `docs/Handoff_2026-03-15_Agent-A_Final_100_to_Agent-B.md`
- `docs/Handoff_2026-03-20_DB_Connectivity_Review.md`

## Recommended Next Step

- ใช้ `docs/Phase_G_Smoke_Checklist.md` เป็น baseline manual smoke สำหรับ real mode ทุกครั้งก่อน handoff หรือ deploy
