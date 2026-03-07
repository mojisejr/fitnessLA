# Work Split Plan for 2 People
**Project:** Gym Management System  
**Phase:** Phase 1 - Accounting Foundation & Cash Control  
**Date:** 2026-03-07

## 1. แนวคิดการแบ่งงานที่เหมาะที่สุดสำหรับทีม 2 คน
ถ้ามีแค่ 2 คน การแบ่งที่ดีที่สุดไม่ใช่แบ่งตามเมนูแบบคนละครึ่ง เพราะทุกเมนูใน Phase 1 ผูกกับบัญชี, กะ, เอกสารภาษี และ transaction เดียวกันหมด ถ้าแบ่งผิดจะเกิดการรอคอยกันตลอด

รูปแบบที่เหมาะที่สุดคือแบ่งตามแกนความรับผิดชอบดังนี้

* **คนที่ 1: Finance Core / Backend Owner**
  รับผิดชอบกฎธุรกิจหลักที่ห้ามพัง ได้แก่ schema, transaction, accounting engine, running number, audit trail, export backend, validation หลัก

* **คนที่ 2: Operations Flow / Frontend Owner**
  รับผิดชอบประสบการณ์ใช้งานจริงของพนักงานและเจ้าของ ได้แก่ POS, เปิด-ปิดกะ, petty cash, report UI, role-based screens, integration flow, UAT flow

สรุปสั้นที่สุดคือ

* คนที่ 1 ดูแลว่า "ข้อมูลต้องถูกต้องเสมอ"
* คนที่ 2 ดูแลว่า "ผู้ใช้ต้องทำงานได้เร็วและไม่สับสน"

---

## 2. โครงสร้างบทบาทที่แนะนำ

### Person A: Finance Core / Backend Owner
ขอบเขตรับผิดชอบหลัก

* Database schema และ migration ทั้งหมด
* Authentication backend และ RBAC rules
* Chart of Accounts backend logic
* Journal posting engine
* Shift calculation logic
* Running number / document sequence logic
* Tax document backend
* Petty cash posting logic
* Reporting query layer และ export service
* Audit trail, status control, validation, DB constraints
* Integration test ฝั่ง backend

เป้าหมายของบทบาทนี้

* ทำให้ข้อมูลบัญชี, เอกสาร, และเงินสดไม่ผิด
* ทำให้ทุก flow อยู่ใน transaction เดียวและ rollback ได้
* ทำให้ frontend มี API ที่เสถียรและชัดเจน

### Person B: Operations Flow / Frontend Owner
ขอบเขตรับผิดชอบหลัก

* Login screen และ permission-based navigation
* Chart of Accounts UI
* Open Shift / Close Shift UI
* POS UI และ keyboard shortcut flow
* Petty Cash form และ file upload UX
* Daily Sales Summary UI
* Shift Summary UI
* P&L / General Ledger UI
* Export buttons และ download flow
* Client-side validation และ error handling
* UAT scripts, smoke test, regression test ฝั่งหน้าจอ

เป้าหมายของบทบาทนี้

* ทำให้พนักงานใช้งานได้เร็วและไม่ทำผิด flow
* ทำให้ blind drop, receipt required, role restriction ถูก enforce ที่ UI ด้วย
* ทำให้ owner อ่านรายงานและตรวจสอบปัญหาได้ทันที

---

## 3. การแบ่ง ownership แบบสมบูรณ์

| Workstream | Person A | Person B | หมายเหตุ |
| :--- | :--- | :--- | :--- |
| Project architecture | Owner | Reviewer | คนที่ 1 วาง backend contract, คนที่ 2 review ว่าใช้งาน UI ได้จริง |
| Database schema | Owner | Informed | รวม table, FK, indexes, constraints |
| Auth / RBAC | Owner | Co-owner | A ทำสิทธิ์และ session backend, B ทำ route guard / screen guard |
| Chart of Accounts | Owner (API, validation) | Owner (UI) | แบ่งชัดเจน backend/frontend |
| Journal engine | Owner | Informed | ห้ามแชร์ ownership เพราะเป็นแกนกลาง |
| Shift management | Owner (calculation, rules) | Owner (flow, UX) | B ดู blind drop flow, A ดู expected cash logic |
| POS | Owner (pricing, posting API) | Owner (cart, checkout UI) | ทำแบบ contract-first |
| Running number | Owner | Informed | ต้องอยู่ฝั่ง backend/database เท่านั้น |
| Tax documents | Owner (data, logic) | Owner (display/print screen) | B ไม่ถือ logic running number |
| Petty cash | Owner (posting, storage validation) | Owner (form UX, upload UX) | แบ่งตามชั้นงาน |
| Reports | Owner (query/export) | Owner (dashboard/report UI) | A ทำ data correctness, B ทำ presentation |
| Export | Owner (file generation) | Owner (download flow) | |
| Audit trail | Owner | Reviewer | A enforce ทุก table/API, B ช่วยตรวจ UI actions |
| Test automation | Owner (backend) | Owner (frontend/UAT) | คนละชั้นงาน |
| Deployment checklist | Owner | Owner | ต้อง sign-off ทั้งคู่ |

