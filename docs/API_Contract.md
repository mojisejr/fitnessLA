# API Interface Contract (Phase 1)
**Project:** fitnessLA (Gym Management System)
**Status:** Current Working Contract as of 2026-03-10
**Governance:** Person A (Backend/Logic) & Person B (Frontend/UX) must adhere to these types and update this file when implementation drifts.

---

## 🛠️ Global Config & Error Handling
- **Base URL:** `/api/v1`
- **Auth Session Endpoint:** `/api/auth/session`
- **Current Session Mode:** Temporary header-based bridge in implementation today. Better Auth full browser flow is not the final locked contract yet.
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

**Current implementation note:** route ปัจจุบัน resolve session จาก request headers (`x-user-id` หรือ `x-username`) เพื่อใช้เป็น bridge ระหว่างรอ auth flow จริงครบ

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
  }
  ```
- **Not Found:** `404 { code: 'SHIFT_NOT_FOUND', ... }`

---

### **POST /api/v1/shifts/open**
- **Purpose:** เปิดกะใหม่ด้วยเงินทอนตั้งต้น
- **Request:** `{ starting_cash: number }`
- **Success:** `201 { shift_id: string, opened_at: string, journal_entry_id: string }`

### **POST /api/v1/shifts/close**
- **Purpose:** ปิดกะด้วย Blind Drop (นับเงินจริง)
- **Request:** `{ actual_cash: number, closing_note?: string }`
- **Response (Backend Calculates):** 
  ```typescript
  interface ShiftCloseResult {
    shift_id: string;
    expected_cash: number; // calculated by system
    actual_cash: number;
    difference: number; // actual - expected
    status: 'CLOSED';
    journal_entry_id: string; // reference to shortage/overage entry
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
- Backend route สำหรับ COA ยังไม่ถูก implement ใน route set ปัจจุบัน
- ด้านล่างนี้คือ draft contract ที่ต้องใช้ร่วมกันก่อนเริ่มต่อ API จริง

### **GET /api/v1/coa**
- **Purpose:** โหลดผังบัญชีทั้งหมดเพื่อใช้ในหน้า COA และเลือก expense account
- **Draft Response:**
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
- **Draft Request:**
  ```typescript
  interface CreateChartOfAccountRequest {
    account_code: string;
    account_name: string;
    account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    description?: string;
  }
  ```
- **Draft Response:** `ChartOfAccountRecord`

### **PATCH /api/v1/coa/:accountId/toggle**
- **Purpose:** เปิดหรือปิดการใช้งานบัญชี
- **Draft Response:** `ChartOfAccountRecord`
- **Validation Note:** ถ้าบัญชีถูก lock ด้วย usage ทางบัญชี ให้ตอบ error เช่น `ACCOUNT_LOCKED`

**Frontend readiness note:** ฝั่ง UI ถูกเตรียมให้ใช้ shape นี้แล้ว ดังนั้น backend ควรยึด field names ตาม draft นี้เพื่อลด mapping ที่ไม่จำเป็น

---

## 7. Accounting & Reports (Owner/Accountant)
### **GET /api/reports/daily-summary?date=YYYY-MM-DD**
```typescript
interface DailySummary {
  total_sales: number;
  sales_by_method: { CASH: number, PROMPTPAY: number, CREDIT_CARD: number };
  total_expenses: number;
  net_cash_flow: number;
  shift_discrepancies: number; // sum of differences
}
```

**Current implementation status:** daily summary is implemented. Shift summary, P&L, general ledger, and export endpoints are not yet part of the implemented route set.

---

## 💡 Implementation Rules for Person A & B
1. **Mocking:** Person B (Frontend) ควรสร้าง `MockServer` หรือ `handlers` ที่ Return ข้อมูลตาม Interface นี้ทันที
2. **Atomic Ops:** Person A (Backend) ต้องมั่นใจว่า `/api/orders` ทำงานใน 1 Database Transaction (Order + Item + Journal + TaxDoc)
3. **No Changing:** หากต้องการเพิ่มฟิลด์ ต้องคุยกันและอัปเดตไฟล์นี้ก่อนแก้ Code
