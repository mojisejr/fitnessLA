# Mission Blueprint: Person B (Operations Flow & Frontend Owner)
**Project:** fitnessLA | Phase 1
**Status:** ✅ Phase 1 Frontend Foundation Completed (Mocked-First)
**Role:** Frontend / UI Design / Workflow Guard

---

## 🎯 Primary Objectives
1.  **Fast Operations:** [DONE] หน้าเคาน์เตอร์ POS รองรับ Keyboard Shortcuts พร้อม Jotai Store
2.  **Enforced Logic:** [DONE] Shift Workflow แบบ Blind Drop และ Expenses แบบบังคับรูปภาพ
3.  **Owner Readability:** [DONE] Dashboards และ Reports พื้นฐาน (COA, P&L, Shift Summary)

---

## 📚 Shared Records (The Contracts)
*   **API Interface:** [API_Contract.md](projects/fitnessLA/API_Contract.md) (ขยับไปใช้ [real-app-adapter.ts](src/features/adapters/real-app-adapter.ts) เมื่อ Backend พร้อม)
*   **Interface Mocking:** [DONE] ใช้ `mock-app-adapter.ts` เป็น Ground Truth ของ UI ในช่วงแรก

---

## 🛠️ Implementation Specs (Step-by-Step)

### B-0. Git & Testing Initiation (IMPORTANT)
- [x] แตก Branch ใหม่จาก `staging` โดยใช้ชื่อรูปแบบ: `feat/agent-b-[feature-name]`
- [x] **Vitest Setup:** ไฟล์ Test ทั้งหมดอยู่ใน `tests/frontend/`
- [x] เมื่อเสร็จงานย่อย ให้ Pull `staging` เข้าหาตัวก่อนส่ง PR ทุกครั้ง

### B-1. Layout & Auth UI (Better-Auth + RBAC)
- [x] **Auth Flow:** หน้า Login และการจำลอง Mock Session ผ่าน Context Provider
- [x] **Admin Console:** หน้าจอ ADMIN จัดการ Users (`/admin/users`) พร้อม UI สำหรับ Create/Update
- [x] **App Structure:** Sidebar, Topbar พร้อมการจัดการ Permission (Owner เห็นครบ, Cashier เห็นเฉพาะงานหน้างาน)

### B-2. POS & PWA Setup (Serwist)
- [x] **PWA Config:** ติดตั้ง `Serwist` และลงทะเบียน Service Worker เรียบร้อย (Build & PWA Ready)
- [x] **Selection Flow:** หน้าจอ POS (`/pos`) แสดงรายการแยก Category และคีย์บอร์ด Shortcuts [1-9, C, Enter, etc.]
- [x] **Cart State (Jotai):** คำนวณ Subtotal, VAT (7%), และ Total อัตโนมัติ

### B-3. Strict Shift Workflow
- [x] **Open Shift:** UI สำหรับระบุ `starting_cash` พร้อมสถานะ Header Badge
- [x] **Blind Drop Close:** หน้าจอนับเงินจริง (`/shift/close`) ห้ามแสดง Expected ยอด และบันทึก `actual_cash` เท่านั้น
- [x] **Shift Status UI:** Header Badge แสดงเวลาเปิดกะและชื่อพนักงาน

### B-4. Petty Cash Tracking
- [x] **Form Flow:** หน้าบันทึก Expenses บังคับแนบ File (ผ่าน Mock Input) และระบุ Category
- [x] **Image Validation:** ตรวจสอบประเภทและขนาดไฟล์ที่ Frontend ก่อน "Submit"

### B-5. UI Unit Testing (Vitest)
- [x] **Cart Calculation Tests:** [cart-store.test.ts] ทดสอบความถูกต้องของเลขเงิน
- [x] **Shift Guard Tests:** [shift-guard.test.tsx] ป้องกันการเข้า POS ถ้ายังไม่เปิดกะ
- [x] **API Mocking:** ทดสอบการ Render ผ่าน Mock Adapter ครบทุกหลักสำคัญ (16+ Tests)

---

## 🛡️ Definition of Done (DoD)

