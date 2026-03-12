# Mission Blueprint: fitnessLA Phase 2 — Accounting Deep-Dive (COA & GL) 🏛️💰

**Status**: 🏗️ DRAFT (Ready for Implementation)
**Project**: [projects/fitnessLA](projects/fitnessLA)
**Author**: Oracle (Agent A - Backend/Finance Core)
**Timestamp**: 2026-03-12 16:10 (GMT+7)

---

## 🎯 Mission Statement
เปลี่ยนจากระบบ "รับ-จ่ายเงินสด" (Cash Basis Tracking) ไปสู่ระบบ "บัญชีคู่" (Double-Entry Accounting) ที่แท้จริง เพื่อส่งต่อข้อมูลให้นักบัญชีได้ทันที โดยมี **Chart of Accounts (COA)** เป็นกระดูกสันหลัง

---

## 🏗️ Phase 2: Breakdown & Objectives

### 1. Chart of Accounts (COA) Management — [Backend A / Frontend B]
- **Goal**: ให้ Admin/Owner สามารถจัดการ "หมวดหมู่เงิน" ได้เอง
- **Action**:
    - Implement `GET /api/v1/coa` (List all accounts)
    - Implement `POST /api/v1/coa` (Create new account with code/name/type)
    - Implement `PATCH /api/v1/coa/[id]` (Update/Toggle active status)
- **Data Shape**: `code`, `name`, `type` (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE), `normalBalance` (DEBIT, CREDIT)

### 2. General Ledger (GL) & Journaling — [Backend A]
- **Goal**: ทุกธุรกรรมต้องสร้าง "สมุดรายวัน" อัตโนมัติ
- **Action**:
    - สร้าง `Internal Journaling Service` เพื่อบันทึก `JournalEntry` และ `JournalLines`
    - **Sales Integration**: เมื่อ Order เสร็จสิ้น -> Debit: Cash/PrompTPay, Credit: Revenue
    - **Expense Integration**: เมื่อบันทึก Petty Cash -> Debit: Expense Account (จาก COA), Credit: Cash
    - **Shift Close Integration**: ถ้าเงินขาด/เกิน -> บันทึกเข้าหมวด Shortage/Overage Account อัตโนมัติ

### 3. Product-to-COA Mapping — [Backend A / Frontend B]
- **Goal**: ระบุได้ว่าสินค้าตัวไหน คือรายได้ก้อนไหน
- **Action**:
    - เพิ่มฟิลด์ `chartOfAccountId` ในโมเดล `Product` (Prisma)
    - ปรับ UI หลังบ้านให้เลือกได้ว่า Product นี้ผูกกับ Revenue Account ตัวไหน

### 4. Financial Export & Reporting — [Backend A]
- **Goal**: ข้อมูลพร้อมใช้สำหรับนักบัญชี
- **Action**:
    - Implement `GET /api/v1/reports/gl` (Export Journal Entries เป็น JSON/CSV)
    - Draft P&L (Profit & Loss) Report เบื้องต้น (รายได้ - ค่าใช้จ่าย)

---

## 🛠️ Implementation Plan (Implementation Script)

### Step 1: Schema Update (Prisma)
- [x] Update `prisma/schema.prisma` เพื่อรองรับ COA API contract (`isActive`, `description`, `lockedReason`)
- [x] Run `npx prisma migrate dev --name phase2_coa_mapping`

### Step 2: Seed COA Standard
- [ ] สร้างชุดข้อมูลบัญชีมาตรฐาน (Standard COA) เช่น 1101 (Cash), 4101 (Sales), 5101 (Petty Cash)

### Step 3: Backend API (COA CRUD)
- [x] Implement Route Handlers ใน `src/app/api/v1/coa/route.ts` และ `src/app/api/v1/coa/[accountId]/toggle/route.ts`
- [x] เขียน Unit Test ใน `tests/backend/coa-routes.test.ts`

### Step 4: Accounting Trigger Logic
- [x] Product-to-COA Binding (Backend A): เพิ่ม `revenueAccountId` ใน `Product`, เปิด `POST/PATCH /api/v1/products`, และเชื่อม `real-app-adapter` สำหรับ create/update product
- [ ] Product-to-COA Binding (Frontend B): เพิ่ม UI เลือก Revenue Account ในหน้าจัดการสินค้า
- [ ] แก้ไข Logic ใน `POST /api/v1/orders` ให้เรียกใช้ Journaling Service
- [ ] แก้ไข Logic ใน `POST /api/v1/expenses` ให้เรียกใช้ Journaling Service

---

## 🛡️ Hard Gate (Verification)
1. **Balance Check**: ผลรวม Debit/Credit ใน `JournalLine` ของทุกๆ `JournalEntry` ต้องเป็น 0
2. **Audit Trail**: ทุก Journal Entry ต้องมี `sourceId` และ `sourceType` อ้างอิงกลับไปยัง Order หรือ Expense ได้
3. **Build/Lint/Test**: ต้องผ่านทั้งหมดก่อนจบ Phase

---

## 👤 Role Assignment
- **Agent A (Oracle)**: รับผิดชอบ Backend logic, Schema, และ Accounting Engine
- **Agent B (Frontend)**: รับผิดชอบ UI สำหรับจัดการ COA และการผูกรหัสบัญชีกับ Product

---

## ❓ Pending Decisions / Questions
- คุณนนท์ต้องการให้รหัสบัญชี (Account Code) เป็นแบบ 4 หลัก (Standard) หรือตั้งเองได้อิสระครับ?
- ใน Phase 2 นี้ ต้องการให้ Export เป็นไฟล์ Excel (.xlsx) ทันทีเลย หรือแค่ CSV ก่อนครับ?

---
*Blueprint สร้างขึ้นโดย Oracle เพื่อเป็นแนวทางปฏิบัติในกะการทำงานถัดไป*
