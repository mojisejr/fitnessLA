# System 100% Frontdesk, Members, Trainer, Report Plan

Date: 2026-03-21
Project: fitnessLA
Status: Planning only
Scope: Do not change application code in this phase. This document is the execution plan for the next implementation phase.

## 1. Objective

เอกสารนี้เป็นแผนลงมือแบบละเอียดเพื่อให้ระบบ fitnessLA ไปถึงสถานะใช้งานจริงครบตามความต้องการล่าสุด โดยครอบคลุม:

1. หน้า login และ dashboard
2. open shift และ close shift
3. รายงานสรุปยอด
4. members domain
5. trainer domain
6. POS flow สำหรับ training purchase
7. schema, migration, API, adapter, frontend state
8. data backfill และ seed
9. Vitest และ smoke test

เป้าหมายคือให้แผนนี้ใช้เป็น source of truth สำหรับการทำงานรอบถัดไปจนจบแบบ 100% โดยไม่ปล่อยจุดที่ UI, API, database, และ tests ไม่สอดคล้องกัน

## 2. User Requests Mapped

รายการด้านล่างคือการตีความ requirement ล่าสุดให้เป็นงานที่ implement ได้จริง

1. หน้าแรกเหลือแค่ logo, ชื่อ LA GYM, และช่อง login
2. หน้า dashboard ทางลัด hover แล้วตัวหนังสือต้องเป็นสีขาว
3. หน้าเปิดกะและปิดกะ ผู้รับผิดชอบต้องเป็นชื่อคนที่ login มา และห้ามแก้เอง
4. หน้าสรุปรายวันเอากราฟเปรียบเทียบออก
5. เปลี่ยนชื่อหน้าสรุปรายวันเป็น สรุปยอด ทั้งใน nav และในหน้าจอ
6. สรุปยอดต้องแยกตามหมวดหมู่ POS ได้
7. สรุปยอดต้องรองรับ รายวัน รายสัปดาห์ รายเดือน และช่วงวันที่เอง
8. ตรวจว่าหน้าสมาชิกเชื่อมฐานข้อมูลจริง
9. หน้าสมาชิกต้องมีปุ่มต่อจากวันเดิม และปุ่มเริ่มใหม่
10. หน้าสมาชิกต้องบอกได้ว่าต่อแบบไหน
11. หน้าสมาชิกต้องค้นและกรอง คนที่หมดแล้ว ใกล้หมด ยังใช้งานอยู่
12. หน้าสมาชิกต้องบอกว่าซื้อเทรนเนอร์ไหม และกับใคร
13. ถ้าซื้อเทรนเนอร์ใน POS ต้องกรอกชื่อเทรนเนอร์ที่ใช้บริการ
14. ต้องมีตารางผูก ผู้ใช้บริการ กับ เทรนเนอร์ ถ้ามี
15. เพิ่มหน้าเทรนเนอร์ แสดงว่าใครบ้าง มีลูกค้าใคร เริ่มวันไหน หมดวันไหน คอร์สเท่าไหร่
16. ข้อมูลไหนไม่มีในฐานข้อมูล ให้เพิ่ม schema และเชื่อมให้ครบ
17. เพิ่ม Vitest ให้ครอบคลุม

## 3. Grounded Current State From Code

สถานะนี้อ้างอิงจากโค้ดปัจจุบันใน branch ทำงาน ณ วันนี้

### 3.1 Login

ไฟล์: src/app/login/page.tsx

สถานะปัจจุบัน:

1. หน้า login ยังมี hero panel ฝั่งซ้ายขนาดใหญ่
2. มีข้อความ marketing และ feature cards
3. มี mock preset buttons ใน mock mode
4. ยังไม่ใช่ layout แบบ minimal ตามที่ต้องการ

### 3.2 Dashboard

ไฟล์: src/app/(app)/dashboard/page.tsx

สถานะปัจจุบัน:

1. quick links ใช้ hover ที่เปลี่ยน text ไปโทนเข้ม ไม่ใช่สีขาว
2. nav item ชื่อรายงานยังเป็น สรุปรายวัน

### 3.3 Open/Close Shift

ไฟล์: src/app/(app)/shift/open/page.tsx
ไฟล์: src/app/(app)/shift/close/page.tsx

สถานะปัจจุบัน:

1. ผู้รับผิดชอบยังแก้ค่าได้จาก input
2. ฝั่ง auth state ยังรับ string responsibleName จากฟอร์ม
3. ข้อกำหนด lock ชื่อจาก session ยังไม่ถูก enforce ครบทุกชั้น

### 3.4 Daily Summary

ไฟล์: src/app/(app)/reports/daily-summary/page.tsx

สถานะปัจจุบัน:

1. ใช้ชื่อ สรุปรายวัน
2. รองรับแค่วันเดียว
3. มีกราฟเทียบวันก่อนหน้า
4. แสดงยอดรวมและรายการขาย แต่ยังไม่มีมุมมอง by POS category ใน UI

### 3.5 Members

ไฟล์: src/app/(app)/members/page.tsx
ไฟล์: src/features/adapters/real-app-adapter.ts

สถานะปัจจุบัน:

1. หน้า members เรียกข้อมูลจาก database ผ่าน adapter.listMembers แล้ว
2. ปัจจุบันยังเป็น read-only summary table
3. ยังไม่มีปุ่ม renew จากวันเดิม
4. ยังไม่มีปุ่ม restart เริ่มใหม่
5. ยังไม่มี search/filter ที่ละเอียด
6. ยังไม่มี field/logic สำหรับ trainer purchase relation

### 3.6 POS

ไฟล์: src/app/(app)/pos/page.tsx
ไฟล์: src/lib/pos-catalog.json

สถานะปัจจุบัน:

1. มี grouping หมวดขาย เช่น COFFEE, MEMBERSHIP, FOOD, TRAINING, COUNTER
2. มี PT products แล้วใน catalog
3. createOrder request ยังไม่มี field สำหรับ trainer selection
4. ยังไม่มี UX บังคับกรอก trainer เมื่อซื้อ PT product

### 3.7 Database

ไฟล์: prisma/schema.prisma

สถานะปัจจุบัน:

1. มี Product, Order, OrderItem, Shift, Expense, MemberSubscription
2. ยังไม่มี Trainer table
3. ยังไม่มีตารางผูก customer/member กับ trainer
4. ยังไม่มี field ใน order/order item สำหรับ trainer assignment

## 4. Gaps That Must Be Closed

เพื่อให้ requirement ทั้ง 17 ข้อเสร็จจริง ต้องปิด gap ต่อไปนี้

1. UI simplification gap on login
2. hover style gap on dashboard quick links
3. responsible-name source-of-truth gap between session and forms
4. report naming gap between route, nav, page title, and docs
5. report granularity gap for category and date range support
6. member lifecycle action gap for renew and restart
7. member filtering and renewal-type visibility gap
8. trainer data model gap
9. POS checkout metadata gap for trainer binding
10. members page relation visibility gap for training packages
11. trainer page absence
12. database schema gap for all trainer-related records
13. adapter contract gap
14. API route gap
15. test coverage gap

## 5. Delivery Principles

กติกาที่ต้องยึดระหว่าง implementation

1. แก้ที่ root cause ไม่ patch เฉพาะ UI
2. ทุก field ใหม่ต้องถูกเพิ่มครบทั้ง schema, route, adapter, contract, UI, tests
3. ถ้าเปลี่ยนชื่อหน้า สรุปรายวัน เป็น สรุปยอด ต้องเปลี่ยนให้ครบทุกชั้น
4. หากข้อมูล trainer ไม่มีใน DB ต้องสร้าง schema จริง ไม่ใช้ local state หลอก
5. หาก user ซื้อ PT product แล้วไม่ระบุ trainer ต้องไม่ให้ checkout ผ่าน
6. ทุก phase ต้องมี acceptance criteria และ rollback boundary

## 6. Target End State

เมื่อแผนนี้เสร็จ ระบบต้องมีสภาพดังนี้

1. หน้า login minimal เหลือแค่ logo, ชื่อ LA GYM, และ form login
2. dashboard quick link hover แล้วตัวหนังสือเป็นสีขาวทั้งหมด
3. open shift/close shift แสดงชื่อผู้รับผิดชอบจาก session เท่านั้น และแก้เองไม่ได้
4. nav และหน้า report ใช้ชื่อ สรุปยอด
5. report รองรับ DAY, WEEK, MONTH, CUSTOM RANGE
6. report แสดงยอดแยกตามหมวด POS
7. members page เชื่อม DB จริง, ค้นหาได้, กรองได้, renew ได้, restart ได้
8. members page แสดงสถานะการต่อว่าเป็น ต่อจากวันเดิม หรือ เริ่มใหม่
9. members page แสดงข้อมูล training purchase และ trainer relation
10. POS บังคับเลือก trainer เมื่อซื้อ PT product
11. มีตาราง relation ระหว่าง customer/member กับ trainer
12. มีหน้า trainers สำหรับดู trainer portfolio และลูกค้าที่ดูแล
13. มี Vitest ครอบคลุม flow หลักทั้ง backend และ frontend