---

## 4. Feature Split แบบลงมือทำได้เลย

### 4.1 Person A ต้องทำอะไรบ้าง

#### A-1. Foundation
* วาง database schema จากเอกสาร [DatabaseSchema.md](DatabaseSchema.md)
* สร้าง migrations
* ตั้ง naming convention ของ API และ payload
* ทำ seed data สำหรับ role และ chart of accounts ขั้นต่ำ

#### A-2. Security and Access
* login backend
* password hash
* session/token
* RBAC middleware
* API permission matrix: owner/admin/cashier

#### A-3. Accounting Core
* chart of accounts CRUD backend
* journal_entries / journal_lines service
* validation ว่า debit = credit
* block hard delete สำหรับ journal
* source reference mapping เช่น ORDER, EXPENSE, SHIFT_CLOSE

#### A-4. Shift Engine
* open shift API
* active shift check
* close shift API
* expected cash calculation
* difference posting ไปบัญชีเงินขาด/เงินเกิน

#### A-5. POS Transaction Engine
* product APIs
* order creation API
* order item persistence
* payment method mapping ไปบัญชีสินทรัพย์
* transactional posting ไป tax document และ journal

#### A-6. Tax Document Control
* document_sequences table logic
* locking strategy สำหรับ running number
* tax document creation service
* credit note linkage logic
* status transition validation

#### A-7. Petty Cash Backend
* expense create API
* receipt metadata validation
* active shift enforcement
* auto journal posting
* void/status logic

#### A-8. Reporting and Export Backend
* daily sales query
* shift summary query
* P&L query
* general ledger query
* export `.csv`
* export `.xlsx`

#### A-9. Backend Quality
* unit test สำหรับ journal posting
* integration test สำหรับ sell flow
* integration test สำหรับ petty cash flow
* integration test สำหรับ close shift with difference
* concurrency test สำหรับ document sequence

### 4.2 Person B ต้องทำอะไรบ้าง

#### B-1. Product Shell
* app layout
* login screen
* navigation ตาม role
* error state / unauthorized state

#### B-2. Chart of Accounts UI
* list page
* create/edit form
* active/inactive state display
* owner-only guard

#### B-3. Shift UI
* open shift form
* close shift screen แบบ blind drop
* warning UI เมื่อเงินขาด/เกิน
* shift status indicators

#### B-4. POS UI
* product search/select
* cart UI
* subtotal/discount/total display
* payment method selection
* keyboard shortcuts
* success receipt/tax doc result screen

#### B-5. Petty Cash UI
* expense form
* receipt upload UX
* file size validation UX
* current shift indicator
* success/error feedback

#### B-6. Reporting UI
* daily sales summary screen
* shift summary screen
* P&L screen
* general ledger filter screen
* export buttons และ download state

#### B-7. Frontend Quality
* screen-level validation
* keyboard shortcut test
* smoke test ทุก role
* UAT checklist สำหรับ owner/admin/cashier
* regression checklist ก่อน demo

---

## 5. งานที่ห้ามแบ่งแบบปนกัน
มีบางงานที่ต้องมี owner คนเดียว ไม่ควรแชร์ implementation เพราะจะชนกันหนัก

### ต้องเป็น owner ของ Person A เท่านั้น
* Schema migration
* Journal posting logic
* Running number logic
* Transaction boundary
* Permission enforcement ฝั่ง API
* Export file generation

### ต้องเป็น owner ของ Person B เท่านั้น
* POS interaction design
* Blind drop screen behavior
* Form usability ของ petty cash
* Report layout และ interaction
* Download/export interaction ฝั่ง UI

---

## 6. ลำดับการทำงานที่ดีที่สุด
ถ้าต้องการให้สองคนเดินพร้อมกันได้จริง ให้ทำตามลำดับนี้

### Phase 0: Alignment
ระยะเวลาแนะนำ: 0.5 ถึง 1 วัน

