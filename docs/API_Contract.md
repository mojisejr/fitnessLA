# API Interface Contract (Phase 5 Lock)
**Project:** fitnessLA (Gym Management System)
**Status:** Final integration contract lock as of 2026-03-15
**Governance:** Person A (Backend/Logic) & Person B (Frontend/UX) must adhere to these types and update this file when implementation drifts.

---

## 🛠️ Global Config & Error Handling
- **Base URL:** `/api/v1`
- **Auth Session Endpoint:** `/api/auth/session`
- **Current Session Mode:** Better-Auth cookie session (browser credentials mode)
- **ID Format (Current Backend Reality):** Primary entity identifiers currently come back as `string` from Prisma-backed routes.
- **Standard Error Body:**
  ```typescript
  type ApiError = {
    code: string; // e.g., "SHIFT_ALREADY_OPEN", "INSUFFICIENT_FUNDS"
    message: string; // User-friendly Thai message
    details?: any;
  }
  ```

---

## 🛡️ Testing & Validation Standards
- **Testing Framework:** Vitest
- **Test Location:** All tests in root `tests/` directory (e.g., `tests/backend/`, `tests/frontend/`)
- **Backend Rules:** ต้องทดสอบ API Response DTO ให้ตรงตาม Contract นี้เสมอ
- **Frontend Rules:** ต้องใช้ Mock Data ที่ล้อตาม Contract นี้ใน Unit Tests

## 1. Authentication & Session (RBAC)
**Endpoint:** `GET /api/auth/session`
```typescript
interface UserSession {
  user_id: string;
  username: string;
  full_name: string;
  role: 'OWNER' | 'ADMIN' | 'CASHIER';
  active_shift_id: string | null; // NULL if no shift is open
}
```

**Current implementation note:** route ปัจจุบันใช้ cookie session จาก Better-Auth โดยตรง (real mode)

---

## 2. Shift Management (The Hard Gate)
ระบบบังคับเปิด-ปิดกะเพื่อคุมเงินสด

### **GET /api/v1/shifts/active**
- **Purpose:** ตรวจสอบว่าผู้ใช้ปัจจุบันมีกะเปิดอยู่หรือไม่
- **Success Response:**
  ```typescript
  interface ActiveShiftResult {
    shift_id: string;
    opened_at: string;
    starting_cash: number;
    status: 'OPEN';
    responsible_name?: string;
  }
  ```
- **Not Found:** `404 { code: 'SHIFT_NOT_FOUND', ... }`

---

### **POST /api/v1/shifts/open**
- **Purpose:** เปิดกะใหม่ด้วยเงินทอนตั้งต้น
- **Request:** `{ starting_cash: number, responsible_name: string }`
- **Success:** `201 { shift_id: string, opened_at: string, journal_entry_id: string, responsible_name: string }`

### **POST /api/v1/shifts/close**
- **Purpose:** ปิดกะด้วย Blind Drop (นับเงินจริง)
- **Request:** `{ actual_cash: number, closing_note?: string, responsible_name: string }`
- **Response (Backend Calculates):** 
  ```typescript
  interface ShiftCloseResult {
    shift_id: string;
    expected_cash: number; // calculated by system
    actual_cash: number;
    difference: number; // actual - expected
    status: 'CLOSED';
    journal_entry_id: string; // reference to shortage/overage entry
    responsible_name: string;
  }
  ```

---

## 3. POS & Sales (Order Posting)
### **GET /api/v1/products**
- **Response:** `Array<Product>`
```typescript
interface Product {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  product_type: 'GOODS' | 'SERVICE' | 'MEMBERSHIP';
  revenue_account_id?: string;
}
```

### **POST /api/v1/products**
- **Purpose:** สร้างสินค้าใหม่และผูก Revenue Account (COA)
- **Auth:** `OWNER` | `ADMIN`
- **Request:**
```typescript
interface CreateProductRequest {
  sku: string;
  name: string;
  price: number;
  product_type: 'GOODS' | 'SERVICE' | 'MEMBERSHIP';
  revenue_account_id?: string; // optional, defaults to account code 4010
}
```

