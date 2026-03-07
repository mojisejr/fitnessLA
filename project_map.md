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
- **Current Phase:** Phase 1 (Accounting Foundation & Cash Control)
- **Latest Update:** 2026-03-08 00:14 (Completed Scaffold Foundation: Next.js shell, dependencies, env template, vitest config, PWA scaffold)
- **Recent Focus:** Phase 1 implementation completed and verified with `npm run build` + `npm run lint`
