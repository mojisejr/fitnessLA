# IMP: System 100% Frontdesk, Members, Trainer, Report

Date: 2026-03-21
Project: fitnessLA
Reference Plan: Plan_2026-03-21_System_100_Frontdesk_Members_Trainer_Report.md
Status: Grounded implementation manual
Scope: เอกสารนี้ใช้เป็น implementation script สำหรับลงมือจริงต่อจากแผนหลัก โดยอ้างอิง runtime reality ของ repository ปัจจุบัน

## 1. Purpose

เอกสารนี้ไม่ใช่แค่แผนระดับสูง แต่เป็น IMP ที่แตกงานจาก plan หลักให้ถึงระดับลงมือจริงได้ทันที โดยตอบคำถามต่อไปนี้ให้ครบ:

1. ตอนนี้ระบบอยู่ตรงไหนจริงจากโค้ดและ schema ปัจจุบัน
2. ต้องแก้ไฟล์ไหนบ้างในแต่ละ requirement
3. ต้องเพิ่ม field ไหนใน contract, route, service, schema
4. migration และ backfill ต้องทำอย่างไร
5. ต้องเพิ่มหรือแก้ test file ไหนบ้าง
6. ต้อง implement ตามลำดับใดเพื่อไม่ชนกันและไม่ทำให้ระบบพัง

เป้าหมายของ IMP นี้คือให้ทีมสามารถใช้เป็น execution manual เพื่อทำงาน requirement 1-17 ให้ครบแบบ end-to-end โดยไม่เหลือช่องว่างระหว่าง frontend, backend, adapter, schema, และ tests

## 2. Grounded Runtime Truth

ส่วนนี้คือข้อเท็จจริงที่ยืนยันจากโค้ดปัจจุบัน ไม่ใช่ assumption

### 2.1 Adapter Mode และ Real DB

ข้อเท็จจริง:

1. repo memory ยืนยันว่า `.env` ปัจจุบันตั้ง `NEXT_PUBLIC_APP_ADAPTER="real"`
2. real mode ใช้ Better Auth cookie session
3. database จริงมีข้อมูล products, orders, shifts, journals อยู่แล้ว
4. members และ reports ใน real mode เป็น DB-backed ไม่ใช่ mock-only

ผลต่อ implementation:

1. งานรอบนี้ต้องรักษาความเข้ากันได้กับ real mode ตลอด
2. API failure ต้อง return JSON เสมอ
3. schema change ต้องคิดเรื่องข้อมูลเก่าจริง ไม่ใช่แค่ empty database

### 2.2 Current Contract Truth

จาก `src/lib/contracts.ts` และ `docs/API_Contract.md` ปัจจุบัน:

1. `CreateOrderRequest.items` ยังมีแค่ `product_id` และ `quantity`
2. `DailySummary` ยังรองรับแค่ยอดรวม, payment methods, rows และ shift rows
3. `MemberSubscriptionRecord` ยังไม่มี `renewal_method`, `trainer_name`, `training_status`
4. `AppAdapter.getDailySummary` ยังรับแค่ `date: string`
5. `AppAdapter.listMembers` ยังไม่มี filter/query input

ผลต่อ implementation:

1. requirement report range และ category totals ต้องแก้ contract กลางแน่นอน
2. requirement trainer ต้องแก้ contract กลางแน่นอน
3. members page feature ใหม่จะทำไม่ได้ถ้าไม่ขยาย adapter contract ก่อน

### 2.3 Current Prisma Truth

จาก `prisma/schema.prisma` ปัจจุบัน:

1. `Shift` มี `staffId` และ `responsibleName`
2. `Product` มี `productType`, `trackStock`, `stockOnHand`, `membershipPeriod`, `membershipDurationDays`, `revenueAccountId`
3. `MemberSubscription` มี `startedAt`, `expiresAt`, `renewedAt`, `renewalStatus`
4. `Order` มี `customerName`, `customerTaxId`, `paymentMethod`, `totalAmount`
5. `OrderItem` มี `productId`, `quantity`, `unitPrice`, `totalPrice`
6. ยังไม่มี `Trainer`
7. ยังไม่มี `TrainingServiceEnrollment`
8. ยังไม่มี field trainer assignment ใน `Order` หรือ `OrderItem`
9. ยังไม่มี `renewalMethod` ใน `MemberSubscription`

ผลต่อ implementation:

1. งาน trainer เป็น schema addition จริง ไม่ใช่แค่ UI feature
2. งาน members renewal type ต้องเพิ่ม field ใหม่ใน DB
3. งาน POS trainer binding ต้องเพิ่ม persistence layer ใหม่

### 2.4 Current Service Truth

จาก `src/features/operations/services.ts` ปัจจุบัน:

1. `listMembers()` ดึงจาก `prisma.memberSubscription.findMany()` จริง
2. `renewMember()` ปัจจุบัน extend จาก `expiresAt` เดิมหรือ today แล้ว update record เดิม
3. `restartMember()` ปัจจุบัน reset `startedAt` เป็น now และ recalc `expiresAt`
4. `openShiftWithJournal()` รับ `responsibleName` เป็น argument ตรง
5. `closeActiveShiftWithDifference()` รับ `responsible_name` จาก input และ persist ลง shift
6. `getDailySummaryByDate()` รองรับวันเดียว และยังไม่มี category totals
7. `createOrderWithJournal()` validate membership rules แล้ว create order, order items, tax doc, member subscription
8. PT product purchase ปัจจุบันยังไม่สร้าง relation ใดกับ trainer

ผลต่อ implementation:

1. logic สำหรับ members lifecycle มีฐานอยู่แล้ว แต่ยังไม่แยก renewal method ชัดเจน
2. responsible name locking ต้องแก้ตั้งแต่ route ถึง service
3. report range support ต้อง refactor service aggregation ไม่ใช่ patch หน้า report อย่างเดียว
4. trainer relation ต้องถูกสร้างใน transaction เดียวกับ order

### 2.5 Current Route Truth

จาก API routes ปัจจุบัน:

1. `POST /api/v1/shifts/open` บังคับรับ `responsible_name` จาก request body
2. `POST /api/v1/shifts/close` บังคับรับ `responsible_name` จาก request body
3. `GET /api/v1/members` มี JSON error handling แล้ว
4. `POST /api/v1/members/:memberId/renew` และ `restart` มี route แยกอยู่แล้ว
5. `POST /api/v1/orders` ใช้ zod ที่ยังไม่มี trainer field

ผลต่อ implementation:

1. งาน shift responsible lock ต้องแก้ zod schema ด้วย
2. งาน order trainer binding ต้องแก้ zod schema และ route error mapping ด้วย
3. งาน members lifecycle ทำต่อบน route structure เดิมได้ ไม่ต้องแตก route ใหม่มาก

### 2.6 Current UI Truth

จากหน้าจอปัจจุบัน:

1. login ยังเป็น hero + form
2. dashboard nav และ quick link text hover ยังไม่เป็น white ทุกจุด
3. summary page ยังเป็น `สรุปรายวัน`, มี comparison chart, รองรับวันเดียว
4. members page DB-backed แล้ว แต่ยัง read-only และยังไม่มี search/filter/actions
5. POS มี TRAINING category จาก SKU prefix `PT-`, แต่ไม่มี trainer selector
6. auth provider ยังส่ง `responsibleName` ผ่าน method arguments

ผลต่อ implementation:

1. งาน UI low-risk ทำได้ก่อน schema changes
2. งาน trainer UI ต้องรอ contract และ schema พร้อม

### 2.7 Current Test Truth

test files ที่มีอยู่จริงแล้ว:

Backend:

1. `tests/backend/operations-routes.test.ts`
2. `tests/backend/operations-services.test.ts`
3. `tests/backend/members-routes.test.ts`
4. `tests/backend/phase4-regression-flow.test.ts`
5. `tests/backend/product-routes.test.ts`

Frontend:

1. `tests/frontend/members-page.test.tsx`
2. `tests/frontend/close-shift-blind-drop.test.tsx`
3. `tests/frontend/pos-inventory-management.test.tsx`
4. `tests/frontend/real-adapter-payloads.test.ts`
5. `tests/frontend/report-placeholders.test.tsx`
6. `tests/frontend/response-shape-alignment.test.ts`

ผลต่อ implementation:

1. ไม่ควรสร้าง test structure ใหม่หมด
2. ควรต่อยอดไฟล์ทดสอบเดิมก่อน แล้วค่อยเพิ่มไฟล์ใหม่เฉพาะกรณีที่ของเดิมไม่เหมาะ

## 3. Implementation Strategy

แนวทางหลักของรอบนี้คือ:

1. ล็อก contract ก่อน
2. ทำ UI low-risk ที่ไม่แตะ schema ก่อน
3. ทำ shift responsible locking เพราะเกี่ยวกับ auth truth และ data correctness
4. ทำ report expansion ก่อน trainer domain เพราะ depend น้อยกว่า
5. ปิด members lifecycle ก่อน trainer page
6. ค่อยเพิ่ม trainer schema และ POS binding หลังจาก order/member contract ชัดแล้ว
7. ปิดท้ายด้วย backfill, regression, และ smoke verification

## 4. Requirement-to-Implementation Matrix

ตารางนี้คือการ mapping requirement 1-17 ไปยัง implementation unit จริง

### R1 Login Minimal

Files:

1. `src/app/login/page.tsx`
2. `src/components/branding/logo-slot.tsx`

Changes:

1. ตัด hero panel และ marketing copy
2. ใช้ centered single-card layout
3. แสดง logo และ `LA GYM`
4. คง error state, submit state, และ auth behavior เดิม
5. ถ้า mock presets จำเป็นต่อ dev flow ให้ย่อไว้หลัง section เล็กด้านล่างเท่านั้น

Non-goals:

1. ไม่เปลี่ยน auth backend
2. ไม่เปลี่ยน route login semantics

### R2 Dashboard Hover Text White

Files:

1. `src/app/(app)/dashboard/page.tsx`
2. `src/components/layout/app-shell.tsx` เฉพาะถ้ามี hover text ใช้ pattern เดียวกัน

Changes:

1. quick-link title hover -> white
2. quick-link description hover -> white/high-opacity white
3. ตรวจ nav badge หรือ sublabel ที่ใช้ hover dark text อยู่

### R3 Shift Responsible = Logged-in User Only

Files:

1. `src/features/auth/auth-provider.tsx`
2. `src/app/(app)/shift/open/page.tsx`
3. `src/app/(app)/shift/close/page.tsx`
4. `src/features/adapters/types.ts`
5. `src/features/adapters/real-app-adapter.ts`
6. `src/app/api/v1/shifts/open/route.ts`
7. `src/app/api/v1/shifts/close/route.ts`
8. `src/features/operations/services.ts`

Changes:

1. UI: เปลี่ยน input ผู้รับผิดชอบเป็น read-only block
2. auth provider: เลิกให้ caller เป็นผู้กำหนด responsible name โดยอิสระ
3. adapter: inject จาก `session.full_name` เท่านั้นใน real mode
4. routes: ถ้ายังรับ body field ชั่วคราว ต้อง validate ว่าตรง `session.full_name`
5. services: use `session.full_name` หรือ trusted path เท่านั้น

Decision:

1. ระยะสั้นยังส่ง `responsible_name` ได้เพื่อ compatibility
2. ระยะจริงใน code ต้อง treat field นี้เป็น derived field ไม่ใช่ user-editable field

### R4 Remove Comparison Graph

Files:

1. `src/app/(app)/reports/daily-summary/page.tsx`

Changes:

1. ลบ comparisonSummary state
2. ลบ previous-date load
3. ลบ comparisonBars useMemo
4. ลบ comparison graph section ทั้ง block

### R5 Rename Summary Label

Files:

1. `src/components/layout/app-shell.tsx`
2. `src/app/(app)/dashboard/page.tsx`
3. `src/app/(app)/reports/daily-summary/page.tsx`
4. tests ที่ assert label เดิม

Changes:

1. user-facing label ทุกจุด -> `สรุปยอด`
2. path คงไว้ก่อนที่ `/reports/daily-summary`

### R6-R7 Summary by POS Category and Date Range

Files:

1. `src/lib/contracts.ts`
2. `src/features/adapters/types.ts`
3. `src/features/adapters/real-app-adapter.ts`
4. `src/features/operations/services.ts`
5. `src/app/api/v1/reports/daily-summary/route.ts`
6. `src/app/(app)/reports/daily-summary/page.tsx`

Changes:

1. เพิ่ม summary query mode: DAY, WEEK, MONTH, CUSTOM
2. สร้าง range parser utility ใน service layer
3. เพิ่ม category aggregation ตาม SKU/product type mapping เดียวกับ POS
4. page UI มี period switch + custom date inputs
5. page UI มี cards/table สำหรับ category totals

### R8 Members Page Must Be DB-Connected

Status now:

1. ข้อนี้ผ่านแล้วในระดับ backend truth เพราะ `listMembers()` ใช้ Prisma จริง

Required work still needed:

1. preserve DB-backed behavior ระหว่าง refactor
2. เพิ่ม test coverage ว่า members page ยังอ่านจาก adapter real contract เดิม/ใหม่อย่างถูกต้อง
3. อย่า fallback ไป mock shape โดยไม่ตั้งใจ

### R9-R11 Members Renew, Restart, Renewal Type, Filters

Files:

1. `prisma/schema.prisma`
2. `src/lib/contracts.ts`
3. `src/features/adapters/types.ts`
4. `src/features/adapters/real-app-adapter.ts`
5. `src/features/operations/services.ts`
6. `src/app/api/v1/members/route.ts`
7. `src/app/api/v1/members/[memberId]/renew/route.ts`
8. `src/app/api/v1/members/[memberId]/restart/route.ts`
9. `src/app/(app)/members/page.tsx`

Changes:

1. เพิ่ม `renewalMethod` ใน DB
2. `renewMember()` set `EXTEND_FROM_PREVIOUS_END`
3. `restartMember()` set `RESTART_FROM_NEW_START`
4. members list response include renewal method
5. members page add search + filters + action buttons
6. add expiring soon window

### R12-R15 Trainer Domain + Trainer Page + POS Requirement

Files:

1. `prisma/schema.prisma`
2. `src/lib/contracts.ts`
3. `src/features/adapters/types.ts`
4. `src/features/adapters/real-app-adapter.ts`
5. `src/features/operations/services.ts`
6. `src/app/api/v1/orders/route.ts`
7. `src/app/api/v1/trainers/route.ts` new
8. `src/app/(app)/pos/page.tsx`
9. `src/app/(app)/members/page.tsx`
10. `src/app/(app)/trainers/page.tsx` new
11. `src/components/layout/app-shell.tsx`

Changes:

1. เพิ่ม trainer master table
2. เพิ่ม enrollment relation table
3. ขยาย order item payload ให้ PT item รับ trainer assignment
4. create trainer-linked enrollment ใน order transaction
5. members page show trainer summary
6. trainers page show trainer to customer assignments

### R16 Add Missing DB Data/Schema and Fully Connect

Files:

1. `prisma/schema.prisma`
2. `prisma/migrations/...` new
3. `prisma/seed.mjs` or new seed script if cleaner
4. optional `scripts/` backfill helpers

Changes:

1. create migrations
2. seed trainers
3. backfill renewal method
4. mark historical training relations as unassigned if missing

### R17 Vitest Coverage

Files:

1. existing backend test files
2. existing frontend test files
3. new trainer tests if needed

Changes:

1. extend route tests
2. extend service tests
3. extend frontend page tests
4. add regression flow for PT sale with trainer

## 5. Contract Delta Spec

ส่วนนี้คือ target contract ที่ต้องได้หลัง implementation

### 5.1 `src/lib/contracts.ts`

#### Add report types

```ts
export type ReportPeriod = "DAY" | "WEEK" | "MONTH" | "CUSTOM";

export type PosSalesCategory =
  | "COFFEE"
  | "MEMBERSHIP"
  | "FOOD"
  | "TRAINING"
  | "COUNTER";

export interface SalesByCategoryRow {
  category: PosSalesCategory;
  label: string;
  total_amount: number;
  receipt_count: number;
  item_count: number;
}
```

#### Extend `DailySummary`

```ts
export interface DailySummary {
  report_period: ReportPeriod;
  range_start: string;
  range_end: string;
  total_sales: number;
  sales_by_method: {
    CASH: number;
    PROMPTPAY: number;
    CREDIT_CARD: number;
  };
  sales_by_category: SalesByCategoryRow[];
  total_expenses: number;
  net_cash_flow: number;
  shift_discrepancies: number;
  sales_rows: DailySalesRow[];
  shift_rows: DailyShiftRow[];
}
```

#### Add members/trainer types

```ts
export type RenewalMethod =
  | "NONE"
  | "EXTEND_FROM_PREVIOUS_END"
  | "RESTART_FROM_NEW_START";

export type TrainingStatus = "NONE" | "ACTIVE" | "EXPIRED" | "UNASSIGNED";

export interface MemberTrainingSummary {
  training_status: TrainingStatus;
  trainer_id?: EntityId | null;
  trainer_name?: string | null;
  training_package_name?: string | null;
  training_package_sku?: string | null;
  training_started_at?: string | null;
  training_expires_at?: string | null;
}
```

#### Extend `MemberSubscriptionRecord`

```ts
export interface MemberSubscriptionRecord {
  ...existingFields,
  renewal_method: RenewalMethod;
  training_summary?: MemberTrainingSummary;
}
```

#### Add trainer records

```ts
export interface TrainerRecord {
  trainer_id: EntityId;
  trainer_code: string;
  full_name: string;
  nickname?: string | null;
  phone?: string | null;
  is_active: boolean;
  active_customer_count: number;
}

export interface TrainingEnrollmentRecord {
  enrollment_id: EntityId;
  trainer_id: EntityId | null;
  trainer_name: string | null;
  customer_name: string;
  member_id: EntityId | null;
  package_name: string;
  package_sku: string;
  started_at: string;
  expires_at: string | null;
  price: number;
  status: "ACTIVE" | "EXPIRED" | "UNASSIGNED";
}
```

#### Extend `CreateOrderRequest`

Recommended target:

```ts
export interface CreateOrderRequest {
  shift_id: EntityId;
  items: {
    product_id: EntityId;
    quantity: number;
    trainer_id?: EntityId;
    service_start_date?: string;
  }[];
  payment_method: PaymentMethod;
  customer_info?: {
    name: string;
    tax_id?: string;
  };
}
```

Reason:

1. trainer selection belongs to a line item, not the whole order
2. one order may contain both PT item and non-PT items

### 5.2 `src/features/adapters/types.ts`

Target changes:

1. `listMembers` should support optional filter object only if needed by UI
2. `getDailySummary` must accept query object instead of raw date string
3. add `listTrainers`
4. keep old shape migration short and controlled

Recommended signatures:

```ts
getDailySummary: (input: {
  period: "DAY" | "WEEK" | "MONTH" | "CUSTOM";
  date?: string;
  start_date?: string;
  end_date?: string;
}) => Promise<DailySummary>;

listMembers: (filters?: {
  search?: string;
  status?: "ALL" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
}) => Promise<MemberSubscriptionRecord[]>;

listTrainers: () => Promise<Array<TrainerRecord & { assignments: TrainingEnrollmentRecord[] }>>;
```

### 5.3 `src/features/adapters/real-app-adapter.ts`

Required behavior:

1. build `URLSearchParams` for report query
2. send trainer metadata in order request
3. add `/api/v1/trainers` fetch
4. avoid breaking current consumers during phased refactor

## 6. Prisma Schema Delta Spec

### 6.1 Extend `MemberSubscription`

Add:

```prisma
renewalMethod String @default("NONE")
trainingEnrollments TrainingServiceEnrollment[]
```

Notes:

1. `renewalStatus` ยังเก็บไว้ต่อเพื่อ compatibility
2. `renewalMethod` ใช้ตอบ requirement เรื่อง ต่อจากวันเดิม vs เริ่มใหม่

### 6.2 Add `Trainer`

```prisma
model Trainer {
  id          String   @id @default(cuid())
  trainerCode String   @unique
  fullName    String
  nickname    String?
  phone       String?
  isActive    Boolean  @default(true)
  enrollments TrainingServiceEnrollment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("trainers")
}
```

### 6.3 Add `TrainingServiceEnrollment`

```prisma
model TrainingServiceEnrollment {
  id                   String              @id @default(cuid())
  orderId              String
  order                Order               @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderItemId          String
  orderItem            OrderItem           @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  memberSubscriptionId String?
  memberSubscription   MemberSubscription? @relation(fields: [memberSubscriptionId], references: [id])
  trainerId            String?
  trainer              Trainer?            @relation(fields: [trainerId], references: [id])
  packageProductId     String
  packageProduct       Product             @relation(fields: [packageProductId], references: [id])
  customerNameSnapshot String
  packageNameSnapshot  String
  packageSkuSnapshot   String
  startedAt            DateTime
  expiresAt            DateTime?
  sessionLimit         Int?
  priceSnapshot        Decimal             @db.Decimal(12, 2)
  status               String              @default("ACTIVE")
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  @@index([trainerId])
  @@index([memberSubscriptionId])
  @@index([orderId])
  @@map("training_service_enrollments")
}
```

### 6.4 Extend `OrderItem`

Recommended add relation only, not raw trainer field:

```prisma
trainingEnrollments TrainingServiceEnrollment[]
```

Reason:

1. trainer assignment is not just one scalar field once historical snapshot and optional member binding are needed

## 7. Migration and Backfill Plan

### 7.1 Migration Order

1. add `renewalMethod` to `member_subscriptions`
2. create `trainers`
3. create `training_service_enrollments`
4. add new relations on `MemberSubscription`, `OrderItem`, `Order`, `Product`

### 7.2 Data Backfill

Backfill rules:

1. existing members -> `renewalMethod = "NONE"`
2. existing PT orders -> no guessed trainer binding
3. historical records without trainer -> surfaced as `UNASSIGNED`

### 7.3 Seed Data

Required seed additions:

1. minimal trainer master dataset for real mode
2. each trainer gets stable `trainerCode`

Recommended approach:

1. add a dedicated trainer seed section in existing seed flow
2. use upsert by `trainerCode`

### 7.4 Rollback Boundary

If trainer rollout is incomplete:

1. migration may stay applied
2. UI nav to `/trainers` must not be exposed until route and data work
3. PT order validation requiring trainer must only ship after trainer master data is present

## 8. API Route Implementation Spec

### 8.1 `POST /api/v1/shifts/open`

Current state:

1. route requires `responsible_name` from body

Target:

1. still accept body for compatibility for one phase
2. reject if body name does not match `session.full_name`
3. eventually derive from session entirely

Target zod transition:

```ts
const openShiftSchema = z.object({
  starting_cash: z.number().min(0),
  responsible_name: z.string().trim().min(1).max(120).optional(),
});
```

Route rule:

1. resolvedResponsibleName = session.full_name
2. if provided body value exists and differs -> 409 `RESPONSIBLE_NAME_MISMATCH`

### 8.2 `POST /api/v1/shifts/close`

Same principle as open shift:

1. derive from session
2. reject spoofed name

### 8.3 `GET /api/v1/reports/daily-summary`

Target query:

1. `period=DAY|WEEK|MONTH|CUSTOM`
2. `date=YYYY-MM-DD` for DAY/WEEK/MONTH
3. `start_date=YYYY-MM-DD`
4. `end_date=YYYY-MM-DD`

Validation rules:

1. DAY/WEEK/MONTH require `date`
2. CUSTOM requires `start_date` and `end_date`
3. `start_date <= end_date`

### 8.4 `GET /api/v1/members`

Target query support:

1. `search`
2. `status=ALL|ACTIVE|EXPIRING_SOON|EXPIRED`

Decision:

1. filtering can remain client-side in first step if payload is small
2. but route should still be capable of future query filtering without contract break

### 8.5 `POST /api/v1/orders`

Target zod:

```ts
items: z.array(
  z.object({
    product_id: z.string().min(1),
    quantity: z.number().int().positive(),
    trainer_id: z.string().min(1).optional(),
    service_start_date: z.string().min(1).optional(),
  })
).min(1)
```

Service validation rules:

1. PT product requires `trainer_id`
2. PT product quantity must be `1`
3. trainer must exist and active

Error codes to add:

1. `TRAINER_REQUIRED`
2. `TRAINER_NOT_FOUND`
3. `TRAINING_SINGLE_QUANTITY`

### 8.6 `GET /api/v1/trainers`

New route responsibility:

1. list trainers
2. include active assignments
3. optionally include all assignments if payload acceptable

Recommended response:

```ts
Array<TrainerRecord & { assignments: TrainingEnrollmentRecord[] }>
```

## 9. Service Layer Implementation Spec

### 9.1 Shift Responsible Truth

Functions affected:

1. `openShiftWithJournal`
2. `closeActiveShiftWithDifference`

Target behavior:

1. service receives trusted responsible name only
2. service never trusts arbitrary page input anymore

### 9.2 Report Range Aggregation

Add helper set in `services.ts` or extracted module:

1. `normalizeReportRange(input)`
2. `getRangeStartAndEnd(period, date, startDate, endDate)`
3. `categorizeProductForReport(product)`

Recommended week rule:

1. use Monday-start week consistently

Recommended month rule:

1. UTC-based first and last day of anchor month

### 9.3 Members Lifecycle

`renewMember(memberId)` target:

1. preserve record id
2. compute next cycle from previous `expiresAt` if still active, else from today
3. set `renewalStatus = "RENEWED"`
4. set `renewalMethod = "EXTEND_FROM_PREVIOUS_END"`

`restartMember(memberId)` target:

1. compute from today
2. set `renewalStatus = "ACTIVE"`
3. set `renewalMethod = "RESTART_FROM_NEW_START"`

### 9.4 PT Order Posting

`createOrderWithJournal()` target extension:

1. identify PT items by SKU prefix `PT-`
2. validate each PT item has trainer_id
3. validate each PT item quantity is 1
4. after `order` and `orderItem` creation, create `TrainingServiceEnrollment`
5. if membership customer exists and can be linked to fresh member record, bind `memberSubscriptionId` when deterministically available

Important grounded constraint:

1. membership creation and PT purchase can occur in same order only if business permits it
2. if same order contains membership and PT, and customer name is same, link enrollment to the newly created member subscription in transaction

If business does not want this complexity in first release:

1. forbid mixed membership + PT checkout in phase 1 trainer rollout

Recommended release decision:

1. allow mixed checkout only after explicit service linking logic is tested
2. otherwise document phase 1 restriction clearly

## 10. Frontend Implementation Spec

### 10.1 `src/app/login/page.tsx`

Implementation checklist:

1. keep same auth handlers
2. replace split grid with centered panel
3. preserve loading/error states
4. keep layout responsive on mobile

### 10.2 `src/components/layout/app-shell.tsx`

Implementation checklist:

1. rename nav label to `สรุปยอด`
2. add `เทรนเนอร์` nav item only after trainers page is shippable
3. ensure role restrictions match business rule

Recommended roles for trainers page:

1. `OWNER`
2. `ADMIN`

### 10.3 `src/app/(app)/reports/daily-summary/page.tsx`

Implementation checklist:

1. rename page title
2. replace date-only state with query object state
3. remove previous-day comparison fetch
4. add segmented period selector
5. add custom range inputs when period = CUSTOM
6. render category summary cards
7. keep payment method summary and sales rows table
8. maintain loading/error UX

### 10.4 `src/app/(app)/members/page.tsx`

Implementation checklist:

1. add search input
2. add status filter
3. add counts: total, active, expiring soon, expired
4. add action buttons renew and restart per member
5. optimistic update optional but not required first release
6. show `renewal_method`
7. show training summary on row or expand section

Recommended UX:

1. keep main table compact
2. use expandable detail row for training history if needed

### 10.5 `src/app/(app)/pos/page.tsx`

Implementation checklist:

1. trainer list load from adapter once page loads
2. when selected sell product category = TRAINING, show trainer selector
3. disable add-to-cart or checkout until trainer is selected
4. PT lines keep trainer binding in cart state
5. cart store may need metadata extension if current line shape lacks trainer_id

Important note:

1. cart-store is a hidden dependency for this requirement
2. update `src/features/pos/cart-store` together with page UI and tests

### 10.6 `src/app/(app)/trainers/page.tsx`

First release structure:

1. top summary cards for trainer count and active assignments
2. trainer cards or table
3. nested assignments table per trainer
4. search by trainer name
5. filter active only

## 11. Hidden Dependencies and Cross-Cutting Changes

ส่วนนี้คืองานที่มักถูกลืมแต่จะทำให้ feature ไม่ครบถ้าไม่ทำ

1. `src/features/pos/cart-store` ต้องรองรับ metadata ต่อ line
2. `tests/frontend/real-adapter-payloads.test.ts` ต้องอัปเดต payload shape ใหม่
3. `tests/frontend/response-shape-alignment.test.ts` ต้องอัปเดต contract fields ใหม่
4. `docs/API_Contract.md` ต้อง sync กับ route จริงหลัง implementation
5. `docs/DatabaseSchema.md` ต้อง sync กับ Prisma truth ใหม่
6. routes ที่ return error ต้องใช้ JSON format เดียวกันทั้งหมด
7. revenue account fallback สำหรับ membership ต้องยังคง default ไป `4020` ตาม grounding memory

## 12. Detailed Phase Script

### Phase A: Contract Freeze

Output:

1. contract names finalized
2. API_Contract updated
3. DatabaseSchema updated

Tasks:

1. finalize enum names: `RenewalMethod`, `TrainingStatus`, `ReportPeriod`
2. finalize `CreateOrderRequest.items[]` target shape
3. finalize report response shape for category totals

Exit criteria:

1. no open naming ambiguity remains

### Phase B: UI Low-Risk

Output:

1. login simplified
2. dashboard hover fixed
3. `สรุปยอด` label visible
4. comparison chart removed

Tasks:

1. login page refactor
2. dashboard quick link hover refactor
3. summary page label cleanup
4. summary comparison section removal

Exit criteria:

1. no schema change needed
2. frontend tests pass for changed pages

### Phase C: Responsible Name Locking

Output:

1. open/close shift lock to session identity

Tasks:

1. auth provider inject identity
2. routes validate mismatch
3. pages become read-only
4. tests cover mismatch path

Exit criteria:

1. user cannot alter responsible name from UI
2. spoofed request rejected

### Phase D: Report Expansion

Output:

1. summary page supports day/week/month/custom
2. category totals visible

Tasks:

1. contract expansion
2. adapter query update
3. service range aggregation
4. route query parsing
5. page UI expansion

Exit criteria:

1. report works end-to-end in real mode

### Phase E: Members Lifecycle Completion

Output:

1. members page actionable and filterable

Tasks:

1. add renewalMethod field and migration
2. update services renew/restart
3. update routes and tests
4. page UI actions and filters

Exit criteria:

1. renew and restart both work from page

### Phase F: Trainer Schema and Seeds

Output:

1. trainers and enrollments exist in DB

Tasks:

1. Prisma schema update
2. migration generation
3. trainer seed implementation
4. route/service scaffolding

Exit criteria:

1. trainer master data available in local and real-compatible env

### Phase G: POS PT Binding

Output:

1. PT checkout requires trainer and persists assignment

Tasks:

1. cart-store metadata extension
2. POS page trainer selector
3. order route zod expansion
4. order service enrollment creation

Exit criteria:

1. PT order without trainer is impossible

### Phase H: Members + Trainers Cross Views

Output:

1. member rows show trainer info
2. trainers page visible and useful

Tasks:

1. members payload enrichment
2. trainers route
3. trainers page
4. nav exposure

Exit criteria:

1. user can inspect trainer assignments from UI only

### Phase I: Backfill and Hardening

Output:

1. historical rows safe
2. no broken real-mode screen because of null trainer history

Tasks:

1. backfill scripts
2. null-safe display messages
3. integrity verification

Exit criteria:

1. historical DB does not break screens

### Phase J: Vitest and Regression Sweep

Output:

1. test suite covers new behavior

Tasks:

1. extend backend tests
2. extend frontend tests
3. add PT regression scenario
4. run final smoke flow

Exit criteria:

1. all relevant tests pass

## 13. Test Mapping Matrix

### 13.1 Backend Tests To Extend

#### `tests/backend/members-routes.test.ts`

Add:

1. response includes `renewal_method`
2. list route still returns JSON 500 on failure after contract expansion
3. renew returns `EXTEND_FROM_PREVIOUS_END`
4. restart returns `RESTART_FROM_NEW_START`

#### `tests/backend/operations-services.test.ts`

Add:

1. report range aggregation for DAY/WEEK/MONTH/CUSTOM
2. sales_by_category totals
3. PT order requires trainer_id
4. PT order creates enrollment record
5. open/close shift trusted responsible name handling

#### `tests/backend/operations-routes.test.ts`

