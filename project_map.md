# Project Map: fitnessLA (Gym Management System)

## 🎯 Philosophy
**"Accounting First, Operations Second"**
ระบบบริหารจัดการฟิตเนสที่มุ่งเน้นความถูกต้องทางบัญชีและการควบคุมเงินสดเป็นอันดับแรก เพื่อแก้ปัญหาเงินรั่วไหล ยอดเงินไม่ตรงกะ และความยุ่งยากในการทำงานร่วมกับนักบัญชี หัวใจหลักคือการบันทึก transactions แบบ Double-Entry อัตโนมัติทุกครั้งที่เกิดเหตุการณ์ทางการเงิน

## 🗺️ Key Landmarks
- [docs/PRD_Phase1.md](docs/PRD_Phase1.md): รายละเอียดความต้องการทางด้านธุรกิจและคุณสมบัติของระบบใน Phase 1
- [docs/API_Contract.md](docs/API_Contract.md): สัญญา API และ DTO Interfaces ที่ตกลงร่วมกัน (Single Source of Truth)
- [docs/DatabaseSchema.md](docs/DatabaseSchema.md): โครงสร้างฐานข้อมูลที่รองรับ Double-Entry Accounting
- [docs/WorkSplit_2People_Phase1.md](docs/WorkSplit_2People_Phase1.md): พื้นฐานการแบ่งงาน Backend/Frontend

## 🚀 Execution Blueprints
- [docs/Plan_Person_A.md](docs/Plan_Person_A.md): แผนการทำงานละเอียดสำหรับระบบ Backend/Finance Core (Agent A)
- [docs/Plan_Person_B.md](docs/Plan_Person_B.md): แผนการทำงานละเอียดสำหรับระบบหน้าจอ POS/Flow (Agent B)
- [docs/Plan_Scaffold_Foundation.md](docs/Plan_Scaffold_Foundation.md): แผนการตั้งโครงสร้างพื้นฐาน (Phase 1)
- [docs/WorkSplit_2People_Phase1.md](docs/WorkSplit_2People_Phase1.md): แผนการแบ่งงานและ **GitHub Parallel Workflow** (Integration Gate)

## 👤 Current Operating Truth
- **Current Mode:** real-mode recovery closed by solo full-stack pass on 2026-03-21
- **Primary Responsibility Now:** keep frontend, backend, schema, and smoke docs aligned to the same runtime truth
- **Current Status:** repo recovery for members/product/POS/checkout is complete; dev DB smoke is green; documentation refresh is the remaining housekeeping boundary

## 🏛️ System Architecture
- **Frontend:** Next.js 15+ (App Router), Tailwind CSS, Lucide React, PWA (Serwist)
- **Backend:** Next.js API Routes, Better-Auth (Username/Password), Prisma ORM
- **Database:** Supabase (PostgreSQL + Storage for Receipts/Images)
- **State:** React Context / Jotai (Cart & Shift State)
- **Testing:** Vitest (Unit Tests focus)
  - **Location:** All tests MUST be stored in the root `tests/` directory.

---
- **Core Entities:** `users`, `products`, `member_subscriptions`, `chart_of_accounts`
- **Accounting & Logs:** `journal_entries`, `journal_lines`, `document_sequences`
- **Transaction Flow:** `shifts` -> `orders`/`order_items` -> `tax_documents`
- **Expense Control:** `expenses` (Linked to `shifts` and `chart_of_accounts`)
- **Product Metadata Reality:** `products` now carry `trackStock`, `stockOnHand`, `membershipPeriod`, and `membershipDurationDays`

## �️ Testing Standards (Vitest)
- **Unit Testing Focus:** เน้นทดสอบ Business Logic และ Utility Functions ที่สำคัญ
- **Location:** ไฟล์ Test ทั้งหมด (**Agent A** และ **Agent B**) ต้องเก็บไว้ในโฟลเดอร์ `tests/` ที่ Root เท่านั้น
- **Requirement:** Agent ต้องเขียน Unit Test สำหรับ Case ที่ซับซ้อน (เช่น การคำนวณบัญชี, การคำนวณยอดเงินทอน) ให้ผ่านก่อนส่ง PR