## 7. Proposed Architecture Changes

## 7.1 Login Simplification

Target files:

1. src/app/login/page.tsx
2. src/components/branding/logo-slot.tsx

Implementation plan:

1. ตัด hero panel ฝั่งซ้ายออก
2. เก็บ layout เป็น centered single card
3. ด้านบนแสดง logo
4. ชื่อระบบเปลี่ยนเป็น LA GYM
5. เหลือเฉพาะ username, password, error, submit
6. mock preset buttons ให้ตัดสินใจว่า:
   - เก็บเฉพาะ mock mode และย้ายเป็น compact row ใต้ form
   - หรือถ้าต้อง minimal จริง ให้ซ่อนไว้หลัง toggle เฉพาะ mock mode

Acceptance:

1. ไม่มี marketing copy ขนาดใหญ่
2. ไม่มี feature cards
3. หน้า login เหลือ brand + form เท่านั้น

## 7.2 Dashboard Hover Fix

Target files:

1. src/app/(app)/dashboard/page.tsx

Implementation plan:

1. ปรับ hover state ของ quick links
2. ข้อความ label และ description ต้องเป็นสีขาวเมื่อ hover
3. ตรวจ contrast บน accent background

Acceptance:

1. hover แล้ว title = white
2. hover แล้ว description = white or high-opacity white
3. ไม่กลับไปใช้ dark brown text

## 7.3 Responsible Name Locking

Target files:

1. src/app/(app)/shift/open/page.tsx
2. src/app/(app)/shift/close/page.tsx
3. src/features/auth/auth-provider.tsx
4. src/features/adapters/types.ts
5. src/features/adapters/real-app-adapter.ts
6. src/app/api/v1/shifts/open/route.ts
7. src/app/api/v1/shifts/close/route.ts
8. src/features/operations/services.ts

Implementation plan:

1. UI เปลี่ยน input ผู้รับผิดชอบเป็น read-only display block
2. source-of-truth ใช้ session.full_name เท่านั้น
3. ฝั่ง frontend ยังส่ง responsible_name ได้เพื่อ contract compatibility ชั่วคราว แต่ต้อง fix ให้ adapter/auth-provider inject จาก session เท่านั้น
4. route ต้อง reject ถ้าค่า responsible_name จาก request ไม่ตรง session.full_name
5. services บันทึก responsible_name จาก session path เท่านั้น

Acceptance:

1. ผู้ใช้แก้ชื่อเองไม่ได้ในหน้าเปิดกะและปิดกะ
2. ชื่อผู้รับผิดชอบแสดงชัดบนหน้าจอ
3. หากพยายาม spoof request ต้องถูก reject

## 7.4 Report Rename: Daily Summary -> Summary

Target files:

1. src/components/layout/app-shell.tsx
2. src/app/(app)/dashboard/page.tsx
3. src/app/(app)/reports/daily-summary/page.tsx
4. docs/API_Contract.md
5. tests that assert old label

Implementation plan:

1. เปลี่ยน label ฝั่ง nav เป็น สรุปยอด
2. เปลี่ยน title ในหน้า report เป็น สรุปยอด
3. ปรับคำอธิบาย dashboard shortcut
4. route path อาจคง `/reports/daily-summary` ไว้ชั่วคราวเพื่อไม่ทำลาย link เดิม
5. ถ้าต้อง rename route จริง ให้ทำ redirect หรือ alias route ใน phase หลังสุดเท่านั้น

Acceptance:

1. ชื่อที่ user เห็นทุกที่เป็น สรุปยอด
2. path ไม่พัง

## 7.5 Report Scope Expansion

Target capability:

1. DAY
2. WEEK
3. MONTH
4. CUSTOM RANGE
5. by POS category

Target files:

1. src/lib/contracts.ts
2. src/features/adapters/types.ts
3. src/features/adapters/real-app-adapter.ts
4. src/features/operations/services.ts
5. src/app/api/v1/reports/daily-summary/route.ts
6. src/app/(app)/reports/daily-summary/page.tsx
7. tests/backend/operations-routes.test.ts
8. tests/backend/operations-services.test.ts
9. tests/frontend/response-shape-alignment.test.ts