- [x] หน้าจอ POS ใช้งานได้รวดเร็ว (รองรับ Keyboard Flow หลัก)
- [x] ระบบปิดกะเก็บความลับยอด Expected (Blind Drop) ทำงานตามจริงบน UI
- [x] Dashboards แสดงผลข้อมูลยอดขายและส่วนต่างกะได้ทันที
- [x] ทุกหน้าจอมี Empty, Loading, Success, และ API Error State ตามสัญญา API

---

## 📍 Current Repo Reality Check (As of 2026-03-08)


สถานะจริงของ repository ตอนนี้คือ **Frontend Workflow & UI Completed (Mock-First)** โดย Person B ได้วางรากฐานไว้แน่นหนา ดังนี้:

- **src/app/(app)/:** Scaffold ครบทุก Module (POS, Shift, Expenses, COA, Reports, Admin)
- **src/features/adapters/:** มี Layer สำหรับเรียก API จริงรอไว้แล้ว (`real-app-adapter.ts`)
- **tests/frontend/:** ครอบคลุม Logic สำคัญทั้ง POS, Shift Guard, และ Validation
- **PWA:** ติดตั้ง Serwist และตั้งค่า build process เรียบร้อย

---

## 🚀 Next Phase for Person B: Integration
เมื่อ Backend ของ Person A ทยอยปล่อย API v1 แล้ว งานของ Person B จะเปลี่ยนเป็นการถอด Mock แล้วเสียบปลั๊กจริง ดังนี้:
1. สลับจาก `mock-app-adapter` ไปที่ `real-app-adapter` สำหรับ API ที่พร้อมแล้ว
2. ทดสอบ Integration กับฐานข้อมูลจริง
3. ปรับแต่ง UI ตาม Feedback จากการใช้งานจริง (Polish)

*(Update 2026-03-08: Agent A ประกาศว่า Phase A-1 ถึง A-3 เสร็จสมบูรณ์แล้ว ให้ Agent B เริ่มเชื่อมต่อ `auth`, `products`, `shifts (open/active)`, `orders`, `expenses` ได้ทันที)*
 
สถานะจริงของ repository ตอนนี้คือ **Scaffold Foundation เสร็จแล้ว แต่ Business Implementation ยังไม่เริ่ม** โดยสิ่งที่มีอยู่จริงใน code มีเพียง:

- Next.js App Router shell
- global CSS พื้นฐาน
- PWA service worker scaffold ด้วย Serwist
- dependencies ที่จำเป็นสำหรับงาน Frontend/Backend ถูกติดตั้งแล้ว
- Vitest config พร้อมใช้งาน

สิ่งที่ **ยังไม่มี implementation จริง** ใน repo ตอนนี้:

- Better-Auth flow จริง
- API routes ฝั่ง `/api/v1`
- RBAC middleware จริง
- database schema code / migrations ใน source tree
- shared TypeScript DTOs
- Jotai store ของ cart/shift/session
- business screens ของ Person B ทุกหน้า
- mock server / handlers / frontend tests

ดังนั้น Person B ต้องทำงานแบบ **contract-first + mock-first** ก่อน และค่อยสลับไปเรียก API จริงเมื่อ Person A ส่ง backend ตามสัญญา

---

## ✅ Person B ทำได้ทันทีจากของที่มีตอนนี้

### 1. App Shell และ Navigation Framework
ทำได้ทันทีโดยไม่ต้องรอ backend จริง

- สร้าง layout หลักของระบบ เช่น sidebar, topbar, content shell
- แยกเมนูตาม role จาก mock session
- ทำ unauthorized state, forbidden state, empty shell state
- ทำ shift status badge ที่ header/sidebar โดยอ่านค่าจาก mock `active_shift_id`

ผลลัพธ์ที่ควรได้:

- โครง route กลางของระบบพร้อมใช้งาน
- เปลี่ยนเมนูตาม role ได้

- สลับ state ระหว่าง `OWNER`, `ADMIN`, `CASHIER` ได้จาก mock

### 2. Login Screen UI
ทำได้ทันทีในระดับ UI/UX และ form behavior