### **PATCH /api/v1/products/:productId**
- **Purpose:** แก้ไขสินค้าและสลับ Revenue Account Mapping
- **Auth:** `OWNER` | `ADMIN`
- **Request:**
```typescript
interface UpdateProductRequest {
  sku: string;
  name: string;
  price: number;
  revenue_account_id?: string;
}
```

### **POST /api/v1/orders**
- **Request:**
```typescript
interface CreateOrderRequest {
  shift_id: string;
  items: {
    product_id: string;
    quantity: number;
  }[];
  payment_method: 'CASH' | 'PROMPTPAY' | 'CREDIT_CARD';
  customer_info?: {
    name: string;
    tax_id?: string;
  };
}
```
- **Success Response (Atomic Result):**
```typescript
interface OrderResult {
  order_id: string;
  order_number: string;
  total_amount: number;
  tax_doc_number: string; // e.g., "INV-2026-0001"
  status: 'COMPLETED';
}
```

---

## 4. Petty Cash (Expense Tracking)
### **POST /api/v1/expenses**
- **Current Backend Request Support:**
  - `application/json`
  - `multipart/form-data`
- **Recommended Frontend Integration Path:** `multipart/form-data`
- **Request Fields:**
  - `shift_id`: string
  - `account_id`: string (from COA)
  - `amount`: number
  - `description`: string
  - `receipt_file`: File (Image) when upload flow is active
  - `receipt_url`: string (temporary compatibility path in current implementation)
- **Response:** `{ expense_id: string, status: 'POSTED' }`

**Note:** Storage strategy และ final upload semantics ยังต้องล็อกเพิ่มก่อนถือเป็น final production contract

---

## 5. Admin User Creation
### **POST /api/v1/admin/users**
- **Purpose:** สร้างผู้ใช้ใหม่โดยตรงจากฝั่ง admin/owner
- **Request:**
  ```typescript
  interface CreateAdminUserRequest {
    username: string;
    full_name: string;
    email: string;
    role: 'OWNER' | 'ADMIN' | 'CASHIER';
  }
  ```
- **Response:**
  ```typescript
  interface CreateAdminUserResponse {
    user_id: string;
    username: string;
    full_name: string;
    email: string;
    role: 'OWNER' | 'ADMIN' | 'CASHIER';
  }
  ```

**Current scope note:** approval queue workflow ยังไม่อยู่ใน current backend contract

---

## 6. Chart of Accounts (COA)
### **Current Status**
- Frontend มีหน้า COA และใช้ adapter contract แล้ว
- Backend routes ถูก implement แล้วใน route set ปัจจุบัน
- Contract ด้านล่างคือ shape ที่ใช้งานจริง

### **GET /api/v1/coa**
- **Purpose:** โหลดผังบัญชีทั้งหมดเพื่อใช้ในหน้า COA และเลือก expense account
- **Response:**
  ```typescript
  interface ChartOfAccountRecord {
    account_id: string;
    account_code: string;
    account_name: string;
    account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    is_active: boolean;
    description?: string;
    locked_reason?: string;
  }
  ```

### **POST /api/v1/coa**
- **Purpose:** สร้างรหัสบัญชีใหม่
- **Request:**
  ```typescript
  interface CreateChartOfAccountRequest {
    account_code: string;
    account_name: string;
    account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    description?: string;
  }
  ```
- **Response:** `ChartOfAccountRecord`

### **PATCH /api/v1/coa/:accountId/toggle**
- **Purpose:** เปิดหรือปิดการใช้งานบัญชี
- **Response:** `ChartOfAccountRecord`
- **Validation Note:** ถ้าบัญชีถูก lock ด้วย usage ทางบัญชี ให้ตอบ error เช่น `ACCOUNT_LOCKED`

