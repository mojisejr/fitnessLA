# API Interface Contract (Phase 1)
**Project:** fitnessLA (Gym Management System)
**Status:** 📜 CONTRACT-LOCKED (Finalized for Parallel Work)
**Governance:** Person A (Backend/Logic) & Person B (Frontend/UX) must adhere to these types.

---

## 🛠️ Global Config & Error Handling
- **Base URL:** `/api/v1`
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
**Endpoint:** `GET /api/session`
```typescript
interface UserSession {
  user_id: number;
  username: string;
  full_name: string;
  role: 'OWNER' | 'ADMIN' | 'CASHIER';
  active_shift_id: number | null; // NULL if no shift is open
}
```

---

## 2. Shift Management (The Hard Gate)
ระบบบังคับเปิด-ปิดกะเพื่อคุมเงินสด

### **POST /api/shifts/open**
- **Purpose:** เปิดกะใหม่ด้วยเงินทอนตั้งต้น
- **Request:** `{ starting_cash: number }`
- **Success:** `201 { shift_id: number, opened_at: string }`

### **POST /api/shifts/close**
- **Purpose:** ปิดกะด้วย Blind Drop (นับเงินจริง)
- **Request:** `{ actual_cash: number, closing_note?: string }`
- **Response (Backend Calculates):** 
  ```typescript
  interface ShiftCloseResult {
    shift_id: number;
    expected_cash: number; // calculated by system
    actual_cash: number;
    difference: number; // actual - expected
    status: 'CLOSED';
    journal_entry_id: number; // reference to shortage/overage entry
  }
  ```

---

## 3. POS & Sales (Order Posting)
### **GET /api/products**
- **Response:** `Array<Product>`
```typescript
interface Product {
  product_id: number;
  sku: string;
  name: string;
  price: number;
  product_type: 'GOODS' | 'SERVICE' | 'MEMBERSHIP';
}
```

### **POST /api/orders**
- **Request:**
```typescript
interface CreateOrderRequest {
  shift_id: number;
  items: {
    product_id: number;
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
  order_id: number;
  order_number: string;
  total_amount: number;
  tax_doc_number: string; // e.g., "INV-2026-0001"
  status: 'COMPLETED';
}
```

---

## 4. Petty Cash (Expense Tracking)
### **POST /api/expenses**
- **Request (Multipart Form Data):**
  - `shift_id`: number
  - `account_id`: number (from COA)
  - `amount`: number
  - `description`: string
  - `receipt_file`: File (Image)
- **Response:** `{ expense_id: number, status: 'POSTED' }`

---

## 5. Accounting & Reports (Owner/Accountant)
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

---

## 💡 Implementation Rules for Person A & B
1. **Mocking:** Person B (Frontend) ควรสร้าง `MockServer` หรือ `handlers` ที่ Return ข้อมูลตาม Interface นี้ทันที
2. **Atomic Ops:** Person A (Backend) ต้องมั่นใจว่า `/api/orders` ทำงานใน 1 Database Transaction (Order + Item + Journal + TaxDoc)
3. **No Changing:** หากต้องการเพิ่มฟิลด์ ต้องคุยกันและอัปเดตไฟล์นี้ก่อนแก้ Code