## �🐉 Challenges & Dragons
- **Concurrency in Running Numbers:** การรันเลขที่เอกสาร (`document_sequences`) ห้ามซ้ำและห้ามข้าม ต้องใช้ `SELECT ... FOR UPDATE` หรือ Database-level locking ในช่วงที่รันเลข
- **Atomic Double-Entry:** ทุกธุรกรรม (Sale/Expense) ต้องเขียนลงทั้งตาราง Transaction และ Accounting (`journal_lines`) ภายใน Unit of Work เดียวกัน (ACID)
- **Soft Control:** ห้ามลบข้อมูล (`DELETE`) ทุกอย่างใช้ `status` (ACTIVE, VOIDED, CLOSED) เพื่อรักษา Audit Trail
- **Strict Blind Drop:** การคุมพนักงานตอนปิดกะ (`shifts.expected_cash` vs `shifts.actual_cash`) เพื่อตรวจจับส่วนต่าง (`difference`)
- **Mock vs Real Drift:** หน้าที่เคยอาศัย browser-local member registry หรือ mock-only stock semantics ต้องถูกเช็กกับ backend truth ทุกครั้งก่อน release
- **Migration Truth:** dev database อาจ drift จาก local migration history; ต้องเช็ก `prisma migrate status` ก่อนใช้ smoke results เป็น evidence

## 🚩 Status & Signals
- **Current Phase:** Recovery Phase 1-4 complete, dev DB real-mode smoke complete, docs refresh in progress
- **Latest Update:** 2026-03-21 (members truth moved to backend/API, product stock + membership metadata implemented, checkout side effects validated on dev DB)
- **Current Runtime Truth:**
  - Better-Auth cookie session is the real auth path
  - members page in real mode reads backend/API data, not browser-local registry
  - product create/update supports `stock_on_hand`, `membership_period`, and `membership_duration_days`
  - membership checkout creates persisted member records and goods checkout decrements stock in backend truth
- **Latest Evidence Docs:** [docs/Local_Real_Mode_Runbook.md](docs/Local_Real_Mode_Runbook.md), [docs/Phase_G_Smoke_Checklist.md](docs/Phase_G_Smoke_Checklist.md)

## 🤝 Implementation Integration Matrix (Agent A ⬌ Agent B)
*(Use this matrix to track feature handoffs from Mock to Real)*
| Feature / Module | Backend (Agent A) | Frontend (Agent B) | Next Action |
| :--- | :--- | :--- | :--- |
| **Auth / Session** | ✅ DONE (Better-Auth) | 🏗️ Mocked | Agent B เปลี่ยนไปยิง API session จริง |
| **List Products** | ✅ DONE (`GET /api/v1/products`) | ✅ Real adapter wired | Run smoke on product metadata parity |
| **Open Shift** | ✅ DONE (`POST /api/v1/shifts/open`) | 🏗️ Mocked | Agent B ผูก `real-app-adapter.ts` |
| **Active Shift Check**| ✅ DONE (`GET /api/v1/shifts/active`)| 🏗️ Mocked | Agent B ผูก `real-app-adapter.ts` |
| **Orders & Checkout** | ✅ DONE (`POST /api/v1/orders`) | ✅ Real adapter wired | Keep validating stock/membership error UX |
| **Petty Cash** | ✅ DONE (`POST /api/v1/expenses`) | 🏗️ Mocked | Agent B ผูก `real-app-adapter.ts` |
| **Close Shift** | ✅ DONE (`POST /api/v1/shifts/close`) | 🏗️ Mocked | Agent B switch close flow to real adapter endpoint |
| **Daily Summary** | ✅ DONE (`GET /api/v1/reports/daily-summary`) | 🏗️ Mocked | Agent B switch report page to real adapter endpoint |
| **Shift Inventory Summary** | ✅ DONE (`GET /api/v1/shifts/:shiftId/inventory-summary`) | ✅ Real adapter wired | Agent B run smoke for cashier-owner boundary + no-data fallback |
| **COA Management** | ✅ DONE (`GET/POST /api/v1/coa`, `PATCH /api/v1/coa/:id/toggle`) | 🏗️ Shell ready | Extended smoke remains optional after core flow |
| **Product-COA Mapping** | ✅ DONE (`POST/PATCH /api/v1/products` + `revenue_account_id`) | ✅ Real mode verified | Product create/edit smoke passed on dev DB |
| **Members API / Page** | ✅ DONE (`GET /api/v1/members`, `POST /api/v1/members/:memberId/renew`, `POST /api/v1/members/:memberId/restart`) | ✅ Members page reads API truth | UI controls for renew/restart are still not surfaced |
| **General Ledger CSV** | ✅ DONE (`GET /api/v1/reports/gl`) | 🏗️ Placeholder | Agent B ต่อปุ่ม Download CSV ด้วย `start_date/end_date` |