Person A
* สรุป entity และ API contracts
* สรุป status transitions
* สรุป payload ของ order, expense, shift close, reports

Person B
* สรุปหน้าจอทั้งหมด
* สรุป field-level UI behavior
* สรุป navigation ตาม role

Output ที่ต้องได้
* API contract draft 1 ชุด
* screen list 1 ชุด
* definition of done 1 ชุด

### Phase 1: Foundation Parallel Build
ระยะเวลาแนะนำ: 3 ถึง 5 วัน

Person A
* schema + migrations
* auth backend + RBAC
* products/coa basic APIs
* seed data

Person B
* app shell
* login page
* route guard
* chart of accounts UI scaffold
* POS layout scaffold

Dependency ต่ำมากในเฟสนี้

### Phase 2: Transaction Core
ระยะเวลาแนะนำ: 4 ถึง 6 วัน

Person A
* journal engine
* shift APIs
* order API
* tax document service
* expense API

Person B
* open/close shift screens
* POS cart + checkout screen
* petty cash form
* API integration layer

### Phase 3: Reports and Hardening
ระยะเวลาแนะนำ: 3 ถึง 5 วัน

Person A
* reporting queries
* export services
* concurrency test
* integration bug fixing

Person B
* report dashboards
* export UI
* UAT walkthroughs
* frontend bug fixing

### Phase 4: Stabilization
ระยะเวลาแนะนำ: 2 ถึง 3 วัน

Person A
* fix data correctness bugs
* verify audit fields
* verify rollback behavior

Person B
* fix usability bugs
* verify role restrictions on screens
* run end-to-end demo script

---

## 7. Definition of Done แยกตามคน

### Person A Done เมื่อ
* API ผ่าน test และ response shape ตาม contract
* ทุก transactional flow rollback ได้เมื่อเกิด error
* Journal balance ถูก validate แล้ว
* Running number ผ่าน concurrency test
* ทุก table สำคัญมี audit fields ครบ
* ไม่มี endpoint ที่ข้ามสิทธิ์ role ได้

### Person B Done เมื่อ
* ผู้ใช้แต่ละ role เห็นเฉพาะเมนูที่ควรเห็น
* POS ใช้งานได้เร็วด้วย keyboard flow หลัก
* close shift ไม่เผย expected cash ก่อนเวลา
* petty cash บังคับแนบหลักฐานก่อน submit
* report อ่านง่ายและ export ใช้งานได้จริง
* ทุกหน้ามี loading, empty, success, error state

---

## 8. Daily Working Agreement
เพื่อให้ 2 คนไม่ชนกัน ต้องมีกติกาชัดเจน

* ทุกเช้า sync 15 นาที
* ถ้ามีการเปลี่ยน API contract ต้องแจ้งก่อน merge เสมอ
* Person A ห้ามเปลี่ยน response shape โดยไม่แจ้ง Person B
* Person B ห้ามฝัง business logic การคำนวณเงินหรือ running number ที่ frontend
* ทุก feature ต้อง merge พร้อม checklist ของตัวเอง

---

## 9. GitHub Workflow: Parallel Integration Protocol
เพื่อให้ Agent A (Backend) และ Agent B (Frontend) ทำงานขนานกันได้โดยไม่ Block กัน ให้ปฏิบัติตามขั้นตอนนี้:

### 🌿 Branch Strategy
- **`main`**: "The Temple" - มีไว้สำหรับ Release ที่ผ่าน QA 100% เท่านั้น ห้าม Commit โดยตรง
- **`staging`**: "The Integration" - กะละมังรวมงาน (Integration Branch) ใช้ทดสอบว่า Backend และ Frontend คุยกันรู้เรื่อง
- **`feat/agent-[A|B]-[slug]`**: "The Workshop" - Branch ย่อยสำหรับพัฒนาฟีเจอร์ โดยต้องระบุชื่อ Agent ผู้ดูแลชัดเจน (เช่น `feat/agent-a-pos-engine` หรือ `feat/agent-b-pos-ui`)

### 🚶‍♂️ Workflow Steps
1. **Split (แตกกิ่ง):** ต่างคนต่างแตก Branch จาก `staging` ตามโครงสร้างชื่อ Agent:
   - Agent A (Backend/Logic): `feat/agent-a-[feature-name]`
   - Agent B (Frontend/Flow): `feat/agent-b-[feature-name]`
2. **Mock & Logic (แยกกันทำงาน):**
   - **Agent B:** เขียน UI โดยใช้ข้อมูล Mock ตาม [API_Contract.md](API_Contract.md) (ไม่ต้องรอ API จริง)
   - **Agent A:** เขียน Logic/API ตามสัญญา และรัน Unit Test ของตัวเอง