Required contract changes:

Add to DailySummary:

1. report_period: DAY | WEEK | MONTH | CUSTOM
2. range_start
3. range_end
4. sales_by_category
5. optional previous_range fields only if comparison remains in API, but UI will not render graph

Route query design:

1. `period=DAY|WEEK|MONTH|CUSTOM`
2. `date=YYYY-MM-DD` for DAY/WEEK/MONTH anchor
3. `start_date` and `end_date` for CUSTOM

UI plan:

1. ลบ comparison chart section ออก
2. เปลี่ยนตัวเลือกช่วงเวลาเป็น tab or segmented control: วัน, สัปดาห์, เดือน, กำหนดเอง
3. ถ้า CUSTOM ให้แสดงสอง date inputs
4. เพิ่ม cards or table สำหรับหมวด POS:
   - กาแฟและเครื่องดื่ม
   - สมาชิก
   - อาหาร
   - บริการเทรน
   - สินค้าเสริมหน้าเคาน์เตอร์
5. คง sales rows table ไว้

Service logic plan:

1. สร้าง utility normalizeDateRange
2. รวม order items ตามช่วงเวลา
3. map SKU/product type ไป category เดียวกับ POS page
4. คำนวณ totals ตาม category และ payment method

Acceptance:

1. ไม่มี comparison graph ใน UI
2. รายงานเลือกวัน/สัปดาห์/เดือน/custom range ได้
3. รายงานแสดงยอดแยกหมวด POS

## 7.6 Members: Lifecycle, Search, Filters, Renewal Type

Target files:

1. src/app/(app)/members/page.tsx
2. src/features/adapters/types.ts
3. src/features/adapters/real-app-adapter.ts
4. src/lib/contracts.ts
5. src/app/api/v1/members/[memberId]/renew/route.ts
6. src/app/api/v1/members/[memberId]/restart/route.ts
7. src/features/operations/services.ts

Current DB note:

1. member_subscriptions exists
2. current contract has renewal_status but not renewal_method

Required DB additions:

1. Add `renewalMethod` to MemberSubscription or equivalent field name
   - values: NONE | EXTEND_FROM_PREVIOUS_END | RESTART_FROM_NEW_START
2. Optionally add `statusComputedCache` only if needed, but preferred to compute on read

Members page UI plan:

1. Add search input
2. Add status filter dropdown or tabs
3. Add cards for total, active, expiring soon, expired
4. Add actions per row:
   - ต่อจากวันเดิม
   - เริ่มใหม่
5. Add confirmation modal or inline confirmation
6. Add field/column `รูปแบบการต่อ`
   - ยังไม่เคยต่อ
   - ต่อจากวันเดิม
   - เริ่มใหม่
7. Add near-expiry logic
   - define expiring soon window = within 7 days by default

Service plan:

1. renewMember must extend from previous expiresAt + 1 day
2. restartMember must start from today and recalc end date from product duration or package duration
3. update renewalMethod accordingly

Acceptance:

1. members page reads from DB only
2. renew and restart work from UI
3. row shows renewal type
4. filters distinguish active, expiring soon, expired

## 7.7 Trainer Domain: New Business Model

This is the biggest new scope in this request.

Current grounded fact:

1. System has PT products only
2. There is no trainer entity in schema
3. There is no relation table between customer/member and trainer

Proposed new tables:

### Trainer

Purpose:

1. master list of trainers
2. visible in POS selector
3. visible in trainer page

Fields:

1. id
2. trainerCode
3. fullName
4. nickname optional
5. phone optional
6. isActive
7. createdAt
8. updatedAt

### TrainingServiceEnrollment

Purpose:

1. relation between customer/member and purchased PT package
2. stores trainer assignment
3. supports trainer page and member page visibility

Fields:

1. id
2. orderId
3. orderItemId
4. memberSubscriptionId nullable
5. customerNameSnapshot
6. trainerId
7. packageProductId
8. packageNameSnapshot
9. packageSkuSnapshot
10. startedAt
11. expiresAt nullable
12. sessionLimit nullable
13. priceSnapshot
14. status
15. createdAt
16. updatedAt

Rationale:

1. PT purchase may be tied to a registered member or non-member customer
2. We need immutable snapshots to keep history if product/trainer names change later