## 🔄 2026-03-15 Grounding Delta (For Agent B Final Integration)

### ✅ Done ล่าสุด (ล็อกแล้ว)
- Agent A ปิด Phase 1-4 ตาม blueprint `#fitnessla-agent-a-final-100` พร้อม commit chain และ evidence ครบ
- Endpoint รายงานหลักพร้อมใช้งาน: `daily-summary`, `shift-summary`, `gl`, `shifts/:shiftId/inventory-summary`
- Real adapter ไม่เหลือ `NOT_IMPLEMENTED` สำหรับ `getShiftInventorySummary()` แล้ว
- Hard gate ล่าสุดผ่านครบ 2 รอบติดกัน: `npm run build`, `npm run lint`, `npx vitest run` (`24 files / 113 tests`)

### 🟡 Remaining สำหรับ Agent B
- รัน smoke ตามลำดับจาก handoff final (open -> order -> expense -> close -> daily/shift/gl)
- ยืนยัน UX/error state ใน real mode สำหรับ `SHIFT_OWNER_MISMATCH`, `SHIFT_NOT_FOUND`, และ no-data inventory (`[]`)
- เตรียม release checklist ของฝั่ง UI (download CSV, report filters, close-shift inventory visibility)

### 🔴 Must Not Forget
- ทุก request real mode ต้อง `credentials: include`
- `GET /api/v1/reports/gl` ต้องใช้ `start_date/end_date` format `YYYY-MM-DD`
- `GET /api/v1/shifts/:shiftId/inventory-summary`:
  - OWNER/ADMIN ดูได้ทุกกะ
  - CASHIER ดูได้เฉพาะกะตัวเอง
  - no-data ต้องคืน `[]` แบบ deterministic

## 🔄 2026-03-11 Grounding Delta (For Agent B)

### ✅ Done ล่าสุด (ล็อกแล้ว)
- Better-Auth แบบ cookie session เปิดใช้งานจริงแล้วใน `src/lib/auth.ts`
- Session resolution ฝั่ง server ย้ายไปใช้ `auth.api.getSession()` ใน `src/lib/session.ts`
- Route protection ด้วย `middleware.ts` ใช้งานแล้วสำหรับเส้นทางหลักของแอป
- `real-app-adapter.ts` ต่อ endpoint จริงสำหรับ login/session, products, shifts, orders, expenses, daily summary, admin users
- Hard Gate ผ่าน: build + lint + test (74/74)

### 🟡 Remaining สำหรับ Agent B
- Manual smoke test ฝั่ง browser ในโหมด `NEXT_PUBLIC_APP_ADAPTER=real`
- ตรวจสอบ flow ปิดกะ, POS checkout, และ expenses จาก UI จริงพร้อม cookie persistence
- เก็บ UX state บางจุดให้ครบ (loading/error/empty) ในหน้าที่เพิ่งต่อ endpoint จริง

### 🔴 ยังไม่เปิดใช้งานจริง (ต้องรอ backend contract/implementation)
- COA CRUD จริง
- Product create/update/stock update จริง
- Shift inventory summary จริง
- Advanced reports (shift summary, P&L, GL) และ export APIs

### 🚀 แผนต่อไป
1. ปิดงาน smoke test + regression ย่อยในโหมด real
2. Freeze รายการ mismatch ระหว่าง UI กับ API contract ที่ยังขาด
3. เปิดแผน Phase 2 สำหรับ COA/Product management/report APIs ตามลำดับความสำคัญของ owner

## 🔄 2026-03-12 Grounding Delta (For Agent B)