- ฟอร์ม username/password
- loading state ตอน submit
- error state ตามรูปแบบ `ApiError`
- success redirect logic แบบ mock

สิ่งที่ยังไม่ต้องผูกจริงตอนนี้:

- Better-Auth server action หรือ auth route จริง
- cookie/session persistence จริง

### 3. Session Adapter ฝั่ง Frontend
ทำได้ทันทีโดยยึด contract `GET /api/session`

- สร้าง TypeScript interface `UserSession`
- สร้าง session provider หรือ session hook
- รองรับ 3 state: loading, authenticated, unauthenticated
- รองรับ role guard และ shift guard ในระดับ UI

ควรออกแบบให้เปลี่ยน data source ได้ 2 แบบ:

- mock session
- real fetch จาก `/api/v1/session` ภายหลัง

### 4. Route Guard และ Screen Guard
ทำได้ทันที

- guard หน้า POS ถ้ายังไม่มีกะเปิด
- guard หน้า petty cash ถ้ายังไม่มีกะเปิด
- guard หน้า COA, P&L, General Ledger ให้เห็นเฉพาะ owner
- guard หน้า report บางตัวให้ admin เข้าถึงได้ตาม policy ที่ตกลงภายหลัง

หมายเหตุ:
ฝั่ง frontend guard ทำเพื่อ UX และลดการทำผิด flow แต่ไม่แทน backend authorization

### 5. POS UI แบบ Mock-First
ทำได้ทันที เพราะ contract ของ `GET /api/products` และ `POST /api/orders` ถูกล็อกแล้ว

- product list/grid
- product search/select
- cart state
- quantity update / remove item
- subtotal/total display
- payment method selection
- customer info form แบบ optional
- submit order flow
- success screen แสดง `order_number`, `tax_doc_number`, `total_amount`
- API error handling จาก `ApiError`

สิ่งที่ทำได้ตอนนี้แม้ backend ยังไม่เสร็จ:

- keyboard flow
- responsive POS layout สำหรับ tablet/desktop
- Jotai cart store
- order payload builder ตาม contract
- mock success / failure cases

### 6. Shift Workflow UI
ทำได้ทันที เพราะ contract เปิด/ปิดกะถูกล็อกแล้ว

- open shift form สำหรับ `starting_cash`
- close shift form สำหรับ `actual_cash`
- blind drop behavior โดยไม่โชว์ `expected_cash` ก่อน submit
- result panel หลังปิดกะสำเร็จที่ค่อยแสดง `expected_cash`, `actual_cash`, `difference`
- warning UI กรณีเงินขาด/เกิน
- shift status banner ตลอดแอป

จุดสำคัญที่ Person B ต้อง enforce เอง:

- ห้าม preload หรือ reveal `expected_cash` ก่อน submit close shift
- ถ้าปิดกะสำเร็จ ต้องปิดการใช้งาน POS/petty cash ทันทีใน UI

### 7. Petty Cash Form UI
ทำได้ทันทีในระดับเต็มเกือบทั้งหมด เพราะ request shape ถูกกำหนดแล้ว

- ฟอร์มจำนวนเงิน
- คำอธิบาย
- เลือกหมวดบัญชีจาก mock data ชั่วคราว
- อัปโหลดรูป
- preview รูป
- file type validation
- file size validation ไม่เกิน 5MB
- submit multipart request builder
- success / error feedback

ส่วนที่ยังต้องใช้ mock ชั่วคราว:

- account list สำหรับ dropdown เนื่องจาก COA API ยังไม่ถูกล็อกใน contract

### 8. Daily Summary Dashboard UI
ทำได้ทันที เพราะ `GET /api/reports/daily-summary` ถูกล็อกแล้ว

- date picker
- cards สำหรับ `total_sales`, `total_expenses`, `net_cash_flow`, `shift_discrepancies`
- sales by method breakdown
- loading / empty / error / success states
- owner-readable summary layout

### 9. Shared Frontend Foundation
ทำได้ทันทีและควรทำก่อน screens ใหญ่

- shared API client shape รองรับ `data` และ `ApiError`
- form field components
- money formatting utility
- status badge components
- role constants / permission mapping
- mock fixtures ตาม DTO ใน contract
- test utilities สำหรับ render screen ด้วย session mock

