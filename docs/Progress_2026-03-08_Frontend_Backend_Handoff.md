# Frontend Progress & Backend Handoff

**Date:** 2026-03-08
**Project:** fitnessLA Phase 1
**Scope of this note:** สรุปสิ่งที่ทำในฝั่ง Frontend Owner วันนี้, สถานะการเชื่อมต่อกับ Backend Plan A, สิ่งที่ยังไม่ทำ, และจุดที่สามารถกลับมาต่อได้ทันทีเมื่อ backend เพิ่ม

> Reality Sync Update (2026-03-10)
>
> เอกสารนี้เป็น snapshot ของสถานะวันที่ 2026-03-08 และยังมีคุณค่าในฐานะ handoff ฝั่ง Frontend แต่มีบางส่วนที่ล้าสมัยเมื่อเทียบกับโค้ดปัจจุบัน
>
> สถานะล่าสุดที่ต้องถือเป็นจริงเพิ่มจากเอกสารนี้คือ:
>
> - Backend มี route จริงแล้วสำหรับ `GET /api/auth/session`, `GET /api/v1/shifts/active`, `POST /api/v1/expenses`, `POST /api/v1/admin/users`, `POST /api/v1/shifts/close`, และ `GET /api/v1/reports/daily-summary`
> - Frontend `real-app-adapter.ts` ต่อจริงแล้วสำหรับ `products`, `open shift`, `close shift`, `orders`, `daily summary`, และ `expenses`
> - Frontend เริ่มมี session bridge และ active shift bootstrap สำหรับโหมด `real` แล้ว แต่ยังไม่ใช่ Better Auth browser flow สมบูรณ์
> - จุดที่ยังค้างหลักจริง ๆ ตอนนี้คือ auth flow ตัวจริง, COA APIs, report APIs ที่เกิน daily summary, export APIs, และ admin workflow ที่ยัง mismatch กับ backend ปัจจุบัน
> - สำหรับภาพรวมล่าสุดแบบละเอียด ให้ใช้อ้างอิงร่วมกับ `docs/Analysis_2026-03-10_Frontend_Backend_Integration_Status.md`

---

## 1. Executive Summary

วันนี้งานฝั่ง Frontend ขยับจาก mock-first scaffold ไปสู่สถานะที่เป็นระบบมากขึ้นทั้งในเชิง UX และสถาปัตยกรรม โดยมี 3 แกนหลักที่เสร็จชัดเจน:

1. สร้าง operational frontend ที่ใช้งานได้จริงในโหมด mock-first สำหรับ login, dashboard, shift, POS, petty cash, daily summary, COA และ admin users
2. ปรับ UI ให้เป็นภาษาไทย พร้อมธีมดำเหลือง และเพิ่มตำแหน่งวางโลโก้ เพื่อให้หน้าใช้งานพร้อมใช้เป็นแบรนด์จริงได้มากขึ้น
3. แยก data access ออกจากหน้า UI ด้วย adapter layer เพื่อเตรียมการสลับจาก mock ไป backend จริงของ Plan A โดยไม่ต้องรื้อหน้าจอใหม่ทั้งก้อน

ผลคือ ตอนนี้ frontend ไม่ได้ติดอยู่กับ mock API แบบ hard-coded แล้ว แต่มีโครงรองรับการต่อ backend ตาม contract ที่ล็อกไว้แล้วบางส่วน และรู้ชัดเจนว่าส่วนไหนยังต้องรอ Plan A หรือ contract เพิ่ม

---

## 2. สิ่งที่ทำเสร็จวันนี้

### 2.1 Theme, Branding, และภาษาไทย

มีการเปลี่ยนภาพรวมของระบบจาก scaffold เดิมไปเป็นธีมดำเหลือง โดยใช้ design token กลางใน [src/app/globals.css](src/app/globals.css)

สิ่งที่ทำแล้ว:

- เปลี่ยนสีหลักของระบบเป็นดำ, เหลือง, warning amber และ surface สีเข้ม
- ปรับ background ให้มี layer และ gradient แทนพื้นเรียบ
- เพิ่ม component ช่องวางโลโก้ใน [src/components/branding/logo-slot.tsx](src/components/branding/logo-slot.tsx)
- นำ logo slot ไปใช้ในหน้า login และ app shell
- แปลข้อความหลักในหน้าที่ผู้ใช้เห็นจริงให้เป็นภาษาไทยเกือบทั้งหมด

ผลกระทบเชิงงาน:

- หน้าระบบพร้อมสำหรับการเดโมกับ stakeholder ภาษาไทยมากขึ้น
- มีจุดวางแบรนด์จริงไว้แล้ว โดยอนาคตสามารถแทน `LOGO` ด้วยรูปหรือ component จริงได้เลย
- UI มีทิศทางภาพที่ชัด ไม่ใช่ default scaffold แล้ว

### 2.2 App Shell และ Guard Layer

ฝั่ง authenticated area ถูกจัดโครงชัดเจนแล้วใน [src/app/(app)/layout.tsx](src/app/(app)/layout.tsx), [src/components/layout/app-shell.tsx](src/components/layout/app-shell.tsx), [src/components/guards/auth-guard.tsx](src/components/guards/auth-guard.tsx), [src/components/guards/role-guard.tsx](src/components/guards/role-guard.tsx), และ [src/components/guards/shift-guard.tsx](src/components/guards/shift-guard.tsx)

สิ่งที่ทำแล้ว:

- มี shell กลางสำหรับหน้าที่ต้อง login
- มี navigation แยกตาม role
- มี badge สถานะผู้ใช้และสถานะกะ
- มี auth guard สำหรับ unauthenticated state
- มี role guard สำหรับหน้า owner/admin-only
- มี shift guard สำหรับหน้า POS และ petty cash

ผลกระทบเชิงงาน:

- flow ฝั่ง UI ถูกบังคับตาม requirement ของ Phase 1 แล้ว
- user role ที่ต่างกันเห็นเมนูไม่เหมือนกัน
- cashier จะไม่สามารถเข้าหน้าที่ไม่ควรเข้าผ่าน UI ปกติได้

### 2.3 Login และ Mock Session Flow

หน้า login ถูกปรับเป็นภาษาไทยและใช้กับ mock session flow ต่อไปใน [src/app/login/page.tsx](src/app/login/page.tsx) โดย provider หลักอยู่ใน [src/features/auth/mock-session-provider.tsx](src/features/auth/mock-session-provider.tsx) และ storage state อยู่ใน [src/features/auth/mock-session-storage.ts](src/features/auth/mock-session-storage.ts)

สิ่งที่ทำแล้ว:

- หน้า login รองรับ demo users ตาม role
- แสดง error/loading state เป็นภาษาไทย
- login สำเร็จแล้ว redirect ไป dashboard
- session state persist ใน localStorage แบบ stable
- มี switch role สำหรับงาน mock/review/debug

ผลกระทบเชิงงาน:

- ทีม frontend สามารถเดิน flow ต่อได้โดยไม่รอ Better-Auth ของจริง
- test และ runtime ใช้ session source ชุดเดียวกัน
- พฤติกรรม session มีเสถียรภาพมากขึ้นสำหรับ test suite

### 2.4 Shift Workflow

หน้ากะถูกทำให้พร้อมใช้งานจริงในระดับ mock-first แล้วใน [src/app/(app)/shift/open/page.tsx](src/app/(app)/shift/open/page.tsx) และ [src/app/(app)/shift/close/page.tsx](src/app/(app)/shift/close/page.tsx)

สิ่งที่ทำแล้ว:

- หน้าเปิดกะรับ `starting_cash`
- หน้าเปิดกะอัปเดต session state เมื่อเปิดสำเร็จ
- หน้าปิดกะทำ blind drop ตาม requirement
- ก่อน submit จะไม่แสดง `expected_cash`
- หลัง submit สำเร็จจะแสดง expected cash, actual cash, difference และ journal entry reference
- หลังปิดกะสำเร็จ result panel ยังอยู่ให้ตรวจสอบได้

ผลกระทบเชิงงาน:

- requirement สำคัญเรื่อง blind drop ถูก enforce แล้วที่ UI
- flow เปิดกะและปิดกะพร้อมต่อ backend ตาม contract ที่ล็อกแล้ว

### 2.5 POS และ Cart

หน้า POS อยู่ใน [src/app/(app)/pos/page.tsx](src/app/(app)/pos/page.tsx) และ cart store อยู่ใน [src/features/pos/cart-store.ts](src/features/pos/cart-store.ts)

สิ่งที่ทำแล้ว:

- แสดงสินค้าและค้นหาสินค้าได้
- เพิ่ม/ลด/ลบรายการใน cart ได้
- คำนวณ subtotal ได้
- เลือก payment method ได้
- รองรับ customer info optional
- checkout สำเร็จแล้วแสดง order number, tax document number และยอดรวม
- รองรับ keyboard shortcuts หลัก

keyboard shortcuts ที่มีแล้ว:

- `Ctrl/Cmd + K` โฟกัสช่องค้นหา
- `F2` เพิ่มสินค้าตัวแรกที่มองเห็น
- `Alt + 1/2/3` เปลี่ยนวิธีชำระเงิน
- `Ctrl/Cmd + Enter` สั่งคิดเงิน
- `Escape` ล้างตะกร้า

ผลกระทบเชิงงาน:

- POS มีพื้นฐานที่ใช้ทดสอบงานหน้าเคาน์เตอร์ได้จริง
- payload shape พร้อมต่อกับ order endpoint ของ Plan A

### 2.6 Petty Cash

หน้า petty cash อยู่ใน [src/app/(app)/expenses/page.tsx](src/app/(app)/expenses/page.tsx) และ validation อยู่ใน [src/features/expenses/receipt-validation.ts](src/features/expenses/receipt-validation.ts)

สิ่งที่ทำแล้ว:

- บังคับว่าต้องมีกะก่อนใช้งาน
- กรอกจำนวนเงิน, รายละเอียด, เลือกบัญชีรายจ่าย, แนบรูปใบเสร็จ
- preview รูปใบเสร็จได้
- ตรวจ file type และ file size ฝั่ง frontend ได้
- ส่งผ่าน adapter ได้

ผลกระทบเชิงงาน:

- petty cash flow พร้อมต่อ backend ในเชิง UI และ validation
- ตอนนี้ account list ยังใช้ adapter mock state เพราะ COA API จริงยังไม่ล็อก

### 2.7 Daily Summary และ Report Placeholders

หน้ารายงานที่มีแล้ว:

- [src/app/(app)/reports/daily-summary/page.tsx](src/app/(app)/reports/daily-summary/page.tsx)
- [src/app/(app)/reports/shift-summary/page.tsx](src/app/(app)/reports/shift-summary/page.tsx)
- [src/app/(app)/reports/profit-loss/page.tsx](src/app/(app)/reports/profit-loss/page.tsx)
- [src/app/(app)/reports/general-ledger/page.tsx](src/app/(app)/reports/general-ledger/page.tsx)
- [src/components/reports/report-placeholder.tsx](src/components/reports/report-placeholder.tsx)

สิ่งที่ทำแล้ว:

- daily summary ใช้ adapter แล้ว และ map กับ contract ที่ล็อกไว้
- มี loading, success, empty, error states
- รายงานที่ยังไม่มี contract เต็มถูกทำเป็น placeholder shell ที่บอกชัดว่ารออะไรจาก backend
- export buttons มี UI state placeholder แล้ว

ผลกระทบเชิงงาน:

- daily summary เป็นหน้าที่พร้อมต่อของจริงมากที่สุดในฝั่ง report
- shift summary / P&L / GL มี layout รอไว้แล้ว จึงไม่ต้องเริ่มจากศูนย์เมื่อ contract มา

### 2.8 COA และ Admin Users แบบลึกขึ้น

หน้าจอที่ขยายแล้ว:

- [src/app/(app)/coa/page.tsx](src/app/(app)/coa/page.tsx)
- [src/app/(app)/admin/users/page.tsx](src/app/(app)/admin/users/page.tsx)

สิ่งที่ทำแล้ว:

- เปลี่ยนจาก local mock state แบบฝังในหน้า ไปเป็น adapter-backed state
- เพิ่ม search
- เพิ่ม filter ตามประเภท/สถานะ
- เพิ่ม validation ตอน create
- เพิ่ม empty state เมื่อค้นหาไม่เจอ
- เพิ่ม status message เมื่อ create/approve/toggle สำเร็จ
- เพิ่ม loading state ระหว่าง fetch

ผลกระทบเชิงงาน:

- UX ของสองหน้านี้พร้อมสำหรับ backend integration มากขึ้น
- เมื่อ Plan A ส่ง endpoint จริงมา สามารถเปลี่ยน implementation ใน adapter แทนการรื้อทั้งหน้าได้

### 2.9 Adapter Architecture

นี่คือการเปลี่ยนเชิงสถาปัตยกรรมที่สำคัญที่สุดของวันนี้ โดยเพิ่มไฟล์:

- [src/features/adapters/types.ts](src/features/adapters/types.ts)
- [src/features/adapters/adapter-provider.tsx](src/features/adapters/adapter-provider.tsx)
- [src/features/adapters/mock-app-adapter.ts](src/features/adapters/mock-app-adapter.ts)
- [src/features/adapters/real-app-adapter.ts](src/features/adapters/real-app-adapter.ts)

สิ่งที่ทำแล้ว:

- นิยาม `AppAdapter` กลางสำหรับ auth, products, shifts, orders, expenses, daily summary, COA, admin user requests
- ทำ mock implementation ที่เก็บ state ภายใน adapter เอง
- ทำ real adapter skeleton ที่เรียก endpoint ที่มี contract แล้ว และคืน `NOT_IMPLEMENTED` สำหรับส่วนที่ยังไม่มี contract
- ผูก adapter เข้า root layout ผ่าน [src/app/layout.tsx](src/app/layout.tsx)
- ย้าย consumer หลักหลายหน้าให้เรียก adapter แทนเรียก mock API ตรงๆ

ผลกระทบเชิงงาน:

- ระบบพร้อมสลับ data source ระหว่าง mock กับ real
- ลดการผูกหน้า UI เข้ากับ mock implementation โดยตรง
- ทำให้ backend handoff รอบต่อไปง่ายขึ้นมาก

### 2.10 Frontend Tests และ Validation Pipeline

มีการเพิ่มและอัปเดต test suite ฝั่ง frontend ใน [tests/frontend](tests/frontend)

ไฟล์ test หลักที่มีแล้ว:

- [tests/frontend/cart-store.test.ts](tests/frontend/cart-store.test.ts)
- [tests/frontend/receipt-validation.test.ts](tests/frontend/receipt-validation.test.ts)
- [tests/frontend/shift-guard.test.tsx](tests/frontend/shift-guard.test.tsx)
- [tests/frontend/close-shift-blind-drop.test.tsx](tests/frontend/close-shift-blind-drop.test.tsx)
- [tests/frontend/pos-keyboard-shortcuts.test.tsx](tests/frontend/pos-keyboard-shortcuts.test.tsx)
- [tests/frontend/report-placeholders.test.tsx](tests/frontend/report-placeholders.test.tsx)
- [tests/frontend/coa-page.test.tsx](tests/frontend/coa-page.test.tsx)
- [tests/frontend/admin-users-page.test.tsx](tests/frontend/admin-users-page.test.tsx)
- [tests/frontend/test-utils.tsx](tests/frontend/test-utils.tsx)
- [tests/setup.ts](tests/setup.ts)

validation ล่าสุดที่ผ่านแล้ว:

- `npm test` ผ่าน 16 tests
- `npm run lint` ผ่าน
- `npm run build` ผ่าน

---

## 3. วันนี้ต่ออะไรกับ Backend Plan A แล้วบ้าง

ส่วนนี้สำคัญที่สุดสำหรับ handoff รอบหน้า

อ้างอิง Plan A จาก [docs/Plan_Person_A.md](docs/Plan_Person_A.md)

### 3.1 สิ่งที่ “ต่อแล้วในเชิงสถาปัตยกรรม”