Optional table only if needed later:

### TrainingSessionUsage

Purpose:

1. track each consumed PT session
2. not required for first delivery unless business wants remaining sessions immediately

For this requirement set, this table is optional in phase 1 of trainer implementation.

## 7.8 POS Change For PT Purchase

Target files:

1. src/app/(app)/pos/page.tsx
2. src/lib/contracts.ts
3. src/features/adapters/types.ts
4. src/features/adapters/real-app-adapter.ts
5. src/app/api/v1/orders/route.ts
6. src/features/operations/services.ts

Required contract changes:

Extend CreateOrderRequest with something like:

1. `service_assignments?: Array<{ product_id, trainer_id, customer_name?, start_date? }>`

or cleaner per item:

1. `items: [{ product_id, quantity, trainer_id?, service_start_date? }]`

Recommended approach:

Add metadata per order item, because trainer selection is tied to specific PT products.

Recommended CreateOrderRequest shape:

1. product_id
2. quantity
3. trainer_id optional but required for PT products
4. service_start_date optional default today

POS UI plan:

1. detect if selected product is TRAINING category
2. require trainer select field before add to cart or before checkout
3. if multiple PT lines, keep trainer bound per cart line
4. if quantity > 1 for PT line, define whether one enrollment per quantity or one package with quantity. Recommended:
   - for PT packages quantity should stay 1
   - prevent quantity > 1 for PT packages initially

Validation rules:

1. PT products require trainer_id
2. membership products do not require trainer_id
3. non-PT products ignore trainer_id

Service plan after successful order:

1. if order item is PT product, create TrainingServiceEnrollment row
2. derive startedAt as order date or selected start date
3. derive expiresAt by package type if package duration known
4. if no duration known, leave expiresAt null and rely on sessionLimit only

Acceptance:

1. Cannot checkout PT item without trainer
2. Training purchase creates trainer-linked enrollment record

## 7.9 Members Page: Show Training Info

Target view changes:

1. Add columns or expandable section:
   - ซื้อเทรนเนอร์ไหม
   - เทรนเนอร์ที่ดูแล
   - คอร์สเทรน
   - วันเริ่ม
   - วันหมด
2. If multiple enrollments, choose one of these UX options:
   - latest active enrollment only in main row, full list in expand panel
   - separate section below member detail

Recommended approach:

1. Main table shows latest active training package summary
2. Expandable row shows all training enrollments for that member

Required backend changes:

1. listMembers must include nested training summary or aggregate fields
2. add dedicated member detail endpoint if list payload becomes too heavy

Recommended contract extension:

Add to MemberSubscriptionRecord:

1. training_status: NONE | ACTIVE | EXPIRED
2. trainer_name?: string | null
3. training_package_name?: string | null
4. training_started_at?: string | null
5. training_expires_at?: string | null
6. renewal_method?: NONE | EXTEND_FROM_PREVIOUS_END | RESTART_FROM_NEW_START

## 7.10 Trainers Page

New route proposal:

1. `/trainers`

Target files:

1. src/app/(app)/trainers/page.tsx
2. src/components/layout/app-shell.tsx
3. src/features/adapters/types.ts
4. src/features/adapters/real-app-adapter.ts
5. src/lib/contracts.ts
6. src/app/api/v1/trainers/route.ts
7. src/app/api/v1/trainers/[trainerId]/route.ts optional
8. src/features/operations/services.ts

Trainers page should show:

1. รายชื่อ trainer ทั้งหมด
2. ลูกค้าที่อยู่กับ trainer คนนั้น
3. package name
4. start date
5. end date
6. course price
7. active vs expired workload

Recommended first-release UX:

1. summary cards per trainer
2. expandable customer table
3. search trainer by name
4. filter active only

Required database seeds:

1. initial trainer rows if database currently has none
2. at least a minimal trainer master dataset for real mode

## 7.11 Database Additions and Migrations

Migration package must include:

1. create trainers table
2. create training_service_enrollments table
3. add renewal_method to member_subscriptions
4. add nullable references or snapshots needed for PT packages
5. any indexes for trainerId, memberSubscriptionId, orderId, status

Recommended indexes:

1. trainers.trainerCode unique
2. training_service_enrollments.trainerId index
3. training_service_enrollments.memberSubscriptionId index
4. training_service_enrollments.orderId index
5. member_subscriptions.memberCode unique already present or preserve equivalent