### 10. Frontend Unit Tests แบบ Mock-Driven
ทำได้ทันที

- cart calculation tests
- shift guard tests
- role navigation tests
- petty cash file validation tests
- close shift blind drop tests
- report card rendering tests

---

## 🟡 Person B ทำได้บางส่วน แต่ยังต้องใช้ Mock หรือ Placeholder

### B-1. Better-Auth Integration
ทำได้ตอนนี้:

- login page UI
- auth form states
- unauthenticated redirect behavior แบบ mock

ยังทำจริงไม่ได้ 100% เพราะยังรอ:

- Better-Auth config ฝั่ง server
- auth endpoints
- session persistence จริง

### B-2. Admin Console
ทำได้ตอนนี้:

- screen shell
- create user form UI
- role selector
- approval list mock

ยังทำจริงไม่ได้ 100% เพราะยังรอ:

- create user API
- approve user API
- backend permission matrix ที่แน่นอน

### B-3. Chart of Accounts UI
ทำได้ตอนนี้:

- list page mock
- create/edit modal mock
- active/inactive badge UI
- owner-only guard

ยังทำจริงไม่ได้ 100% เพราะยังรอ:

- COA list/create/update/toggle endpoints
- validation rules ฝั่ง backend สำหรับบัญชีที่ถูกใช้งานแล้ว

### B-4. Reports Beyond Daily Summary
ทำได้ตอนนี้:

- dashboard shell
- filter UI
- table/chart placeholders
- export button state machine

ยังทำจริงไม่ได้ 100% เพราะยังรอ:

- Shift Summary API
- P&L API
- General Ledger API
- export endpoint contracts

---

## 🔴 Person B ยังต้องรอจาก Person A หรือรอ Contract เพิ่มก่อน

ส่วนนี้ยังไม่ควร hard-code integration จริง เพราะ contract ยังไม่ครบหรือ backend ยังไม่เริ่ม

### 1. COA CRUD Integration จริง
ยังรอ endpoint ที่ชัดเจนสำหรับ:

- list chart of accounts
- create account
- update account
- activate/deactivate account

### 2. Admin Account Management จริง
ยังรอ endpoint และ auth policy สำหรับ:

- create employee account
- approve account
- reset password หรือ activate/deactivate user

### 3. Reporting Suite เต็มรูปแบบ
ยังรอ contract สำหรับ:

- shift summary
- P&L
- general ledger
- report filters และ pagination ถ้ามี

### 4. Export/Download Integration จริง
ยังรอ endpoint และ response behavior สำหรับ:

- csv export
- xlsx export
- filename conventions
- auth/role policy ของการ export

### 5. Tax Document Display/Print Flow
ตอนนี้ contract มีเพียง `tax_doc_number` ในผลลัพธ์ order
ยังรอรายละเอียดถ้าต้องมี:

- document detail endpoint
- printable receipt/tax invoice endpoint
- credit note display flow

### 6. Real Session + Better-Auth Bridge
ยังรอ:

- session source จริง
- login/logout mechanics จริง
- middleware/guard behavior ฝั่ง server

### 7. Product Management หรือ Product Query ที่ซับซ้อนขึ้น
ตอนนี้มีแค่ `GET /api/products` แบบพื้นฐาน
ยังรอถ้าต้องมี:

- search params
- pagination
- category/filter
- stock or availability flags

---

## 📦 Recommended Frontend Deliverables ที่ควรสร้างได้เลยตอนนี้

ถ้าทำงานตามสถานะปัจจุบัน Person B ควรส่งมอบของจริงได้ทันทีดังนี้

### Foundation Layer
- app layout
- role-based navigation shell
- session mock/provider
- role guard / shift guard
- shared API error handling shape

### Operational Screens
- login page UI
- open shift screen
- close shift screen แบบ blind drop
- POS screen พร้อม cart และ payment selection
- petty cash form พร้อม file validation
- daily summary dashboard