### ✅ Done ล่าสุด (ล็อกแล้ว)
- Dynamic revenue journaling ใน `createOrderWithJournal` ใช้งานแล้ว: เครดิตบัญชีรายได้ตามสินค้า และ fallback บัญชี `4010`
- GL export API พร้อมใช้งานแล้วที่ `GET /api/v1/reports/gl?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- COA และ Product revenue mapping พร้อมใช้งานจริงผ่าน `real-app-adapter.ts`
- Hard gate ผ่านครบ: `npm run build`, `npm run lint`, `npx vitest run` (89/89)

### 🟡 Remaining สำหรับ Agent B
- ต่อหน้า `/reports/general-ledger` จาก placeholder เป็น flow ดาวน์โหลด CSV จริง
- ต่อหน้า COA/Product management ให้ครบ real mode โดยยึด response shape ใน `API_Contract.md`
- เพิ่ม UX state (loading/error/empty/success) สำหรับ COA, Product update, GL export

### 🔴 Must Not Forget
- ทุกคำขอที่เรียก API ต้องส่ง cookie (`credentials: include`) ใน real adapter
- GL endpoint คืนค่าเป็น `text/csv` (ไม่ใช่ JSON) และต้องส่ง query params ทั้ง `start_date` และ `end_date`
- ห้ามแก้ชื่อ field contract ฝั่ง frontend (`revenue_account_id`, `account_code`, `account_name`) โดยไม่อัปเดต contract ก่อน
- อย่าทำ bypass flow เปิดกะ/ปิดกะใน UI เพราะ backend ใช้ hard gate (`SHIFT_NOT_OPEN`, `SHIFT_OWNER_MISMATCH`)

### 🚀 แผนต่อไป
1. Agent B ต่อปุ่ม export CSV ที่หน้า General Ledger แล้วทำ smoke test บน owner account
2. Agent B ต่อฟอร์ม Product create/edit ให้เลือก revenue account จาก `/api/v1/coa`
3. รัน regression frontend tests และเพิ่ม test สำหรับ GL download interaction

## 🔄 2026-03-14 Grounding Delta (For Agent A)

### ✅ Done ล่าสุด (ล็อกแล้ว)
- แก้ deploy blocker ที่ Vercel พบใน `src/lib/mock-api.ts` โดยทำให้ `fetchMockDailySummary()` คืน `shift_rows` ครบตาม `DailySummary`
- ยืนยัน `npm run build` ผ่านหลังแก้ และ push แล้วบน branch `staging`
- งาน frontend/integration ฝั่ง shift, expenses, reports อยู่ในสถานะที่ Agent A รับไปต่อที่ backend/data layer ได้โดยไม่ต้องย้อนแก้ UI รอบใหญ่

### 🟡 Remaining สำหรับ Agent A
- persist `responsible_name` ลง DB จริงของ `Shift`
- ออกแบบและเปิด endpoint `shift summary` โดยตรงแทนการให้ UI ประกอบจาก `daily summary`
- ยืนยัน real-mode dataset สำหรับ expense accounts และ smoke-test users
- แก้ production secret hygiene ของ `BETTER_AUTH_SECRET`

### 🔴 Must Not Forget
- ถ้าเปลี่ยน contract ของ `DailySummary` ต้อง sync `contracts`, `mock-api`, `mock-data`, adapters, และ report pages พร้อมกัน
- deploy รอบนี้ล้มเพราะ mock response shape ไม่ครบ ไม่ใช่เพราะ route จริงพัง
- ให้ใช้ `docs/Handoff_2026-03-14_Agent-A_Next_After_Deploy_Fix.md` เป็น starting point ของ Agent A รอบถัดไป

## 🔄 2026-03-21 Grounding Delta (Recovery Closure + Real Smoke)

### ✅ Verified In Runtime
- dev DB ถูก reset/reapplied จน `prisma migrate status` กลับมา `Database schema is up to date!`
- `npm run db:seed:real-mode` สร้าง baseline users (`owner`, `admin`, `staff`) และ seeded products/accounts ได้จริง
- browser smoke ผ่านครบเส้นหลัก:
  - login as `owner`
  - open shift
  - create product `SNK-002`
  - edit product to `Smoke Snack Plus`
  - checkout `Monthly Membership` for `Somchai Smoke`
  - verify member `MBR-2026-0001` on `/members`
  - close shift with expected `1700`, actual `1700`, difference `0`

### 🟡 Remaining Boundary
- `project_map.md`, `README.md`, `API_Contract.md`, and schema docs must stay synchronized with the new members/product truth
- members renew/restart routes exist and pass API-level behavior, but members-page action buttons are still intentionally absent

### 🔴 Must Not Forget
- `GET /api/v1/shifts/:shiftId/inventory-summary` still reports deterministic sold totals with a zeroed opening baseline; it is not a full opening-stock ledger yet
- smoke confidence is meaningful only after confirming database migration truth first