แม้ backend จริงยังไม่มา แต่ตอนนี้ frontend ถูกจัดให้พร้อมต่อกับ Plan A แล้วในระดับโครงสร้างสำหรับ endpoint ที่ contract ชัดเจน

#### A. Products

Plan A ระบุว่าจะมี API สำหรับ product query และ frontend ตอนนี้ผูก real adapter ไว้แล้วที่:

- `GET /api/v1/products`

หน้าที่พร้อมใช้ endpoint นี้:

- [src/app/(app)/pos/page.tsx](src/app/(app)/pos/page.tsx)

ความหมายเชิง handoff:

- ถ้า Plan A ส่ง endpoint นี้ตาม contract หน้า POS จะเปลี่ยนจาก mock ไป real ได้ผ่าน adapter โดยไม่ต้องรื้อ UI

#### B. Open Shift

real adapter รองรับ:

- `POST /api/v1/shifts/open`

หน้าที่พร้อมรับผลลัพธ์นี้:

- [src/app/(app)/shift/open/page.tsx](src/app/(app)/shift/open/page.tsx)

ความหมายเชิง handoff:

- frontend เตรียม payload `starting_cash` ตาม flow แล้ว
- เมื่อ backend พร้อม หน้าเปิดกะใช้ contract เดิมต่อได้เลย

#### C. Close Shift

real adapter รองรับ:

- `POST /api/v1/shifts/close`

หน้าที่พร้อมใช้:

- [src/app/(app)/shift/close/page.tsx](src/app/(app)/shift/close/page.tsx)

ความหมายเชิง handoff:

- blind drop behavior ถูกจัดการฝั่ง UI แล้ว
- Plan A ต้องคำนวณ expected cash, difference และ journal entry ตามแผน backend แล้วส่งผลกลับมาให้ตรง contract

#### D. Orders / Sell Flow

real adapter รองรับ:

- `POST /api/v1/orders`

หน้าที่พร้อมใช้:

- [src/app/(app)/pos/page.tsx](src/app/(app)/pos/page.tsx)

ความหมายเชิง handoff:

- frontend ส่ง payload order ตาม contract แล้ว
- Plan A แค่ทำ atomic sell flow ด้าน backend ตามแผนของตัวเองให้ครบ Order + Journal + TaxDoc

#### E. Daily Summary

real adapter รองรับ:

- `GET /api/v1/reports/daily-summary?date=...`

หน้าที่พร้อมใช้:

- [src/app/(app)/reports/daily-summary/page.tsx](src/app/(app)/reports/daily-summary/page.tsx)

ความหมายเชิง handoff:

- daily summary เป็นหน้า report ที่พร้อมเชื่อมของจริงมากที่สุดตอนนี้
- ถ้า backend ส่ง DTO ตาม contract หน้าไม่ต้องปรับ layout หลัก

### 3.2 สิ่งที่ “ยังไม่ได้ต่อของจริง” แต่เตรียมทางไว้แล้ว

#### A. Auth / Better-Auth Bridge

Plan A ต้องทำ Better-Auth integration จริง แต่ frontend ตอนนี้ยังใช้ mock login

Reality sync 2026-03-10:

- มี `GET /api/auth/session` และ session bridge ชั่วคราวแล้ว
- Frontend เริ่ม bootstrap session ในโหมด `real` ได้แล้ว
- แต่ login/logout/session persistence แบบ Better Auth จริงยังไม่ครบ

สิ่งที่เตรียมไว้แล้ว:

- provider structure
- authenticated / unauthenticated states
- guard ทั้งระบบ
- adapter entry point สำหรับ `authenticateUser`

สิ่งที่ยังไม่ต่อจริง:

- real login route
- real session fetch
- cookie/session persistence ของ Better-Auth
- middleware/server auth enforcement

#### B. COA APIs

Plan A ระบุชัดว่ายังต้องทำ COA CRUD แต่ contract ยังไม่ล็อก

สิ่งที่ frontend เตรียมไว้แล้ว:

- list/create/toggle UI
- validation state
- search/filter
- loading/error/empty states
- adapter methods รอ implementation