### Mock & State Layer
- contract-aligned DTO typings
- mock fixtures
- mock fetch adapters
- Jotai cart store
- screen states: loading, empty, success, error

### Test Layer
- tests/frontend/ cart tests
- tests/frontend/ shift guard tests
- tests/frontend/ petty cash validation tests
- tests/frontend/ POS rendering and submit tests

---

## 🧭 Recommended Build Order For Person B Right Now

เพื่อให้เดินต่อได้ทันทีโดยไม่ block backend ให้ทำตามลำดับนี้

### Phase B-1: Frontend Core
1. shared types จาก API contract
2. mock fixtures และ fake API adapter
3. app shell + navigation + guards

### Phase B-2: Shift + Session Foundation
1. login UI
2. session provider แบบ mock
3. open shift screen
4. close shift blind drop screen

### Phase B-3: POS Flow
1. products mock query
2. cart store ด้วย Jotai
3. payment flow
4. order result screen
5. keyboard shortcuts

### Phase B-4: Petty Cash + Validation
1. expense form
2. receipt validation
3. multipart payload builder
4. success/error state

### Phase B-5: Owner Dashboard
1. daily summary dashboard
2. report shell placeholders สำหรับ shift/P&L/GL
3. export button placeholders

### Phase B-6: Test Coverage
1. cart calculations
2. shift guard
3. blind drop behavior
4. file validation
5. API error rendering

---

## 🗂️ Screen-by-Screen Implementation Checklist

ส่วนนี้แปลงแผนงานให้เป็นรายการทำงานระดับหน้าจอและ component เพื่อให้ Person B ลงมือ build ตามลำดับได้จริง

### Screen 1: App Shell / Main Layout
เป้าหมาย:

- เป็นโครงกลางของทุกหน้าหลัง login
- แสดง navigation, current user, role, และ shift status

Checklist:

- [ ] สร้าง root app shell สำหรับ authenticated area
- [ ] มี sidebar สำหรับ desktop และ stacked navigation สำหรับ mobile
- [ ] มี topbar แสดงชื่อผู้ใช้, role, และสถานะกะ
- [ ] แสดง badge ว่า `OPEN SHIFT` หรือ `NO ACTIVE SHIFT`
- [ ] รองรับ loading shell ตอน session ยังไม่ resolve
- [ ] รองรับ unauthorized state และ fallback state

Dependencies:

- mock session provider
- role mapping constants

Definition of Ready:

- route structure ถูกกำหนดแล้ว
- role menu matrix ถูกกำหนดแล้ว

### Screen 2: Login Screen
เป้าหมาย:

- ให้ผู้ใช้กรอก username/password และเห็น feedback ที่ชัดเจน

Checklist:

- [ ] สร้างฟอร์ม username/password
- [ ] มี disabled state ระหว่าง submit
- [ ] แสดง field error และ API error
- [ ] มี mock success path ไป dashboard
- [ ] มี mock invalid credential state
- [ ] จัด layout ให้รองรับ mobile/tablet/desktop

Dependencies:

- ApiError shape
- session adapter หรือ auth adapter แบบ mock

Definition of Ready:

- route หลัง login ถูกกำหนดแล้ว

### Screen 3: Dashboard Landing / Role Home
เป้าหมาย:

- ให้แต่ละ role ลงที่หน้าที่เหมาะสมทันทีหลัง login

Checklist:

- [ ] OWNER ลงหน้า report overview
- [ ] ADMIN ลงหน้า operations overview หรือ shift page
- [ ] CASHIER ลงหน้า shift gate หรือ POS gate
- [ ] แสดง quick actions ตาม role
- [ ] มี empty state กรณีไม่มีข้อมูลวันนี้

Dependencies:

- role guard
- session mock

### Screen 4: Open Shift
เป้าหมาย:

- ให้พนักงานเปิดกะด้วย starting cash ก่อนใช้งาน POS

Checklist:

- [ ] ฟอร์มกรอก `starting_cash`
- [ ] validate ว่าเป็นตัวเลขและไม่ติดลบ
- [ ] มี submit loading state
- [ ] success state เปลี่ยน session ให้มี `active_shift_id`
- [ ] error state จาก `ApiError`
- [ ] ถ้ามีกะเปิดอยู่แล้วให้ redirect หรือ disable form

