# API Interface Contract (Phase 2)
**Project:** fitnessLA (Gym Management System)
**Status:** Current Working Contract as of 2026-03-12
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

**Current implementation status:** daily summary, shift summary, COA routes, product revenue mapping, และ general ledger CSV export ถูก implement แล้ว. P&L ยังรอ implementation.

---

## 💡 Implementation Rules for Person A & B
1. **Mocking:** Person B (Frontend) ควรสร้าง `MockServer` หรือ `handlers` ที่ Return ข้อมูลตาม Interface นี้ทันที
2. **Atomic Ops:** Person A (Backend) ต้องมั่นใจว่า `/api/orders` ทำงานใน 1 Database Transaction (Order + Item + Journal + TaxDoc)
3. **No Changing:** หากต้องการเพิ่มฟิลด์ ต้องคุยกันและอัปเดตไฟล์นี้ก่อนแก้ Code