สิ่งที่ยังไม่ต่อจริง:

- list chart of accounts endpoint
- create account endpoint
- update/toggle account endpoint
- locked account business rules จาก backend

#### C. Admin/User Management APIs

Plan A ระบุว่าจะมี RBAC admin flow แต่ API จริงยังไม่ถูกส่งมา

Reality sync 2026-03-10:

- ปัจจุบัน backend มี `POST /api/v1/admin/users` สำหรับสร้าง user โดยตรงแล้ว
- แต่ยังไม่มี request queue / approval flow ให้ตรงกับ UI ปัจจุบัน

สิ่งที่ frontend เตรียมไว้แล้ว:

- create user request form
- approve request action
- role filter / status filter
- adapter methods รอ implementation

สิ่งที่ยังไม่ต่อจริง:

- create employee account endpoint
- approve account endpoint
- policy matrix ที่ backend enforce จริง

#### D. Expense Upload จริง

frontend มี petty cash form พร้อมแล้ว และตอนนี้ real adapter เริ่มส่ง multipart ไป `POST /api/v1/expenses` ได้แล้ว

Reality sync 2026-03-10:

- backend route รองรับทั้ง JSON และ multipart request แล้ว
- แต่ feature นี้ยังไม่ถือว่าจบ เพราะ COA source จริงและ storage semantics ของ receipt ยังไม่ล็อกครบ

สิ่งที่ Plan A ต้องส่งเพิ่ม:

- COA API สำหรับดึงบัญชีรายจ่ายจริง
- form field naming ที่เป็น final version ของ multipart
- receipt storage strategy เช่น Supabase bucket ตาม Plan A

#### E. Reports Beyond Daily Summary

frontend มี shell แล้ว แต่ยังไม่ต่อจริงเพราะ backend contract ยังไม่ครบสำหรับ:

- shift summary
- P&L
- general ledger
- export endpoints

---

## 4. Mapping ตรงกับ Plan A ทีละหัวข้อ

### A-1 Infrastructure & Auth

Plan A:

- Better-Auth integration
- RBAC admin flow
- schema และ validation

สถานะฝั่ง frontend:

- มี login UI แล้ว
- มี guard และ role-based navigation แล้ว
- มี admin console UI แล้ว
- ยังไม่เชื่อม Better-Auth จริง
- ยังไม่เชื่อม real session endpoint

สรุป: **พร้อมรับ backend auth แต่ยังไม่ได้ต่อจริง**

### A-2 Accounting Engine

Plan A:

- journal posting
- atomic order transaction

สถานะฝั่ง frontend:

- order create flow พร้อมแล้ว
- close shift result panel รองรับ discrepancy และ journal entry id แล้ว
- daily summary และ report shell พร้อมรองรับข้อมูลผลลัพธ์ทางบัญชี

สรุป: **frontend พร้อมแสดงผล แต่ accounting engine ยังอยู่ฝั่ง backend ทั้งหมด**

### A-3 Document Sequence Logic

Plan A:

- running number และ race-condition safe sequence

สถานะฝั่ง frontend:

- หน้า POS success state รองรับ `order_number` และ `tax_doc_number` แล้ว

สรุป: **frontend รอรับเลขเอกสารจาก backend อย่างเดียว**

### A-4 Shift Discrepancy Logic

Plan A:

- expected cash calculation
- shortage/overage posting

สถานะฝั่ง frontend:

- blind drop UX ถูกจัดการแล้ว
- result panel แสดง expected/actual/difference/journal entry ได้แล้ว

สรุป: **frontend พร้อม consume output ของ discrepancy engine แล้ว**

### A-5 Backend Tests

Plan A:

- endpoint tests
- document sequence tests
- journal tests

สถานะฝั่ง frontend:

- ฝั่ง UI มี regression tests สำหรับ guard, blind drop, POS shortcuts, receipt validation, COA/Admin, reports แล้ว

สรุป: **frontend มี safety net ของตัวเองแล้ว แต่ backend tests ยังต้องทำโดย Plan A**

---

## 5. สิ่งที่ยังไม่ได้ทำ

