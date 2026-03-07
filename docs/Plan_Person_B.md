# Mission Blueprint: Person B (Operations Flow & Frontend Owner)
**Project:** fitnessLA | Phase 1
**Status:** ⚒️ Phase 1 Ready for UI/UX Design
**Role:** Frontend / UI Design / Workflow Guard

---

## 🎯 Primary Objectives
1.  **Fast Operations:** เน้นความไวในงานหน้าเคาน์เตอร์ (Keyboard Shortcuts)
2.  **Enforced Logic:** บังคับพนักงานให้ทำตามกะ (Shift) และแนบหลักฐานค่าใช้จ่าย
3.  **Owner Readability:** หน้า Dashboards สรุปยอดขายรายวันและกะพนักงาน

---

## 📚 Shared Records (The Contracts)
*   **API Interface:** [API_Contract.md](projects/fitnessLA/API_Contract.md) (ต้องทำตาม DTO นี้และ Handle APIError ให้ถูกต้อง)
*   **Interface Mocking:** แนะนำให้ใช้ **Mock Data** ตาม [API_Contract.md](projects/fitnessLA/API_Contract.md) เพื่อจัดหน้าจอให้สวยงามก่อน API เสร็จ

---

## 🛠️ Implementation Specs (Step-by-Step)

### B-0. Git & Testing Initiation (IMPORTANT)
- [ ] แตก Branch ใหม่จาก `staging` โดยใช้ชื่อรูปแบบ: `feat/agent-b-[feature-name]`
- [ ] **Vitest Setup:** ไฟล์ Test ทั้งหมดต้องอยู่ใน `tests/frontend/` ที่ Root เท่านั้น
- [ ] เมื่อเสร็จงานย่อย ให้ Pull `staging` เข้าหาตัวก่อนส่ง PR ทุกครั้ง

### B-1. Layout & Auth UI (Better-Auth + RBAC)
- [ ] **Auth Flow:** หน้า Login (Username/Password) และการ Handle `Session` ผ่าน Better-Auth
- [ ] **Admin Console:** หน้าจอสำหรับ OWNER/ADMIN เพื่อสร้างและรับรอง (Approve) Account พนักงานใหม่
- [ ] **App Structure:** ทำ Layout หลัก (Side Nav/Top Nav) แยกตาม User Role (Owner เห็น Report, Cashier เห็น POS)

### B-2. POS & PWA Setup (Serwist)
- [ ] **PWA Config:** ติดตั้ง `Serwist` เพื่อให้พนักงาน Add to Home Screen และใช้งานบนหน้าจอ Tablet ได้เสถียร
- [ ] **Selection Flow:** แสดงรายการสินค้า (Water, Whey, Member) และมีปุ่ม Shortcuts คีย์บอร์ด
- [ ] **Cart State (Jotai):** จัดการตะกร้าสินค้าและการรวมยอด (Subtotal/VAT/Discount)

### B-3. Strict Shift Workflow
- [ ] **Open Shift:** หน้าจอรับเงินทอนตั้งต้น (`starting_cash`)
- [ ] **Blind Drop Close:** หน้าจอนับเงินจริง (`actual_cash`) **โดยห้ามดึงตัวเลข Expected จาก Backend มาโชว์ก่อนพนักงานคีย์จริง**
- [ ] **Shift Status UI:** แสดงสถานะกะที่ Header/Sidebar ตลอดเวลา

### B-4. Petty Cash Tracking
- [ ] **Form Flow:** หน้าจอบันทึกรายจ่ายย่อย บังคับอัพโหลดรูปภาพ (`receipt_file`) ก่อนกดบันทึก
- [ ] **Image Validation:** ตรวจสอบขนาดไฟล์และประเภทไฟล์ (JPG, PNG) ที่ Frontend ก่อนส่ง API

### B-5. UI Unit Testing (Vitest)
- [ ] **Cart Calculation Tests:** ทดสอบยอดรวม Subtotal/VAT/Discount ในตะกร้าสินค้า
- [ ] **Shift Guard Tests:** ทดสอบ Guard หน้าจอว่า Cashier เข้าหน้า POS ไม่ได้ถ้ายังไม่เปิดกะ
- [ ] **API Mocking:** ใช้ Mock Data จาก Contract เพื่อทดสอบการ Render UI

---

## 🛡️ Definition of Done (DoD)
- [ ] หน้าจอ POS ใช้งานได้รวดเร็ว (รองรับ Keyboard Flow หลัก)
- [ ] ระบบปิดกะเก็บความลับยอด Expected (Blind Drop) ทำงานตามจริงบน UI
- [ ] Dashboards แสดงผลข้อมูลยอดขายและส่วนต่างกะได้ทันที
- [ ] ทุกหน้าจอมี Empty, Loading, Success, และ API Error State ตามสัญญา API
