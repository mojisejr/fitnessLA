# Local Real Mode Runbook

## Purpose

เอกสารนี้ใช้สำหรับเปิด `fitnessLA` ใน local real mode เพื่อทำ Phase G manual smoke test ต่อได้ทันที โดยยึดจากโค้ดจริงใน repo ณ วันที่ 2026-03-13

ถ้าต้องการ flow แบบติ๊กทีละหน้าจอ ให้ใช้คู่กับ `docs/Phase_G_Smoke_Checklist.md`

เหมาะสำหรับงานต่อไปนี้:

- login ด้วย Better-Auth session cookie บน local
- ทดสอบ route guard และ session persistence
- ทดสอบ COA, POS, Product revenue mapping, และ General Ledger CSV export แบบ real mode

## Current Ground Truth

- Frontend เลือก real adapter เมื่อ `NEXT_PUBLIC_APP_ADAPTER=real`
- Auth server ใช้ Better-Auth ผ่าน `src/app/api/auth/[...all]/route.ts`
- Protected routes ถูก guard ที่ `middleware.ts`
- Seed script สำหรับ real mode คือ `npm run db:seed:real-mode`
- ผู้ใช้ทดสอบหลักที่มีใน seed คือ `owner`, `admin`, `staff`
- รหัสผ่าน default ของ seed คือ `ChangeMe123!` ถ้าไม่ได้ override ผ่าน env

## 1. Pre-flight Checklist

ก่อนเริ่ม ให้ยืนยันว่าเครื่อง local พร้อมตามนี้:

- ติดตั้ง Node.js เวอร์ชันที่ใช้งานกับ Next.js 16 ได้
- มี PostgreSQL หรือ Supabase database ที่เชื่อมได้จริง
- มีไฟล์ `.env` อยู่ที่ root project
- dependency ถูกติดตั้งแล้วด้วย `npm install`

## 2. Required Local Environment

สร้างหรืออัปเดตไฟล์ `.env` ที่ root project ให้มีค่าอย่างน้อยดังนี้:

```dotenv
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
BETTER_AUTH_SECRET="replace-with-a-long-random-local-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000/api/auth"
NEXT_PUBLIC_APP_ADAPTER="real"
FITNESSLA_SEED_PASSWORD="ChangeMe123!"
```

หมายเหตุสำคัญ:

- `DATABASE_URL` และ `DIRECT_URL` ต้องชี้ไปฐานเดียวกัน
- `BETTER_AUTH_URL` ใช้ค่าฐาน URL ของแอปตามที่โค้ด server อ่านอยู่ตอนนี้
- `NEXT_PUBLIC_BETTER_AUTH_URL` ควรชี้ไป auth route โดยตรง
- ถ้าไม่กำหนด `FITNESSLA_SEED_PASSWORD` ระบบจะ fallback เป็น `ChangeMe123!`

## 3. One-Time Setup

รันตามลำดับนี้จาก root project:

```powershell
npm install
npm run db:migrate
npm run db:seed:real-mode
```

สิ่งที่คาดว่าจะได้หลัง seed สำเร็จ:

- ผู้ใช้ `owner`, `admin`, `staff` ถูกสร้างหรือ update
- Chart of Accounts ขั้นต้นถูกสร้าง
- product ตัวอย่างถูกสร้าง

## 4. Start Local Real Mode

เปิด dev server:

```powershell
npm run dev
```

จากนั้นเปิด browser ที่:

```text
http://localhost:3000/login
```

หน้า login ที่อยู่ใน real mode ควรแสดงข้อความว่ากำลังเข้าสู่ระบบแบบ real auth ไม่ใช่ mock

## 5. Login Credentials For Smoke Test

ใช้บัญชีเหล่านี้ได้ทันทีหลัง seed:

- `owner` / `ChangeMe123!`
- `admin` / `ChangeMe123!`
- `staff` / `ChangeMe123!`

ถ้า override `FITNESSLA_SEED_PASSWORD` ให้ใช้ค่าที่ตั้งแทน

บทบาทที่แนะนำสำหรับ Phase G:

- ใช้ `owner` เป็นหลักสำหรับ COA และ Reports
- ใช้ `admin` เป็นตัวสำรองสำหรับตรวจ permission behavior

## 6. Quick Readiness Checks Before Phase G

ทำเช็กสั้น ๆ นี้ก่อนเริ่ม smoke test เต็ม:

1. เปิด [http://localhost:3000/login](http://localhost:3000/login)
2. login ด้วย `owner`
3. หลัง login ต้องถูกพาไป `/dashboard`
4. เปิด `/pos`, `/coa`, `/reports/general-ledger` ได้โดยไม่เด้งกลับไป login
5. เปิด browser incognito แล้วเข้าหน้า `/pos` โดยไม่ login ต้องถูก redirect ไป `/login`

ถ้าข้อใดข้อหนึ่งไม่ผ่าน อย่าเริ่ม Phase G ต่อจนกว่าจะรู้ root cause

## 7. Detailed Phase G Runbook

### Step 1: Confirm Session Is Real

- login ด้วย `owner`
- เปิด DevTools > Application > Cookies
- ยืนยันว่ามี cookie ชื่อ `better-auth.session_token` หรือชื่อที่ขึ้นต้นด้วย `better-auth.session_token.`

ผลที่คาดหวัง:

- protected routes ใช้งานได้โดยไม่ redirect
- refresh หน้าแล้ว session ยังอยู่

### Step 2: Verify COA Loads

- เปิด `/coa`
- ยืนยันว่ารายการบัญชีโหลดขึ้น
- จดจำนวน revenue accounts ที่ active ไว้คร่าว ๆ เพื่อใช้ตรวจ product mapping

ผลที่คาดหวัง:

- ไม่มี error 401 หรือ 403
- ถ้ามีบัญชีที่ locked ปุ่ม action ต้องสื่อสารสถานะชัด

### Step 3: Verify Product Revenue Mapping UI

- เปิด `/pos`
- เข้า product management flow ตาม UI ปัจจุบัน
- สร้างสินค้าใหม่ 2 รายการหรือแก้สินค้าที่มีอยู่ 2 รายการ
- ผูกสินค้าแต่ละตัวกับ revenue account คนละบัญชี

สิ่งที่ต้องตรวจ:

- dropdown revenue account โหลดได้
- dropdown แสดงเฉพาะบัญชีรายได้ที่ใช้งานได้ตาม flow ปัจจุบัน
- submit แล้วไม่เกิด contract error

ถ้าต้องการหลักฐานชัด ให้เปิด Network และดู request create/update product

ผลที่ต้องเห็นใน payload เมื่อมีการเลือกบัญชี:

```json
{
  "revenue_account_id": "<selected-account-id>"
}
```

### Step 4: Open Shift

- เปิด shift flow จากหน้า POS
- เปิดกะด้วยข้อมูลที่ UI บังคับให้กรอก

ผลที่คาดหวัง:

- shift เปิดสำเร็จ
- หน้า POS พร้อมให้ขายสินค้า

### Step 5: Sell The Mapped Products

- ขายสินค้า 2 ตัวที่ผูก revenue account คนละตัว
- ใช้วิธีชำระเงินที่ระบบรองรับตาม flow ปัจจุบัน
- ยืนยัน order สำเร็จทั้งสองรายการ

สิ่งที่ควรเก็บ:

- เวลาโดยประมาณของ order
- ชื่อสินค้า
- revenue account ที่ตั้งไว้กับสินค้าแต่ละตัว

### Step 6: Export General Ledger CSV

- เปิด `/reports/general-ledger`
- เลือก `start_date` และ `end_date` ให้ครอบคลุมรายการขายเมื่อกี้
- กด `Download CSV`

ผลที่คาดหวัง:

- ปุ่มเข้า loading state ระหว่างยิง request
- browser เริ่มดาวน์โหลดไฟล์ CSV
- ไฟล์ชื่อใกล้เคียงรูปแบบ `general-ledger-YYYY-MM-DD-to-YYYY-MM-DD.csv`

### Step 7: Validate The CSV

เปิดไฟล์ CSV แล้วเช็กอย่างน้อยดังนี้:

- มีบรรทัดบัญชีรายได้มากกว่า 1 บัญชี เมื่อขายสินค้าที่ map คนละ revenue account
- debit และ credit สมดุลกัน
- ช่วงวันที่ใน report ตรงกับที่ส่งออก

## 8. Recommended Network Verification Points

ระหว่าง smoke test ให้เปิด DevTools > Network และตรวจ endpoint เหล่านี้:

- `POST /api/auth/sign-in/username`
- `GET /api/auth/session`
- `GET /api/v1/coa`
- `POST /api/v1/products` หรือ `PATCH /api/v1/products/:productId`
- `POST /api/v1/shifts/open`
- `POST /api/v1/orders`
- `GET /api/v1/reports/gl?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

สิ่งที่ต้องดูทุกครั้ง:

- status code
- response body เมื่อ fail
- request payload เมื่อ save product
- query string ของ GL export

## 9. Failure Logging Template

ถ้ามีปัญหาระหว่าง Phase G ให้จดตามรูปแบบนี้ทุกครั้ง:

```text
Page:
Action:
Request:
Response status:
Response body/code:
User impact:
Notes:
```

ตัวอย่าง:

```text
Page: /reports/general-ledger
Action: Download CSV for 2026-03-01 to 2026-03-31
Request: GET /api/v1/reports/gl?start_date=2026-03-01&end_date=2026-03-31
Response status: 403
Response body/code: FORBIDDEN
User impact: owner ดาวน์โหลดรายงานไม่ได้
Notes: session ยังอยู่ แต่ role gate หรือ backend auth mapping อาจผิด
```

## 10. Fast Troubleshooting

### Problem: Login สำเร็จแต่เข้า protected route ไม่ได้

เช็กตามลำดับนี้:

1. `NEXT_PUBLIC_APP_ADAPTER` ต้องเป็น `real`
2. cookie session ต้องถูก set จริงหลัง login
3. เปิด DevTools ดูว่า request ไป `/api/auth/session` ได้ `200`
4. ตรวจว่า browser ใช้ origin เดียวกันคือ `http://localhost:3000`

### Problem: Login fail ทันที

เช็กตามลำดับนี้:

1. seed ผู้ใช้แล้วหรือยังด้วย `npm run db:seed:real-mode`
2. `BETTER_AUTH_SECRET` ถูกตั้งไว้หรือไม่
3. database connection ใช้งานได้หรือไม่
4. username/password ตรงกับค่าที่ seed หรือไม่

### Problem: Product revenue account dropdown ว่าง

เช็กตามลำดับนี้:

1. `GET /api/v1/coa` ตอบสำเร็จหรือไม่
2. มีบัญชี `REVENUE` ที่ active อยู่จริงหรือไม่
3. session role มีสิทธิ์เข้า flow นี้หรือไม่

### Problem: GL download ไม่เริ่ม

เช็กตามลำดับนี้:

1. query ต้องเป็น `start_date` และ `end_date`
2. วันที่ต้องอยู่ในรูปแบบ `YYYY-MM-DD`
3. response ต้องไม่เป็น 401, 403, 400, 500
4. browser อาจ block download ถ้า request fail ก่อนสร้าง blob

## 11. Exit Criteria For Phase G

ถือว่าพร้อมส่งต่อเมื่อครบทุกข้อ:

- login real mode สำเร็จและ refresh แล้วยังอยู่ใน session
- protected routes redirect ถูกต้องเมื่อไม่มี session
- COA page โหลดข้อมูลได้
- product create/edit ส่ง revenue mapping ได้จริง
- เปิดกะและขายสินค้าทดสอบได้
- General Ledger CSV ดาวน์โหลดได้จริง
- CSV สะท้อน revenue mapping ตามสินค้าที่ขาย

## 12. Suggested Command Set For A Fresh Local Run

ถ้าต้องเริ่มใหม่ทั้งหมดบนเครื่อง local ให้ใช้ลำดับนี้:

```powershell
npm install
npm run db:migrate
npm run db:seed:real-mode
npm run dev
```

จากนั้น login ที่ `http://localhost:3000/login` ด้วย `owner / ChangeMe123!`