Backfill strategy:

1. Existing members get renewal_method = NONE
2. Existing PT orders cannot reliably infer trainer if historical data missing
3. Historical PT rows without trainer should remain unassigned with explicit null state
4. New UI should show ไม่ระบุเทรนเนอร์ย้อนหลัง for old records

## 7.12 API Changes Summary

New or changed endpoints:

1. GET `/api/v1/reports/daily-summary`
   - support `period`, `start_date`, `end_date`
   - return category totals
2. GET `/api/v1/members`
   - include filters optional
   - include renewal_method and training summary
3. POST `/api/v1/members/:memberId/renew`
   - set renewal_method = EXTEND_FROM_PREVIOUS_END
4. POST `/api/v1/members/:memberId/restart`
   - set renewal_method = RESTART_FROM_NEW_START
5. GET `/api/v1/trainers`
   - list trainers with customer assignments
6. POST `/api/v1/orders`
   - accept PT trainer metadata per item

Optional endpoints to add if payload size grows:

1. GET `/api/v1/members/:memberId`
2. GET `/api/v1/trainers/:trainerId`

## 8. Phased Execution Plan

## Phase 0: Contract Freeze and Test Baseline

Goal:

1. Lock exact contract changes before code edits

Tasks:

1. Update docs/API_Contract.md for new summary filters and trainer/member fields
2. Update docs/DatabaseSchema.md with proposed trainer tables
3. Define final enum names for renewal_method and training_status
4. Snapshot current Vitest status before edits

Acceptance:

1. No ambiguity on API shapes before coding

## Phase 1: UI Polish Low Risk Changes

Goal:

1. Finish simple UI fixes with low schema risk

Tasks:

1. Simplify login page
2. Fix dashboard hover text color
3. Rename สรุปรายวัน -> สรุปยอด in UI labels
4. Remove comparison chart from report page

Acceptance:

1. User-visible labels and hover state done
2. No DB change required

## Phase 2: Responsible Name Locking

Goal:

1. Make open/close shift honor logged-in identity only

Tasks:

1. Read-only responsible block on open shift
2. Read-only responsible block on close shift
3. auth-provider injects session.full_name only
4. backend rejects mismatch

Acceptance:

1. Name cannot be edited
2. Persisted responsible name comes from session

## Phase 3: Report Expansion

Goal:

1. Upgrade summary report to category and range aware

Tasks:

1. extend contracts
2. extend service range aggregation
3. extend route query parsing
4. redesign report UI with DAY/WEEK/MONTH/CUSTOM
5. render POS category totals

Acceptance:

1. Category summary and date range work end to end

## Phase 4: Members Lifecycle Completion

Goal:

1. Complete members page actions and filters

Tasks:

1. add renewal_method to DB
2. add renew/restart actions in services and routes
3. add search/filter UI
4. add expiring soon bucket
5. show renewal type

Acceptance:

1. members page fully usable for membership operations

## Phase 5: Trainer Schema and Master Data

Goal:

1. Introduce trainer domain cleanly

Tasks:

1. create trainers table
2. create training_service_enrollments table
3. create seed data for trainers
4. define contract types for trainer list and enrollment summary

Acceptance:

1. DB has trainer entities and assignment model

## Phase 6: POS Training Purchase Binding

Goal:

1. Capture trainer relation at checkout time

Tasks:

1. extend order request item metadata
2. add trainer selector in POS for PT lines
3. validate required trainer
4. create enrollment rows on order completion

Acceptance:

1. PT purchase always records trainer relation

## Phase 7: Members + Trainers Cross Views

Goal:

1. Make trainer relationship visible in members page and trainer page

Tasks:

1. enrich member list payload with trainer summary
2. add trainers page
3. add nav item if role permits
4. make active/expired assignment status visible

Acceptance:

1. User can answer who trains whom from UI without checking DB manually

## Phase 8: Data Backfill and Integrity Checks

Goal:

1. Make sure missing database data is created and consistent

Tasks:

1. seed trainer master data if missing
2. backfill renewal_method = NONE on old members
3. backfill historical PT records as unassigned where trainer data missing
4. run integrity report for orphaned PT enrollments

Acceptance:

1. No missing mandatory rows for new UI

## Phase 9: Vitest and Regression Coverage

Goal:

1. Cover every changed surface with tests

Backend tests required:

1. report route supports DAY/WEEK/MONTH/CUSTOM
2. report service computes POS categories correctly
3. open/close shift reject responsible-name mismatch
4. renew route updates renewal_method correctly
5. restart route updates renewal_method correctly
6. orders route rejects PT products without trainer_id
7. orders service creates training enrollment rows
8. trainers route returns assignments

Frontend tests required:

1. login page renders minimal layout
2. dashboard quick links hover class behavior
3. open shift shows read-only responsible name
4. close shift shows read-only responsible name
5. summary page has no comparison chart
6. summary page supports date-range mode
7. members page search and filters
8. members page renew action
9. members page restart action
10. members page shows renewal type
11. POS PT purchase requires trainer
12. trainers page renders trainer-customer list

Acceptance:

1. Vitest passes for all new flows

## 9. Data Model Proposal Detail

Recommended contract additions in src/lib/contracts.ts

### DailySummary

Add:

1. report_period
2. range_start
3. range_end
4. sales_by_category

### MemberSubscriptionRecord

Add:

1. renewal_method
2. training_status optional
3. trainer_name optional
4. training_package_name optional
5. training_started_at optional
6. training_expires_at optional

### TrainerRecord

New interface:

1. trainer_id
2. trainer_code
3. full_name
4. nickname
5. phone
6. is_active
7. active_customer_count

### TrainingEnrollmentRecord

New interface:

1. enrollment_id
2. trainer_id
3. trainer_name
4. customer_name
5. member_id nullable
6. package_name
7. package_sku
8. started_at
9. expires_at
10. price
11. status

## 10. Risks and Decisions Needed Before Coding

Open decisions that should be locked before implementation starts:

1. Trainer should be separate master table or a new auth role in User?
   - Recommendation: separate table first
2. PT package quantity > 1 should be allowed or blocked?
   - Recommendation: block quantity > 1 for PT products initially
3. Expiring soon threshold should be 7 days or configurable?
   - Recommendation: fixed 7 days first
4. Custom range should coexist with day/week/month in same route or separate endpoint?
   - Recommendation: same route with explicit period parameter
5. Historical PT orders without trainer should be hidden or shown as unassigned?
   - Recommendation: show as unassigned

## 11. Implementation Order Recommendation

Recommended order to reduce rework:

1. Phase 0 contract freeze
2. Phase 1 UI polish
3. Phase 2 responsible lock
4. Phase 3 report expansion
5. Phase 4 members lifecycle
6. Phase 5 trainer schema
7. Phase 6 POS PT binding
8. Phase 7 trainers page and member enrichment
9. Phase 8 backfill and seeds
10. Phase 9 vitest and regression sweep

Reason:

1. report and members can be delivered without waiting for trainer domain
2. trainer domain depends on stable members and order contracts
3. tests should be written continuously, but final regression sweep belongs at the end

## 12. Acceptance Checklist Per User Request

1. Login page minimal only
2. Dashboard quick link hover text white
3. Responsible name locked to login user on open/close shift
4. Summary page has no comparison graph
5. Name shown as สรุปยอด in nav and page
6. Summary shows POS category totals
7. Summary supports day/week/month/custom range
8. Members page confirmed DB-backed
9. Members page has renew and restart buttons
10. Members page shows renewal type
11. Members page supports active/expiring/expired filtering
12. Members page shows trainer purchase relation
13. POS requires trainer for PT purchase
14. DB has trainer-customer relation table
15. Trainers page exists and shows assignments
16. Missing DB data and schema added plus seeded/backfilled
17. Vitest added and passing

## 13. Definition of Done

จะถือว่างานชุดนี้เสร็จเมื่อครบทุกข้อ:

1. ทุก requirement 1-17 ถูก implement และทดสอบได้จริง
2. schema migration ผ่านบน local และ real-mode compatible environment
3. routes, adapters, contracts, UI, and docs sync กันหมด
4. Vitest ผ่าน
5. smoke flow ผ่านอย่างน้อย:
   - login
   - open shift
   - sell normal product
   - sell membership
   - renew member
   - restart member
   - sell PT with trainer assignment
   - inspect member trainer relation
   - inspect trainers page
   - close shift
   - open summary for day/week/month/custom range

## 14. Immediate Next Step

Next step after approval of this plan:

1. Lock final schema and contract decisions for trainer domain
2. Start Phase 1 and Phase 2 together because they are low risk and independent from trainer schema
3. Then implement report expansion before trainer work
