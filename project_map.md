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

## 👤 Current Occupation
- **Agent A (Backend/Finance Core)**: GitHub Copilot (Oracle-Implementer)
- **Primary Responsibility**: Database Schema, Double-Entry Logic, Better-Auth integration, and `/api` hardened routes.
- **Status**: Active & Linked via Agent A Vow.

## 🏛️ System Architecture
- **Frontend:** Next.js 15+ (App Router), Tailwind CSS, Lucide React, PWA (Serwist)
- **Backend:** Next.js API Routes, Better-Auth (Username/Password), Prisma ORM
- **Database:** Supabase (PostgreSQL + Storage for Receipts/Images)
- **State:** React Context / Jotai (Cart & Shift State)
- **Testing:** Vitest (Unit Tests focus)
  - **Location:** All tests MUST be stored in the root `tests/` directory.

---
- **Core Entities:** `users`, `products`, `chart_of_accounts`
- **Accounting & Logs:** `journal_entries`, `journal_lines`, `document_sequences`
- **Transaction Flow:** `shifts` -> `orders`/`order_items` -> `tax_documents`
- **Expense Control:** `expenses` (Linked to `shifts` and `chart_of_accounts`)

## �️ Testing Standards (Vitest)
- **Unit Testing Focus:** เน้นทดสอบ Business Logic และ Utility Functions ที่สำคัญ
- **Location:** ไฟล์ Test ทั้งหมด (**Agent A** และ **Agent B**) ต้องเก็บไว้ในโฟลเดอร์ `tests/` ที่ Root เท่านั้น
- **Requirement:** Agent ต้องเขียน Unit Test สำหรับ Case ที่ซับซ้อน (เช่น การคำนวณบัญชี, การคำนวณยอดเงินทอน) ให้ผ่านก่อนส่ง PR

## �🐉 Challenges & Dragons
- **Concurrency in Running Numbers:** การรันเลขที่เอกสาร (`document_sequences`) ห้ามซ้ำและห้ามข้าม ต้องใช้ `SELECT ... FOR UPDATE` หรือ Database-level locking ในช่วงที่รันเลข
- **Atomic Double-Entry:** ทุกธุรกรรม (Sale/Expense) ต้องเขียนลงทั้งตาราง Transaction และ Accounting (`journal_lines`) ภายใน Unit of Work เดียวกัน (ACID)
- **Soft Control:** ห้ามลบข้อมูล (`DELETE`) ทุกอย่างใช้ `status` (ACTIVE, VOIDED, CLOSED) เพื่อรักษา Audit Trail
- **Strict Blind Drop:** การคุมพนักงานตอนปิดกะ (`shifts.expected_cash` vs `shifts.actual_cash`) เพื่อตรวจจับส่วนต่าง (`difference`)

## 🚩 Status & Signals
- **Current Phase:** Phase 2 Completed (Accounting Soul backend complete, Agent B integration in progress)
- **Latest Update:** 2026-03-12 (Dynamic Revenue Journaling + GL CSV export complete, hard gate passed 89/89)
- **Shared Agreement:** ยึด `API_Contract.md` เป็นหัวใจหลักในการคุยกัน และให้ Agent B เดินงานต่อผ่าน `real-app-adapter.ts` เป็นจุดเชื่อมเดียว
- **Handoff Doc (Agent B):** [docs/Handoff_2026-03-12_Agent-B_Phase2-Ready.md](docs/Handoff_2026-03-12_Agent-B_Phase2-Ready.md)

## 🤝 Implementation Integration Matrix (Agent A ⬌ Agent B)
*(Use this matrix to track feature handoffs from Mock to Real)*
| Feature / Module | Backend (Agent A) | Frontend (Agent B) | Next Action |
| :--- | :--- | :--- | :--- |
| **Auth / Session** | ✅ DONE (Better-Auth) | 🏗️ Mocked | Agent B เปลี่ยนไปยิง API session จริง |
| **List Products** | ✅ DONE (`GET /api/v1/products`) | 🏗️ Mocked (POS) | Agent B ผูก `real-app-adapter.ts` |
| **Open Shift** | ✅ DONE (`POST /api/v1/shifts/open`) | 🏗️ Mocked | Agent B ผูก `real-app-adapter.ts` |
| **Active Shift Check**| ✅ DONE (`GET /api/v1/shifts/active`)| 🏗️ Mocked | Agent B ผูก `real-app-adapter.ts` |
| **Orders & Checkout** | ✅ DONE (`POST /api/v1/orders`) | 🏗️ Mocked | Agent B ผูก `real-app-adapter.ts` |
| **Petty Cash** | ✅ DONE (`POST /api/v1/expenses`) | 🏗️ Mocked | Agent B ผูก `real-app-adapter.ts` |
| **Close Shift** | ✅ DONE (`POST /api/v1/shifts/close`) | 🏗️ Mocked | Agent B switch close flow to real adapter endpoint |
| **Daily Summary** | ✅ DONE (`GET /api/v1/reports/daily-summary`) | 🏗️ Mocked | Agent B switch report page to real adapter endpoint |
| **COA Management** | ✅ DONE (`GET/POST /api/v1/coa`, `PATCH /api/v1/coa/:id/toggle`) | 🏗️ Shell ready | Agent B ต่อหน้า COA กับ real adapter และจัดการ error state |
| **Product-COA Mapping** | ✅ DONE (`POST/PATCH /api/v1/products` + `revenue_account_id`) | 🏗️ Partial | Agent B เพิ่ม UI เลือกบัญชีรายได้ตอน create/edit product |
| **General Ledger CSV** | ✅ DONE (`GET /api/v1/reports/gl`) | 🏗️ Placeholder | Agent B ต่อปุ่ม Download CSV ด้วย `start_date/end_date` |

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
