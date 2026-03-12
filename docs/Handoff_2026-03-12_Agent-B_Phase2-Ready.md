# Agent B Handoff: Phase 2 Backend Ready (2026-03-12)

## Scope
เอกสารนี้เป็น handoff ฉบับพร้อมลงมือสำหรับ Agent B หลัง Agent A ปิดงาน Phase 2 backend แล้ว เพื่อให้เชื่อมต่อ frontend ต่อได้รวดเร็วและไม่หลุด contract

## Backend Deliverables ที่เสร็จแล้ว

- Dynamic Revenue Journaling เสร็จแล้วใน `src/features/operations/services.ts`
  - `createOrderWithJournal` แยกเครดิตรายได้ตาม `product.revenueAccountId`
  - fallback ไปบัญชี `4010` ถ้า product ไม่มี mapping
- GL Export API เสร็จแล้ว
  - Route: `GET /api/v1/reports/gl`
  - Query: `start_date`, `end_date` (รูปแบบ `YYYY-MM-DD`)
  - Response: `text/csv`
- COA CRUD/Toggle ใช้งานจริงแล้ว
  - `GET /api/v1/coa`
  - `POST /api/v1/coa`
  - `PATCH /api/v1/coa/:accountId/toggle`
- Product revenue mapping ใช้งานจริงแล้ว
  - `POST /api/v1/products`
  - `PATCH /api/v1/products/:productId`
  - รองรับ `revenue_account_id`

## Evidence

- Commit backend completion: `3167adc`
- Hard gate ล่าสุดผ่านทั้งหมด:
  - `npm run build`
  - `npm run lint`
  - `npx vitest run` = `89/89`
- Snapshot log: `ψ/memory/logs/fitnessLA/2026-03-12_22-00_phase2-accounting-soul-complete.md`

## Integration Points ที่ Agent B ต้องแตะ

1. `src/features/adapters/real-app-adapter.ts`
- ใช้ method ที่มีอยู่แล้วต่อ API จริงสำหรับ COA/Product/Orders/Reports
- **ต้องใช้** `credentials: "include"` ทุก request (ไฟล์นี้รองรับไว้แล้ว)

2. `src/app/(app)/reports/general-ledger/page.tsx`
- ปัจจุบันยังเป็น placeholder
- งานที่ต้องทำ:
  - เพิ่ม date range picker (`start_date`, `end_date`)
  - ปุ่ม `Download CSV`
  - เรียก endpoint `/api/v1/reports/gl?...` แล้ว trigger download

3. `src/app/(app)/coa/page.tsx` + หน้า product management ที่เกี่ยวข้อง
- ผูก dropdown เลือกบัญชีรายได้จาก `listChartOfAccounts()`
- ตอน create/update product ต้องส่ง `revenue_account_id` ให้ตรง field name

## Quick Integration Flow (Recommended)

1. Agent B เปลี่ยน report GL จาก demo placeholder เป็น export action จริง
2. Agent B ตรวจว่า create/edit product มี field ผูก `revenue_account_id` ครบ
3. Agent B รัน smoke test flow:
- เปิดกะ
- ขายสินค้า 2 ประเภทที่ map คนละ revenue account
- export GL CSV
- เช็คว่า CSV มีหลายบรรทัดรายได้และ debit/credit สมดุล

## Guardrails / จุดเสี่ยง

- GL endpoint คืนค่าเป็น CSV ไม่ใช่ JSON
- Query params ต้องเป็น `start_date` และ `end_date` เท่านั้น
- format วันที่ต้องเป็น `YYYY-MM-DD` เท่านั้น
- ห้ามเปลี่ยนชื่อ field contract โดยพลการ เช่น:
  - `revenue_account_id`
  - `account_code`
  - `account_name`
- ถ้า UI ส่ง request ตอน shift ไม่อยู่สถานะเปิด จะได้ `SHIFT_NOT_OPEN` (409)
- COA บางบัญชีถูกระบบ lock (`locked_reason`) ห้าม toggle จาก UI โดยไม่แสดง error ให้ผู้ใช้

## Must Not Forget

- แสดง loading + error + success feedback ทุก action ที่ยิง API
- Handle 401/403 บนหน้า report/coa ให้ชัดเจน (role gate)
- Test frontend contract alignment หลังเชื่อมจริงทุกจุด

## Suggested Test Additions (Agent B)

- เพิ่ม frontend test: GL page triggers CSV download with correct query params
- เพิ่ม frontend test: product form sends `revenue_account_id` on create/update
- เพิ่ม frontend test: COA toggle shows locked error when backend returns `ACCOUNT_LOCKED`

## Out of Scope (ยังไม่ต้องต่อรอบนี้)

- Shift summary report API
- Profit/Loss API
- Advanced inventory adjustment API

## Definition of Done สำหรับ Agent B รอบนี้

- Owner/Admin ใช้หน้า COA และ Product mapping กับ backend จริงได้
- Owner ดาวน์โหลด GL CSV จาก UI ได้
- ไม่มี contract drift ระหว่าง frontend และ `docs/API_Contract.md`
- Frontend tests ที่เพิ่มใหม่ผ่านทั้งหมด