ส่วนนี้คือ backlog ที่ยังเหลือชัดๆ

### 5.1 ยังไม่ได้ทำฝั่ง frontend จริงๆ

- ยังไม่ได้เปลี่ยนจาก mock session ไป Better-Auth session จริง
- ยังไม่ได้ทำ real adapter สำหรับ expense upload multipart
- ยังไม่ได้ต่อ COA APIs จริง
- ยังไม่ได้ต่อ Admin account management APIs จริง
- ยังไม่ได้ต่อ shift summary report จริง
- ยังไม่ได้ต่อ P&L report จริง
- ยังไม่ได้ต่อ general ledger report จริง
- ยังไม่ได้ต่อ export CSV/XLSX จริง
- ยังไม่ได้ทำ tax document detail/print flow
- ยังไม่ได้เปลี่ยนข้อความย่อยทุกจุดใน utility validation ให้เป็นไทยทั้งหมด เช่นข้อความใน [src/features/expenses/receipt-validation.ts](src/features/expenses/receipt-validation.ts) ยังเป็นอังกฤษ
- ยังไม่ได้มี real logo asset หรือ image upload/branding config สำหรับ logo

### 5.2 ยังไม่ได้ทำเพราะต้องรอ Plan A หรือ contract เพิ่ม

- Better-Auth server integration
- `/api/v1/session` หรือ session bridge จริง
- COA CRUD contracts ที่ล็อกแล้ว
- user management / approval contracts ที่ล็อกแล้ว
- expense upload contract ที่ชัดเรื่อง multipart
- shift summary response contract
- P&L response contract
- general ledger response contract
- export response behavior และชื่อไฟล์
- policy ของ unauthorized/forbidden responses จาก backend

---

## 6. สิ่งที่ควรทำต่อทันทีเมื่อ backend เพิ่ม

ลำดับนี้เป็นลำดับแนะนำเพื่อให้กลับมาต่อได้ง่ายที่สุด

### Step 1: ต่อ endpoint ที่ Plan A ล็อกแล้วก่อน

เมื่อ backend พร้อม ให้เริ่มจาก adapter ก่อน ไม่ใช่แก้หน้าจอ

ลำดับแนะนำ:

1. auth/session bridge
2. products
3. shifts open/close
4. orders
5. daily summary

งานที่จะทำ:

- เปิด `NEXT_PUBLIC_APP_ADAPTER=real`
- เติม implementation ใน [src/features/adapters/real-app-adapter.ts](src/features/adapters/real-app-adapter.ts)
- ทดสอบ flow จริงแต่ละหน้าโดยยังคง test suite ฝั่ง UI ไว้

### Step 2: เปลี่ยน session จาก mock ไป Better-Auth จริง

สิ่งที่ต้องแก้:

- `authenticateUser`
- provider/session source
- logout
- role/session refresh logic
- possibly middleware integration ใน Next app

### Step 3: ต่อ COA และ Admin APIs

เมื่อ contract มาแล้ว:

- แก้ implementation ใน real adapter
- map field names ให้ตรงกับ backend DTO จริง
- เพิ่ม tests ระดับ integration UI สำหรับ loading/error/success ของ API จริง

### Step 4: ต่อ expense upload จริง

เมื่อ backend ระบุ multipart shape แล้ว:

- เปลี่ยน `createExpense` ใน real adapter จาก not implemented เป็น multipart request จริง
- ตรวจ field names และ receipt upload path ให้ตรงกับ backend

### Step 5: เติม report APIs ที่เหลือ

เมื่อ shift summary / P&L / GL contracts มา:

- ใช้ placeholder pages เดิมเป็นฐาน
- เติม filter form จริง
- เติม table/chart state จริง
- ต่อ export action จริง

---

## 7. ความเสี่ยงและข้อควรระวังรอบถัดไป