Dependencies:

- `POST /api/shifts/open` contract
- session updater

### Screen 5: Close Shift (Blind Drop)
เป้าหมาย:

- ให้พนักงานกรอกเงินจริงโดยไม่เห็น expected cash ก่อนเวลา

Checklist:

- [ ] ฟอร์มกรอก `actual_cash`
- [ ] optional field สำหรับ `closing_note`
- [ ] ห้าม render `expected_cash` ก่อน submit สำเร็จ
- [ ] หลัง submit สำเร็จ แสดง `expected_cash`, `actual_cash`, `difference`
- [ ] แสดง warning สี/ข้อความเมื่อเงินขาดหรือเกิน
- [ ] success แล้วเคลียร์ `active_shift_id` ใน session
- [ ] ล็อก POS และ petty cash flow หลังปิดกะ

Dependencies:

- `POST /api/shifts/close` contract
- shift guard
- session updater

### Screen 6: POS Product Selection
เป้าหมาย:

- ให้พนักงานเลือกสินค้าได้เร็ว

Checklist:

- [ ] ดึงหรือ mock product list ตาม contract
- [ ] แสดง product cards/list ที่กดเลือกได้เร็ว
- [ ] มี product search
- [ ] แสดงราคาและประเภทสินค้า
- [ ] รองรับ empty state กรณีไม่มีสินค้า
- [ ] รองรับ loading state

Dependencies:

- `GET /api/products` contract
- product mock fixtures

### Screen 7: POS Cart & Checkout
เป้าหมาย:

- ให้พนักงานจัดตะกร้าและชำระเงินได้เร็ว

Checklist:

- [ ] เพิ่มสินค้าเข้าตะกร้า
- [ ] เพิ่ม/ลดจำนวน
- [ ] ลบรายการ
- [ ] คำนวณ subtotal/total
- [ ] เลือก payment method
- [ ] optional customer info
- [ ] submit payload ตาม `POST /api/orders`
- [ ] success state แสดงเลข order และ tax document
- [ ] error handling จาก `ApiError`

Dependencies:

- cart store
- order payload builder
- payment method constants

### Screen 8: POS Keyboard Flow
เป้าหมาย:

- ให้ใช้งานหน้าเคาน์เตอร์เร็วจริง

Checklist:

- [ ] shortcut focus search
- [ ] shortcut เลือกสินค้าแบบเร็ว
- [ ] shortcut ไป payment section
- [ ] shortcut submit order
- [ ] shortcut clear cart
- [ ] ป้องกันการ submit ซ้ำ

Dependencies:

- POS state ที่เสถียร
- keyboard event mapping

### Screen 9: Petty Cash Form
เป้าหมาย:

- บันทึกรายจ่ายย่อยพร้อมหลักฐานอย่างถูกต้อง

Checklist:

- [ ] ฟอร์ม amount
- [ ] ฟอร์ม description
- [ ] dropdown เลือก account
- [ ] file picker สำหรับ `receipt_file`
- [ ] preview รูป
- [ ] validate type เป็น JPG/PNG
- [ ] validate ขนาดไม่เกิน 5MB
- [ ] submit multipart form builder
- [ ] success และ error state ชัดเจน
- [ ] block การเข้าใช้งานถ้าไม่มีกะเปิด

Dependencies:

- `POST /api/expenses` contract
- account mock list
- shift guard

### Screen 10: Daily Summary Dashboard
เป้าหมาย:

- ให้ owner/admin เห็นภาพรวมรายวันทันที

Checklist:

- [ ] date picker
- [ ] summary cards
- [ ] sales by payment method breakdown
- [ ] highlight net cash flow
- [ ] loading/empty/error/success states
- [ ] role visibility ตาม policy

Dependencies:

- `GET /api/reports/daily-summary` contract

### Screen 11: Chart of Accounts UI
เป้าหมาย:

- เตรียม owner-facing management screen แบบ mock-first

Checklist:

- [ ] account list table
- [ ] create/edit modal
- [ ] active/inactive badge
- [ ] owner-only guard
- [ ] placeholder action states