**Frontend readiness note:** ฝั่ง UI ถูกเตรียมให้ใช้ shape นี้แล้ว ดังนั้น backend ควรยึด field names ตาม draft นี้เพื่อลด mapping ที่ไม่จำเป็น

---

## 7. Accounting & Reports (Owner/Accountant)
### **GET /api/v1/reports/daily-summary?date=YYYY-MM-DD**
```typescript
interface DailySummary {
  total_sales: number;
  sales_by_method: { CASH: number, PROMPTPAY: number, CREDIT_CARD: number };
  total_expenses: number;
  net_cash_flow: number;
  shift_discrepancies: number; // sum of differences
}
```

### **GET /api/v1/reports/shift-summary?date=YYYY-MM-DD&responsible_name=...**
- **Purpose:** รายงานสรุปกะแบบ dedicated สำหรับกะที่ปิดแล้ว (ไม่ประกอบผ่าน daily summary)
- **Auth:** `OWNER` | `ADMIN`
- **Validation:**
  - `date` ต้องเป็น `YYYY-MM-DD`
  - `responsible_name` เป็น optional แต่ห้ามเป็นค่าว่าง
- **Response:**
```typescript
interface ShiftSummary {
  date: string;
  sales_rows: Array<{
    order_id: string;
    shift_id: string;
    order_number: string;
    sold_at: string;
    items_summary: string;
    cashier_name: string;
    responsible_name?: string;
    customer_name: string | null;
    payment_method: 'CASH' | 'PROMPTPAY' | 'CREDIT_CARD';
    total_amount: number;
  }>;
  shift_rows: Array<{
    shift_id: string;
    closed_at: string;
    responsible_name: string;
    expected_cash: number;
    actual_cash: number;
    difference: number;
    receipt_count: number;
    sales_by_method: { CASH: number; PROMPTPAY: number; CREDIT_CARD: number };
    total_sales: number;
  }>;
  totals: {
    receipt_count: number;
    sales_by_method: { CASH: number; PROMPTPAY: number; CREDIT_CARD: number };
    total_sales: number;
    cash_overage: number;
    cash_shortage: number;
  };
}
```

### **GET /api/v1/reports/gl?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD**
- **Purpose:** Export General Ledger by date range in CSV format
- **Auth:** `OWNER` | `ADMIN`
- **Response:** `text/csv; charset=utf-8`
- **Header:** `Date,Account Code,Account Name,Debit,Credit,Description`
- **CSV row example:**
  ```csv
  2026-03-09,1010,Cash,3000.00,0.00,Order ORD-2026-0001
  ```
- **Validation:** ถ้า query date format ผิดหรือช่วงวันที่ไม่ถูกต้อง ให้คืน `400` พร้อม `code` เป็น `VALIDATION_ERROR` หรือ `INVALID_DATE_RANGE`

### **GET /api/v1/shifts/:shiftId/inventory-summary**
- **Purpose:** ดึงสรุปสินค้าในกะสำหรับหน้า POS/Close Shift ในโหมด real adapter
- **Auth:**
  - `OWNER` | `ADMIN` ดูได้ทุกกะ
  - `CASHIER` ดูได้เฉพาะกะของตัวเอง (`SHIFT_OWNER_MISMATCH` เมื่อข้ามสิทธิ์)
- **Response:** `Array<ShiftInventorySummaryRow>`
```typescript
interface ShiftInventorySummaryRow {
  product_id: string;
  sku: string;
  name: string;
  opening_stock: number;
  sold_quantity: number;
  remaining_stock: number;
}
```
- **Error Cases:**
  - `404 { code: 'SHIFT_NOT_FOUND' }`
  - `403 { code: 'SHIFT_OWNER_MISMATCH' }`