3. **Internal Gate (ตรวจสอบหน้าบ้าน):**
   - ก่อน Merge เข้า `staging` ต้องรัน `npm run build` และ `npm run lint` ให้ผ่านเสมอ
4. **Integration (รวมร่าง):** 
   - เมื่อ Agent A และ B รวมงานเข้าใน `staging` แล้ว ให้ Agent B เปลี่ยนจาก **Mock Data** มาเรียก **API จริง** (Integration Test)
   - หากผ่าน ให้สร้าง Pull Request จาก `staging` -> `main`

### 🛡️ Guardrails (กฎทอง)
- **Schema Ownership:** Person A เป็นคนเดียวที่รัน `npx prisma migrate dev` (B ห้ามรันแก้ไข DB เอง)
- **Contract Locking:** ห้ามเปลี่ยน JSON Interface ใน [API_Contract.md](API_Contract.md) โดยไม่ผ่านการยินยอมจากทั้งสองฝ่าย
- **Frequent Sync:** ให้ `git pull origin staging` เข้าหาตัวบ่อยๆ เพื่อให้ Code ในเครื่องทันสมัยอยู่เสมอ
* ทุกวันก่อนจบงาน ต้องมี integration status 1 ครั้ง

---

## 9. รายการส่งมอบของแต่ละคน

### Deliverables ของ Person A
* DB migrations
* Seed scripts
* API documentation
* Auth/RBAC middleware
* Accounting engine
* Shift engine
* POS transaction service
* Tax document sequence service
* Reporting/export service
* Backend test suite

### Deliverables ของ Person B
* Screen map
* UI flow mock or implemented screens
* Role-based navigation
* POS UI
* Shift UI
* Petty cash UI
* Reporting UI
* Export/download flow
* Frontend validation states
* UAT checklist

---

## 10. ความเสี่ยงที่เจอบ่อยในทีม 2 คน

### Risk 1: แบ่งตามเมนูแทนแบ่งตามแกนระบบ
ผลเสีย

* ทั้งสองคนต้องแก้ journal / shift / tax doc พร้อมกัน
* merge conflict สูง
* data rule แตกง่าย

วิธีป้องกัน

* ให้ Person A ถือแกนข้อมูลทั้งหมด
* ให้ Person B ถือแกน workflow และ UI ทั้งหมด

### Risk 2: Frontend คิดเลขเองคนละกฎกับ backend
ผลเสีย

* expected cash ไม่ตรง
* total amount ไม่ตรง
* blind drop ผิด flow

วิธีป้องกัน

* Backend เป็น single source of truth
* Frontend แสดงผลและ validate เบื้องต้นเท่านั้น

### Risk 3: ไม่มี owner ชัดสำหรับ running number
ผลเสีย

* เอกสารซ้ำ
* เอกสารข้าม
* audit ไม่ผ่าน

วิธีป้องกัน

* Person A ถือเต็ม 100%
* Person B ใช้ผลลัพธ์จาก API เท่านั้น

---

## 11. แผนแบ่งงานแบบสรุปสั้นที่สุด

### Person A
* Database
* Backend
* Accounting engine
* Shift calculation
* POS transaction logic
* Running number
* Tax documents
* Reports/export backend
* Security/RBAC backend
* Backend tests

### Person B
* Login and app shell
* Role-based UI
* Chart of Accounts UI
* Shift UI
* POS UI
* Petty cash UI
* Reports UI
* Export UI
* Frontend validations
* UAT and regression

---

## 12. ข้อสรุปสุดท้าย
ถ้ามี 2 คนและต้องการให้ Phase 1 เสร็จเร็วที่สุดโดยเสี่ยงน้อยที่สุด ให้แบ่งแบบนี้เท่านั้น

* **คนที่ 1 = Data Correctness Owner**
* **คนที่ 2 = User Workflow Owner**

อย่าแบ่งแบบ

* คนหนึ่งทำ POS ทั้งหมด อีกคนทำ Petty Cash ทั้งหมด
* คนหนึ่งทำ backend บางหน้า อีกคนทำ backend บางหน้าแบบปนกัน
* คนหนึ่งถือ running number และอีกคนถือ tax document คนละส่วน

การแบ่งที่ดีที่สุดสำหรับโปรเจกต์นี้คือแบ่งตาม "แกนกลางระบบ" ไม่ใช่แบ่งตาม "จำนวนเมนู"