Dependencies:

- COA contract เพิ่มเติมจาก Person A

### Screen 12: Report Shells (Shift Summary / P&L / General Ledger)
เป้าหมาย:

- เตรียม layout และ interaction รอ API จริง

Checklist:

- [ ] filter section
- [ ] table/chart shell
- [ ] export button state
- [ ] empty placeholder พร้อมข้อความว่ารอ integration
- [ ] owner-only guard สำหรับ P&L และ GL

Dependencies:

- report contracts เพิ่มเติม
- export contracts เพิ่มเติม

### Screen 13: Admin Console
เป้าหมาย:

- เตรียม shell สำหรับ OWNER/ADMIN จัดการ account

Checklist:

- [ ] create user form
- [ ] role selector
- [ ] pending approval list mock
- [ ] status badge
- [ ] owner/admin guard

Dependencies:

- account management contracts เพิ่มเติม

---

## 🧱 Build Sequence With Real Deliverables

ลำดับนี้ออกแบบให้ทุก phase มีของส่งมอบจริง ไม่ใช่ทำ component กระจัดกระจาย

### Milestone 1: Frontend Core Skeleton
Deliverables:

- [ ] route map
- [ ] authenticated app shell
- [ ] mock session provider
- [ ] role guard
- [ ] shift guard
- [ ] shared DTO types
- [ ] shared API error type

### Milestone 2: Shift Gate Foundation
Deliverables:

- [ ] login screen
- [ ] open shift screen
- [ ] close shift blind drop screen
- [ ] shift status badge ที่ app shell

### Milestone 3: POS Foundation
Deliverables:

- [ ] product listing
- [ ] cart store
- [ ] checkout panel
- [ ] order success state
- [ ] keyboard shortcut base

### Milestone 4: Petty Cash Foundation
Deliverables:

- [ ] expense form
- [ ] receipt validation
- [ ] multipart submit adapter
- [ ] success/error feedback

### Milestone 5: Owner Dashboard Foundation
Deliverables:

- [ ] daily summary dashboard
- [ ] report shells
- [ ] export button placeholders

### Milestone 6: Test Safety Net
Deliverables:

- [ ] cart tests
- [ ] guard tests
- [ ] blind drop tests
- [ ] petty cash file validation tests
- [ ] API error rendering tests

---

## 🚧 Integration Blocking List

Person B จะยังต่อ production integration ไม่ครบจนกว่า Person A จะส่งอย่างน้อยรายการต่อไปนี้

- Better-Auth session endpoint/flow ที่ใช้งานจริง
- COA CRUD endpoints
- account management endpoints
- shift summary report endpoint
- P&L report endpoint
- general ledger endpoint
- csv/xlsx export endpoints
- contract รายละเอียดของ unauthorized/forbidden responses ถ้าต้องแยกจาก `ApiError`

---

## 🧠 Final Interpretation For Person B

ถ้าถามแบบตรงที่สุดว่า **ตอนนี้ Person B implement อะไรได้บ้าง** คำตอบคือ:

- ทำ frontend shell และ UX flow หลักได้เกือบทั้งหมด
- ทำ POS, shift, petty cash, daily summary ได้ในรูปแบบ mock-first แบบจริงจัง
- ทำ state, guards, validation, tests, responsive layout, keyboard flow ได้ทันที
- ทำ integration จริงกับ backend ได้เฉพาะส่วนที่มี contract ล็อกแล้ว

และถ้าถามว่า **ยังรออะไรอีก** คำตอบคือ:

- auth backend จริง
- COA APIs
- admin/user management APIs
- reports อื่นนอกจาก daily summary
- export APIs
- tax document detail/print flow

สรุปสุดท้าย:
**Person B สามารถเริ่มสร้างระบบหน้าจอ Phase 1 ได้ทันทีประมาณ 70-80% ของโครง frontend ทั้งหมด แต่ production integration แบบครบทุกเมนูยังทำไม่ได้จนกว่า Person A จะ lock contract และส่ง backend เพิ่มในส่วนที่ยังหายอยู่**
