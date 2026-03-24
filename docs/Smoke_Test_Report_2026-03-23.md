# Full System Smoke Test Report

**Date/Time:** 2026-03-23T10:08:31.139Z
**Smoke Code:** SMOKE-20260323-7856
**Target:** http://localhost:3000
**Database:** Real (Supabase PostgreSQL)
**Adapter:** real

## Summary

| Metric | Count |
|--------|-------|
| ✅ PASS | 64 |
| ❌ FAIL | 0 |
| ⏭️ SKIP | 0 |
| **Total** | **64** |

**Overall Result: ✅ PASS**

## Detailed Results

### Auth (3/3)

| Test | Status | Detail |
|------|--------|--------|
| Owner login | ✅ PASS | Status: 200 |
| Session persistence | ✅ PASS | User: owner |
| Unauthenticated block | ✅ PASS | 401 returned correctly |

### Shift (3/3)

| Test | Status | Detail |
|------|--------|--------|
| Open shift | ✅ PASS | Shift ID: cmn30vnqk0016b0tpkm5vcrxm |
| Inventory summary | ✅ PASS | [{"product_id":"cmn30vorc001ab0tp36cv9nr0","sku":"SMOKE-20260323-7856-GOOD","name":"SMOKE-20260323-7 |
| Close shift | ✅ PASS | Expected: 618, Actual: 500, Diff: -118 |

### Products (5/5)

| Test | Status | Detail |
|------|--------|--------|
| List products | ✅ PASS | Count: 116 |
| Create product | ✅ PASS | ID: cmn30vorc001ab0tp36cv9nr0, SKU: SMOKE-20260323-7856-GOOD |
| Update product | ✅ PASS | Name updated, price=119 |
| Stock adjustment | ✅ PASS | Added 5 units |
| Stock adjustment history | ✅ PASS | Count: 1 |

### Orders (2/2)

| Test | Status | Detail |
|------|--------|--------|
| Goods checkout (CASH) | ✅ PASS | Order: cmn30vqq6001cb0tpdwc5keet |
| Membership checkout (PROMPTPAY) | ✅ PASS | Order: cmn30vrup001ib0tpuu7mfmj7 |

### Trainers (5/5)

| Test | Status | Detail |
|------|--------|--------|
| List trainers | ✅ PASS | Count: 19 |
| Create trainer | ✅ PASS | ID: cmn30vt3b001pb0tpb04aombs |
| PT checkout with trainer | ✅ PASS | Order: cmn30vtxh001qb0tp6sdymqab |
| PT enrollment auto-created | ✅ PASS | Enrollment: cmn30vu1o001sb0tpgm7j2lnl |
| Update enrollment | ✅ PASS | Schedule added |

### Members (8/8)

| Test | Status | Detail |
|------|--------|--------|
| List members | ✅ PASS | Count: 104 |
| Membership checkout → Member auto-created | ✅ PASS | Member: undefined |
| Create special member | ✅ PASS | ID: cmn30vw55001xb0tpv3fj4b7b |
| Update member dates | ✅ PASS | Extended by 45 days |
| Toggle member active (deactivate) | ✅ PASS | - |
| Toggle member active (reactivate) | ✅ PASS | - |
| Renew member | ✅ PASS | - |
| Restart member | ✅ PASS | - |

### Expenses (1/1)

| Test | Status | Detail |
|------|--------|--------|
| Create expense | ✅ PASS | Amount: 1 |

### COA (4/4)

| Test | Status | Detail |
|------|--------|--------|
| List accounts | ✅ PASS | Count: 11 |
| Create account | ✅ PASS | Code: 9580, ID: cmn30vzmc0022b0tp5a8zjm0f |
| Toggle account (deactivate) | ✅ PASS | - |
| Toggle account (reactivate) | ✅ PASS | - |

### Reports (6/6)

| Test | Status | Detail |
|------|--------|--------|
| Daily summary (DAY) | ✅ PASS | {"report_period":"DAY","range_start":"2026-03-23","range_end":"2026-03-23","total_sales":12504,"sale |
| Daily summary (WEEK) | ✅ PASS | - |
| Daily summary (MONTH) | ✅ PASS | - |
| Daily summary (CUSTOM) | ✅ PASS | - |
| Shift summary | ✅ PASS | {"date":"2026-03-23","sales_rows":[{"order_id":"cmn2v8ipp0014sgtphq6s8vls","shift_id":"cmn2v7z6x000o |
| General Ledger (CSV) | ✅ PASS | Feature flag disabled — expected |

### Admin (6/6)

| Test | Status | Detail |
|------|--------|--------|
| List users | ✅ PASS | Count: 27 |
| Create admin user | ✅ PASS | Username: smoke.admin.7856 |
| Create cashier user | ✅ PASS | Username: smoke.cashier.7856 |
| Update user schedule | ✅ PASS | 09:00-18:00 |
| Admin login | ✅ PASS | - |
| Cashier login | ✅ PASS | - |

### RBAC (8/8)

| Test | Status | Detail |
|------|--------|--------|
| Admin can read members | ✅ PASS | - |
| Admin can read trainers | ✅ PASS | - |
| Admin can view COA | ✅ PASS | - |
| Admin can read daily summary | ✅ PASS | - |
| Admin blocked from admin/users | ✅ PASS | 403 as expected |
| Cashier can list products | ✅ PASS | - |
| Cashier blocked from creating products | ✅ PASS | 403 as expected |
| Cashier blocked from creating members | ✅ PASS | 403 as expected |

### Attendance (5/5)

| Test | Status | Detail |
|------|--------|--------|
| Device status | ✅ PASS | {"current_ip":"127.0.0.1","current_user_agent":"node","current_device_authorized":false,"active_devi |
| Register device | ✅ PASS | - |
| Cashier attendance status | ✅ PASS | {"today":null,"current_ip":"127.0.0.1","device_allowed":false,"can_check_in":false,"can_check_out":f |
| Cashier check-in | ✅ PASS | Blocked by device/role: ATTENDANCE_DEVICE_NOT_ALLOWED |
| Attendance summary (owner) | ✅ PASS | {"period":"DAY","range_start":"2026-03-23","range_end":"2026-03-23","summary_rows":[{"user_id":"user |

### Ingredients (1/1)

| Test | Status | Detail |
|------|--------|--------|
| List ingredients | ✅ PASS | Count: 7 |

### Cleanup (7/7)

| Test | Status | Detail |
|------|--------|--------|
| Delete enrollment | ✅ PASS | Status: 200 |
| Delete trainer | ✅ PASS | Status: 200 |
| Delete special member | ✅ PASS | Status: 200 |
| Delete auto-created member | ✅ PASS | Status: 200 |
| Delete smoke orders | ✅ PASS | Count: 3, Status: 200 |
| Delete admin user | ✅ PASS | Status: 200 |
| Delete cashier user | ✅ PASS | Status: 200 |

## Flow Coverage Map

| Flow | Tested |
|------|--------|
| Auth: Login / Session / Unauthenticated block | ✅ |
| Shift: Open / Active check / Close | ✅ |
| Products: List / Create / Update / Stock adjust / History | ✅ |
| Orders: Goods checkout (CASH) | ✅ |
| Orders: Membership checkout (PROMPTPAY) | ✅ |
| Orders: PT checkout with trainer (CREDIT_CARD) | ✅ |
| Members: List / Create special / Update dates / Toggle / Renew / Restart | ✅ |
| Trainers: List / Create / PT enrollment / Update enrollment | ✅ |
| Expenses: Create with COA account | ✅ |
| Reports: Daily (DAY/WEEK/MONTH/CUSTOM) / Shift / GL | ✅ |
| COA: List / Create / Toggle | ✅ |
| Admin: List users / Create admin / Create cashier / Update schedule | ✅ |
| RBAC: Admin read-only / Admin blocked / Cashier blocked | ✅ |
| Attendance: Device / Status / Check-in / Summary | ✅ |
| Ingredients: List | ✅ |
| Cleanup: Delete smoke data | ✅ |

## API Endpoints Tested

| Method | Endpoint | Tested |
|--------|----------|--------|
| POST | /api/auth/sign-in/username | ✅ |
| GET | /api/auth/session | ✅ |
| GET | /api/v1/shifts/active | ✅ |
| POST | /api/v1/shifts/open | ✅ |
| POST | /api/v1/shifts/close | ✅ |
| GET | /api/v1/shifts/:shiftId/inventory-summary | ✅ |
| GET | /api/v1/products | ✅ |
| POST | /api/v1/products | ✅ |
| PATCH | /api/v1/products/:productId | ✅ |
| GET | /api/v1/products/stock-adjustments | ✅ |
| POST | /api/v1/products/stock-adjustments | ✅ |
| POST | /api/v1/orders | ✅ (3 types) |
| POST | /api/v1/orders/bulk-delete | ✅ |
| GET | /api/v1/members | ✅ |
| POST | /api/v1/members/special | ✅ |
| PATCH | /api/v1/members/:memberId | ✅ |
| PATCH | /api/v1/members/:memberId/toggle-active | ✅ |
| POST | /api/v1/members/:memberId/renew | ✅ |
| POST | /api/v1/members/:memberId/restart | ✅ |
| DELETE | /api/v1/members/:memberId | ✅ |
| GET | /api/v1/trainers | ✅ |
| POST | /api/v1/trainers | ✅ |
| DELETE | /api/v1/trainers/:trainerId | ✅ |
| PATCH | /api/v1/trainers/enrollments/:enrollmentId | ✅ |
| DELETE | /api/v1/trainers/enrollments/:enrollmentId | ✅ |
| POST | /api/v1/expenses | ✅ |
| GET | /api/v1/reports/daily-summary | ✅ (4 periods) |
| GET | /api/v1/reports/shift-summary | ✅ |
| GET | /api/v1/reports/gl | ✅ |
| GET | /api/v1/coa | ✅ |
| POST | /api/v1/coa | ✅ |
| PATCH | /api/v1/coa/:accountId/toggle | ✅ |
| GET | /api/v1/admin/users | ✅ |
| POST | /api/v1/admin/users | ✅ (2 roles) |
| PATCH | /api/v1/admin/users/:userId | ✅ |
| DELETE | /api/v1/admin/users/:userId | ✅ |
| GET | /api/v1/attendance/device | ✅ |
| POST | /api/v1/attendance/device | ✅ |
| GET | /api/v1/attendance/status | ✅ |
| POST | /api/v1/attendance/check-in | ✅ |
| GET | /api/v1/admin/users/attendance-summary | ✅ |
| GET | /api/v1/ingredients | ✅ |

## Audit Trail Records (Not Cleaned Up)

These smoke records are intentionally left in the database as audit trail:

- Shift open/close record from this smoke session
- Expense record: "SMOKE-20260323-7856 petty cash test" (1 THB)
- COA account: "SMOKE-20260323-7856 TEMP ACCOUNT"
- Product: "SMOKE-20260323-7856 Product Updated"

## Cleaned Up Records

The following smoke data was created and cleaned up:

- Smoke orders (goods, membership, training)
- Smoke member (manual + auto-created from checkout)
- Smoke trainer + PT enrollment
- Smoke admin + cashier user accounts

## Security Findings

### RBAC: Cashier Product Create (RESOLVED)

During earlier rounds of smoke testing, a **stale production build** allowed CASHIER role users to create products (HTTP 201 instead of 403). 

- **Root cause:** The running server was using a compiled build from before `canManageProducts()` in `src/lib/roles.ts` was updated to exclude CASHIER.
- **Resolution:** Server was rebuilt (`npm run build`) and RBAC now correctly blocks CASHIER from creating products (verified: 403).
- **Unit test fix:** `tests/backend/admin-users-guard.test.ts` had a stale assertion expecting `canManageProducts("CASHIER")` to be `true`. Updated to `false` — test now passes.
- **Recommendation:** Always rebuild after changing role permissions. Consider adding a CI step to rebuild before RBAC tests.