- **Current Backend Semantics (Phase 3):**
  - aggregate เฉพาะสินค้าประเภท `GOODS` ที่เกิดใน `order_items` ของกะนั้น
  - ถ้าไม่พบ movement ของสินค้า `GOODS` ให้คืน `[]` (deterministic no-data fallback)
  - เนื่องจาก stock ledger ยังไม่ persist ใน schema ปัจจุบัน จึงรายงาน `opening_stock` เท่ากับยอดขายสะสม และ `remaining_stock = 0` เพื่อคงความเสถียรของ contract จนกว่าจะเปิด inventory ledger phase ถัดไป

**Current implementation status:** daily summary, shift summary, shift inventory summary, COA routes, product revenue mapping, และ general ledger CSV export ถูก implement แล้ว. P&L ยังรอ implementation.

---

## 8. Ready-to-Integrate Checklist (Agent B)

### Endpoint Matrix
| Surface | Method | Endpoint | Minimum Expectation |
| --- | --- | --- | --- |
| Active Shift | `GET` | `/api/v1/shifts/active` | `404 SHIFT_NOT_FOUND` when no open shift |
| Open Shift | `POST` | `/api/v1/shifts/open` | returns persisted `responsible_name` |
| Create Order | `POST` | `/api/v1/orders` | atomic order result + tax doc number |
| Create Expense | `POST` | `/api/v1/expenses` | accepts receipt upload and returns `expense_id` |
| Close Shift | `POST` | `/api/v1/shifts/close` | returns expected/actual/difference + journal ref |
| Daily Summary | `GET` | `/api/v1/reports/daily-summary?date=...` | returns `sales_rows` + `shift_rows` |
| Shift Summary | `GET` | `/api/v1/reports/shift-summary?date=...[&responsible_name=...]` | returns shift aggregates + totals |
| Shift Inventory Summary | `GET` | `/api/v1/shifts/:shiftId/inventory-summary` | role guard + deterministic `[]` on no-data |
| GL Export | `GET` | `/api/v1/reports/gl?start_date=...&end_date=...` | returns CSV (`text/csv`) |

### Smoke Sequence (Deterministic)
1. เปิดกะผ่าน `POST /api/v1/shifts/open` ด้วย `responsible_name`
2. ขายสินค้าอย่างน้อย 1 รายการผ่าน `POST /api/v1/orders`
3. บันทึกรายจ่ายพร้อมใบเสร็จผ่าน `POST /api/v1/expenses`
4. ปิดกะผ่าน `POST /api/v1/shifts/close`
5. ตรวจ `daily-summary`, `shift-summary`, และ `gl` ว่าเลขสอดคล้องกัน
6. ตรวจ `shifts/:shiftId/inventory-summary` ว่าได้ผลลัพธ์ตามสิทธิ์ผู้ใช้และ no-data fallback

### Expected Outputs (Quick Assertions)
- `daily-summary.shift_rows[].responsible_name` มาจาก persisted state
- `shift-summary.totals.total_sales` เท่ากับยอดรวมจาก `shift_rows[].total_sales`
- `inventory-summary`:
  - shift คนอื่นสำหรับ cashier -> `403 SHIFT_OWNER_MISMATCH`
  - shift ไม่พบ -> `404 SHIFT_NOT_FOUND`
  - ไม่มี movement สินค้า GOODS -> `[]`
- `gl` CSV ต้องมี header `Date,Account Code,Account Name,Debit,Credit,Description`

### Final Handoff Pointer
- Canonical handoff package: `docs/Handoff_2026-03-15_Agent-A_Final_100_to_Agent-B.md`

---

## 💡 Implementation Rules for Person A & B
1. **Mocking:** Person B (Frontend) ควรสร้าง `MockServer` หรือ `handlers` ที่ Return ข้อมูลตาม Interface นี้ทันที
2. **Atomic Ops:** Person A (Backend) ต้องมั่นใจว่า `/api/orders` ทำงานใน 1 Database Transaction (Order + Item + Journal + TaxDoc)
3. **No Changing:** หากต้องการเพิ่มฟิลด์ ต้องคุยกันและอัปเดตไฟล์นี้ก่อนแก้ Code