- อย่าผูกหน้า UI กลับไปเรียก mock data ตรงๆ อีก ควรผ่าน adapter เท่านั้น
- ถ้า Better-Auth จริงมาแล้ว ต้องระวังไม่ให้ logic ใน `mock-session-provider` ปะปนกับ provider ใหม่จน state ซ้อนกัน
- COA และ admin user flows ตอนนี้ใช้ mock business rules หาก backend ส่ง validation rule ต่างไป ต้องปรับเฉพาะ adapter/error mapping และบาง validation message
- petty cash ตอนนี้ดึงบัญชีรายจ่ายจาก COA mock state ดังนั้นเมื่อ COA API จริงมา ต้องตรวจว่าบัญชี `EXPENSE` ที่ active ถูกส่งมาในรูปแบบที่ตรงกับ dropdown หรือไม่
- report placeholder ตอนนี้เป็นเพียง shell ไม่ควรตีความว่า ready for production integration ถ้ายังไม่มี contract response ที่ชัด

---

## 8. Current Validation Snapshot

สถานะที่ผ่านล่าสุด ณ วันที่ 2026-03-08:

- `npm test` ผ่าน 16 tests
- `npm run lint` ผ่าน
- `npm run build` ผ่าน

ความหมาย:

- โค้ดปัจจุบัน build ได้
- regression หลักของ frontend ที่มีอยู่ตอนนี้ไม่พัง
- adapter refactor และธีม/ภาษาไทยรอบนี้ไม่ทำให้ baseline พัง

---

## 9. Recommended Next Session Checklist

ถ้ากลับมาทำต่อในรอบหน้า ให้เริ่มตามนี้:

1. อ่านไฟล์นี้ก่อน
2. เช็กว่า Plan A ส่ง endpoint ไหนเพิ่มแล้วบ้าง
3. เริ่มแก้ที่ [src/features/adapters/real-app-adapter.ts](src/features/adapters/real-app-adapter.ts)
4. เปิดทดสอบหน้าที่เกี่ยวข้องทีละหน้า
5. รัน `npm test`
6. รัน `npm run lint`
7. รัน `npm run build`

ถ้า Plan A ยังไม่ส่ง backend เพิ่ม งานที่ยังทำต่อได้ฝั่ง frontend โดยไม่ block มีดังนี้:

- เก็บข้อความไทยที่ยังเหลือเป็นอังกฤษให้ครบ
- ใส่โลโก้จริงหรือระบบ branding config
- เพิ่ม skeleton/loading polish ในบางหน้า
- เพิ่ม test coverage สำหรับ dashboard, login, daily summary, และ auth guard
- ออกแบบ state machine สำหรับ API error mapping ที่ละเอียดขึ้น

---

## 10. Final Status

สรุปแบบตรงที่สุด:

วันนี้ frontend ทำเกินระดับ scaffold ไปแล้ว และเข้าสู่สถานะ **mock-first application with backend handoff architecture**

Reality sync 2026-03-10:

- สถานะนี้ยังจริงในเชิงสถาปัตยกรรม แต่เริ่มมี `real` integration bridge แล้วบางส่วน
- backend core พร้อมกว่าที่ note วันที่ 2026-03-08 ระบุไว้ โดยเฉพาะ session bridge, active shift, expenses, close shift, daily summary และ admin user creation
- อย่างไรก็ดีทั้งระบบยังไม่ใช่ end-to-end real mode สมบูรณ์ เพราะ auth จริง, COA APIs, report APIs อื่น, export และ admin workflow ยังไม่ครบ

สิ่งที่พร้อมแล้ว:

- operational UI หลัก
- ไทย + ธีมดำเหลือง + ช่องโลโก้
- adapter separation
- COA/Admin ลึกขึ้น
- test/lint/build ผ่าน

สิ่งที่พร้อมต่อกับ Plan A แล้ว:

- products
- shifts open/close
- orders
- daily summary
- auth/session bridge ในเชิงโครงสร้าง

สิ่งที่ยังค้าง:

- Better-Auth จริง
- session จริง
- COA APIs จริง
- Admin APIs จริง
- expense upload จริง
- reports อื่นนอกจาก daily summary
- export flows

ถ้า backend เพิ่มในวันหลัง งานฝั่ง frontend สามารถกลับมาต่อได้โดยเริ่มจาก adapter layer เป็นหลัก ไม่จำเป็นต้องรื้อ UI จากศูนย์อีก