Add:

1. summary route validation for period/date/start/end
2. shift responsible mismatch returns correct JSON code
3. order route maps new trainer errors correctly

#### `tests/backend/phase4-regression-flow.test.ts`

Extend:

1. PT checkout with trainer
2. member renew + restart path
3. summary page range endpoint response

#### New backend test file if needed

1. `tests/backend/trainers-routes.test.ts`

Only create if trainer route coverage becomes too large for existing files.

### 13.2 Frontend Tests To Extend

#### `tests/frontend/members-page.test.tsx`

Add:

1. search filtering
2. expiring/expired filters
3. renew button flow
4. restart button flow
5. trainer summary rendering
6. renewal method rendering

#### `tests/frontend/close-shift-blind-drop.test.tsx`

Add:

1. responsible name shown as read-only
2. no editable responsible input remains

#### `tests/frontend/report-placeholders.test.tsx`

Either repurpose or replace with real summary page coverage:

1. label `สรุปยอด`
2. no comparison graph
3. period switch behavior
4. custom range inputs
5. category totals rendering

#### `tests/frontend/real-adapter-payloads.test.ts`

Add:

1. report query parameter serialization
2. order payload includes trainer_id for PT items

#### `tests/frontend/response-shape-alignment.test.ts`

Add:

1. new `DailySummary` fields
2. new `MemberSubscriptionRecord` fields
3. trainer route response shape

#### `tests/frontend/pos-inventory-management.test.tsx`

Extend or split:

1. PT line requires trainer selection
2. PT line quantity restriction if enforced in UI

#### New frontend test file recommended

1. `tests/frontend/trainers-page.test.tsx`

## 14. Risk Register

### Risk 1: Contract Drift Between Docs and Runtime

Mitigation:

1. update `docs/API_Contract.md` in same PR as code changes
2. add response shape tests

### Risk 2: Historical PT Orders Have No Trainer

Mitigation:

1. do not fabricate data
2. represent as `UNASSIGNED`
3. UI renders Thai fallback text clearly

### Risk 3: Mixed Membership + PT Order Linking

Mitigation:

1. either support deterministically in same transaction
2. or explicitly block in phase 1 trainer release

### Risk 4: Real Mode Regression On Reports

Mitigation:

1. reuse current `getDailySummaryByDate()` structure and refactor into generic range function
2. cover with regression tests

### Risk 5: Responsible Name Still Spoofable Through API

Mitigation:

1. server-side mismatch rejection
2. frontend read-only alone is not enough

## 15. Definition of Ready For Coding

เริ่มเขียนโค้ดได้เมื่อครบดังนี้:

1. IMP นี้ถูกยอมรับเป็น execution source
2. final decision เรื่อง mixed membership + PT checkout ถูกล็อก
3. final decision เรื่อง PT quantity > 1 ถูกล็อกเป็น not allowed
4. final decision เรื่อง expiring soon window ถูกล็อกเป็น 7 วัน
5. final decision เรื่อง trainer page roles ถูกล็อกเป็น OWNER + ADMIN

## 16. Definition of Done

งานชุดนี้เสร็จเมื่อครบทุกข้อ:

1. requirement 1-17 ครบตาม target state
2. schema migration ผ่าน
3. seed/backfill ผ่าน
4. routes, services, adapters, UI, docs sync กัน
5. Vitest ผ่าน
6. smoke flow ผ่านใน real-compatible environment

## 17. Final Recommended Implementation Order

ลำดับที่แนะนำให้ลงมือจริง:

1. Contract freeze docs
2. Login + dashboard + summary label/graph cleanup
3. Shift responsible lock end-to-end
4. Summary range + category expansion
5. Members renewal/filter completion
6. Trainer schema + seed
7. POS PT binding
8. Trainers page + members trainer view
9. Backfill + integrity verification
10. Regression tests and smoke check

เหตุผล:

1. ช่วงต้นเป็นงาน low-risk และลด UI debt ได้ทันที
2. งาน reports และ members มีฐาน service อยู่แล้ว จึงควรปิดก่อน trainer domain
3. trainer domain พึ่ง schema ใหม่และ order payload ใหม่ จึงควรตามหลัง contract stabilization
4. regression sweep ต้องมาหลัง data model ใหม่ครบเท่านั้น

## 18. Immediate Coding Start Point

ถ้าเริ่ม implementation ทันที ให้เริ่มจาก work package นี้ก่อน:

1. update `src/lib/contracts.ts`
2. update `src/features/adapters/types.ts`
3. update `docs/API_Contract.md`
4. update `docs/DatabaseSchema.md`
5. then execute UI low-risk package

นี่คือจุดเริ่มที่ปลอดภัยที่สุด เพราะจะล็อกภาษาและรูปทรงข้อมูลก่อนแก้ backend/frontend logic ชุดใหญ่
