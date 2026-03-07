# Mission Blueprint: Person A (Finance Core & Backend Owner)
**Project:** fitnessLA | Phase 1
**Status:** ⚒️ Phase 1 Ready for Implementation
**Role:** Backend / Accounting Engine / Database Governance

---

## 🎯 Primary Objectives
1.  **Impenetrable Ledger:** บันทึกข้อมูลบัญชีแบบ Double-Entry ให้ถูกต้อง 100% และห้ามลบ
2.  **Strict Shift Control:** คำนวณเงินสดในกะและส่วนต่าง (Shortage/Overage) ให้แม่นยำ
3.  **Concurrency Safety:** จัดการเรื่องเลขที่เอกสาร (Running Number) ไม่ให้ซ้ำแม้จะขายพร้อมกัน

---

## 📚 Shared Records (The Contracts)
*   **API Interface:** [API_Contract.md](projects/fitnessLA/API_Contract.md) (ต้องทำตาม DTO นี้เท่านั้น)
*   **Database Schema:** [DatabaseSchema.md](projects/fitnessLA/DatabaseSchema.md) (Single Source of Truth)

---

## 🛠️ Implementation Specs (Step-by-Step)

### A-0. Git & Testing Initiation (IMPORTANT)
- [ ] แตก Branch ใหม่จาก `staging` โดยใช้ชื่อรูปแบบ: `feat/agent-a-[feature-name]`
- [ ] **Vitest Setup:** ไฟล์ Test ทั้งหมดต้องอยู่ใน `tests/backend/` ที่ Root เท่านั้น
- [ ] เมื่อเสร็จงานย่อย ให้ Pull `staging` เข้าหาตัวก่อนส่ง PR ทุกครั้ง

### A-1. Infrastructure & Auth (Supabase + Better-Auth)
- [ ] **Supabase Setup:** เชื่อมต่อ Database (PostgreSQL) และสร้าง Bucket สำหรับเก็บ `receipt-images`
- [ ] **Better-Auth Integration:** ติดตั้งและ Config Better-Auth โดยใช้ Strategy: `Username/Password`
- [ ] **RBAC Admin Flow:** เขียน Logic เฉพาะ ADMIN/OWNER ให้สามารถสร้าง Account ให้พนักงานผ่าน API/UI ได้
- [ ] **Prisma & Zod Schema:** สร้าง `schema.prisma` ที่รวม Auth Tables และ Business Tables เข้าด้วยกัน พร้อม Zod Validation สำหรับ Input ทุกช่อง

### A-2. The Accounting Engine
- [ ] **Journal Posting Service:** สร้างฟังก์ชันรับ `source_type` และ `source_id` แล้วแตกเป็น Debit/Credit ตามผังบัญชี
- [ ] **Transaction Boundary:** ทุกการขาย (`/api/orders`) ต้องครอบด้วย `prisma.$transaction([])` เพื่อให้ Order, Items, TaxDoc และ Journal บันทึกสำเร็จพร้อมกัน (Atomic)

### A-3. Document Sequence Logic
- [ ] **Locking Mechanism:** ตอนรันเลขที่เอกสาร ต้องใช้ `SELECT ... FOR UPDATE` บนตาราง `document_sequences` เพื่อจองเลขกัน Race Condition
- [ ] **Format Generator:** แปลง `current_no` ให้เป็น String ตาม Prefix (เช่น `INV-2026-0001`)

### A-4. Shift Discrepancy Logic
- [ ] **Expected Cash Calculation:** ฟังก์ชันรวบรวม `starting_cash` + `cash_sales` - `petty_cash`
- [ ] **Diff Posting:** เมื่อ `/api/shifts/close` ถูกเรียก ให้ตรวจสอบส่วนต่างแล้วบันทึกเข้าบัญชี "เงินขาด/เกิน" อัตโนมัติ

### A-5. Unit Testing (Vitest)
- [ ] **Account Calculation Tests:** ทดสอบฟังก์ชันการบันทึก `journal_lines` ว่ายอด `Debit` เท่ากับ `Credit` หรือไม่
- [ ] **Document Sequence Tests:** ทดสอบ Case การรันเลขที่เอกสารใหม่ในกรณีที่เกิด Race Condition (ใช้ Concurrent Execution)
- [ ] **API Endpoint Tests:** ทดสอบ Endpoint ของ API ที่สำคัญว่าส่ง DTO กลับมาตรงตาม [API_Contract.md](projects/fitnessLA/API_Contract.md)

---

## 🛡️ Definition of Done (DoD)
- [ ] `npm run build` ผ่านโดยไม่มี Type Error (ใช้ Interface จาก API_Contract)
- [ ] Integration Test ผ่านสำหรับ Sell Flow (Order + Journal + TaxDoc สำเร็จในชุดเดียว)
- [ ] ไม่มีช่องโหว่ที่ทำให้ API ข้ามระดับ Role สิทธิ์การใช้งานได้
