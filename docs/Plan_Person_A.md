# Mission Blueprint: Person A (Finance Core & Backend Owner)
**Project:** fitnessLA | Phase 1
**Status:** ⚒️ Phase 1 In Progress (A-3 Completed. Waiting B Integration)
**Role:** Backend / Accounting Engine / Database Governance

---

## 🎯 Primary Objectives
1.  **Impenetrable Ledger:** บันทึกข้อมูลบัญชีแบบ Double-Entry ให้ถูกต้อง 100% และห้ามลบ
2.  **API Bridge:** สร้าง Endpoints จริงใน `/api/v1/*` เพื่อแทนที่ Mock ของ Agent B
3.  **Strict Shift Control:** คำนวณเงินสดในกะและส่วนต่าง (Shortage/Overage) ให้แม่นยำ
4.  **Concurrency Safety:** จัดการเรื่องเลขที่เอกสาร (Running Number) ไม่ให้ซ้ำแม้จะขายพร้อมกัน

---

## 📚 Shared Records (The Contracts)
*   **API Interface:** [API_Contract.md](projects/fitnessLA/API_Contract.md) (ขยับไปใช้ [real-app-adapter.ts](src/features/adapters/real-app-adapter.ts) ร่วมกับ Agent B)
*   **Database Schema:** [schema.prisma](prisma/schema.prisma) (Single Source of Truth)

---

## 🏗️ Implementation Phases (The Hard Gate Approach)

### Phase A-1: Infrastructure & Auth Bridge (Target: Grounding)
เป้าหมาย: สร้างกรงเหล็กสำหรับข้อมูลและระบบสมาชิกเพื่อให้ Agent B สลับจาก Mock Session ได้
- [x] **A-1.1: Database Migration & CoA Seed**
    - รัน `npx prisma migrate dev --name init_accounting_auth` ไปยัง Supabase
    - สร้าง Seed สำหรับ **Chart of Accounts (CoA)** เบื้องต้น (1010-Cash, 4010-Revenue, 5010-Expense)
    - **Hard Gate**: `npx prisma db seed` ผ่านและข้อมูล CoA แสดงในฐานข้อมูล
- [x] **A-1.2: Better-Auth Server Setup**
    - ติดตั้งและตั้งค่า `src/lib/auth.ts` พร้อมจัดการ Role (OWNER, ADMIN, CASHIER)
    - **Hard Gate**: `GET /api/auth/session` เมื่อ Login แล้วต้องคืนค่า User พร้อม Role ตรงตาม Schema
- [x] **A-1.3: Admin User Creation API**
    - สร้าง `POST /api/v1/admin/users` สำหรับ Owner สร้างพนักงาน
    - **Hard Gate**: Unit Test ทดสอบ Role Guard ของ API นี้ (Admin/Owner เท่านั้นที่เข้าได้)

### Phase A-2: Operations API (Target: POS Integration)
เป้าหมาย: สร้าง Endpoints พื้นฐานที่หน้าจอ POS ของ Agent B ต้องการทันที
- [x] **A-2.1: Products API (`GET /api/v1/products`)**
    - ดึงรายการสินค้าพร้อมราคาและ Category
    - **Hard Gate**: DTO ต้องตรงตาม [API_Contract.md](projects/fitnessLA/API_Contract.md)
- [x] **A-2.2: Active Shift Service (`GET /api/v1/shifts/active`)**
    - ตรวจสอบว่าพนักงานปัจจุบันมีกะที่ยังไม่ปิดหรือไม่
    - **Hard Gate**: ต้องได้ Error 404 หากยังไม่มีกะเปิด (เพื่อให้ UI แสดงปุ่ม Open Shift)
- [x] **A-2.3: Shift Opening Logic (`POST /api/v1/shifts/open`)**
    - บันทึกกะใหม่พร้อม `starting_cash` และเปลี่ยนสถานะพนักงาน
    - **Hard Gate**: บันทึก Journal Entry ชุดแรก (Debit: Cash / Credit: Shift Equity) ทันที

### Phase A-3: The Accounting Soul (Double-Entry Engine)
เป้าหมาย: ระบบบันทึกบัญชีอัตโนมัติที่ไม่มีวันพลาดเมื่อมีรายการขายจริง
- [x] **A-3.1: Atomic Order Service (`POST /api/v1/orders`)**
    - รวมศูนย์: สร้าง Order -> ตัดเลข Tax Doc -> ลงบัญชี Journal -> Commit (All-or-Nothing)
    - **Hard Gate**: จำลองความล้มเหลวที่จุด Journal แล้วตรวจสอบว่า Order และ Sequence ต้องถูก Rollback
- [x] **A-3.2: Document Sequence Runner (Locked)**
    - ใช้ `SELECT ... FOR UPDATE` บน `document_sequences` เพื่อจองเลขกัน Race Condition
    - **Hard Gate**: Concurrency Test จำลอง 10 requests เข้ามาขอเลขพร้อมกัน (ห้ามซ้ำ)
- [x] **A-3.3: Petty Cash API (`POST /api/v1/expenses`)**
    - บันทึกรายจ่ายย่อยพร้อมรูปภาพ และลงบัญชี Expense คู่กับ Cash
    - **Hard Gate**: ยอด `actual_cash` ในกะต้องถูกหักลบยอดนี้อัตโนมัติ

### Phase A-4: Shift Discrepancy & Reporting
เป้าหมาย: สรุปส่วนต่างกะและยอดขายรายวันให้นักบัญชี
- [ ] **A-4.1: Blind Drop Close Logic (`POST /api/v1/shifts/close`)**
    - รับ `actual_cash` -> คำนวณ Expected -> บันทึกส่วนต่างเข้าบัญชี Shortage/Overage
    - **Hard Gate**: ยอด Difference ต้องถูกบันทึกเป็น Ledger Line อัตโนมัติ
- [ ] **A-4.2: Daily Summary API (`GET /api/v1/reports/daily-summary`)**
    - Query รวมยอด แยกตาม Payment Method และสรุปผลประกอบการรายวัน

---

## 🛡️ Definition of Done (DoD)
- [ ] `npm run build` และ `npm run lint` ผ่านสีเขียว 100%
- [ ] API v1 ทุกตัวที่ Implement แล้วต้องผ่านการทดสอบด้วย `vitest` (backend suite)
- [ ] [real-app-adapter.ts](src/features/adapters/real-app-adapter.ts) สามารถดึงข้อมูลจาก API เหล่านี้ได้จริง
- [ ] ข้อมูลการเงินใน `JournalLine` ต้อง Balance (Debit == Credit) ทันทีหลังจบ Transaction

---

## 📍 Reality Sync (As of 2026-03-08)
- **Agent B Status:** ทำ UI / Mock / Tests เสร็จแล้ว 90% (รอเชื่อมต่อ API จริงผ่าน `real-app-adapter.ts`)
- **Agent A Priority:** ปิดจบ Phase A-3 (Orders, Sequence, Expenses) และ Migration DB ยืนยันสมบูรณ์ ส่งให้ Agent B เอาไปเชื่อมหน้าบ้านแล้ว. ขั้นต่อไปคือลุย **Phase A-4** (Shift Close / Report).

