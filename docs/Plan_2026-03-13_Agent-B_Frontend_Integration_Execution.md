# Agent B Detailed Execution Plan: Phase 2 Frontend Integration

**Project:** fitnessLA  
**Date:** 2026-03-13  
**Owner:** Frontend / Agent B  
**Goal:** ปิดงานเชื่อมต่อ frontend กับ backend Phase 2 ให้ครบตาม handoff ล่าสุด โดยไม่หลุด API contract และมี test รองรับก่อนส่งต่อ

## Execution Update 2026-03-13

สถานะหลังลงมือจริงใน repository นี้:

- Phase A ถึง Phase F เสร็จแล้ว
- หน้า General Ledger เปลี่ยนจาก placeholder เป็น CSV export flow จริงแล้ว
- POS product editor รองรับ revenue account mapping แล้วทั้ง create และ update
- COA UI hardening เสร็จ และ role access ปรับให้สอดคล้องกับ backend (`OWNER` และ `ADMIN`)
- เพิ่ม frontend regression tests สำหรับ GL download, product revenue mapping, และ COA locked error แล้ว
- รอบ mock preview ที่ใช้จัดหน้า POS เป็นงานระดับ presentation เท่านั้น เส้นทางข้อมูลจริงยังกลับไปใช้ real adapter ได้เหมือนเดิมเมื่อกำหนด `NEXT_PUBLIC_APP_ADAPTER=real`
- validation ผ่านแล้วครบ: `npm run lint`, `npx vitest run`, `npm run build`

ผล validation ล่าสุด:

- Vitest ผ่าน `93/93`
- build ผ่าน
- lint ผ่าน

สถานะของ Phase G ตอนนี้:

- ยังไม่สามารถทำ manual smoke test แบบ real mode ได้ใน workspace ปัจจุบัน
- เหตุผลคือไม่มี `.env` และไม่มี env vars ที่จำเป็นใน shell ปัจจุบัน (`DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_ADAPTER`)
- ดังนั้น blocker ของ Phase G รอบนี้คือ environment readiness ไม่ใช่ frontend implementation

สิ่งที่ต้องทำต่อทันทีเมื่อ env พร้อม:

1. ตั้ง `NEXT_PUBLIC_APP_ADAPTER=real`
2. ตั้ง `DATABASE_URL` หรือ `DIRECT_URL`
3. ตั้ง `BETTER_AUTH_SECRET` ที่แข็งแรง
4. seed real-mode users/data ถ้าฐานข้อมูลยังว่าง ด้วย `npm run db:seed:real-mode`
5. เปิดแอปและรัน smoke test sequence ตามหัวข้อ Phase G ด้านล่าง

---

## 1. Reality Check Before Starting

เอกสารนี้ยึดจาก 3 แหล่งเป็นหลัก:

1. `docs/Handoff_2026-03-12_Agent-B_Phase2-Ready.md`
2. `docs/API_Contract.md`
3. โค้ดจริงใน repository ณ วันที่ 2026-03-13

สถานะจริงตอนเริ่มแผนนี้:

- Backend พร้อมแล้วสำหรับ COA CRUD/Toggle, Product revenue mapping, และ GL CSV export
- `real-app-adapter.ts` ต่อ API จริงไว้แล้วสำหรับ COA และ Product create/update
- หน้า COA ใช้งาน real adapter แล้วในระดับหลัก
- หน้า General Ledger ยังเป็น placeholder
- หน้า product management ใน POS ยังไม่ได้ส่ง `revenue_account_id`
- Frontend tests สำหรับ GL download flow และ product revenue mapping UI ยังไม่ครบ

ข้อสรุปสำคัญ:

- งานรอบนี้ไม่ใช่งานออกแบบ API ใหม่
- งานรอบนี้คือ frontend wiring, UX state completion, และ regression safety
- ห้ามเปลี่ยน field contract เอง เช่น `revenue_account_id`, `account_code`, `account_name`, `start_date`, `end_date`

---

## 2. Final Deliverables Of This Plan

เมื่อจบแผนนี้ ต้องได้ผลลัพธ์ครบทั้งหมด:

1. Owner/Admin ใช้หน้า COA กับ backend จริงได้อย่างปลอดภัย
2. Product create/edit UI เลือกบัญชีรายได้ได้ และส่ง `revenue_account_id` ถูกต้อง
3. Owner ดาวน์โหลด General Ledger CSV จาก UI ได้จริง
4. มี loading, success, empty, error state ครบในจุดที่ยิง API ใหม่
5. Frontend tests ใหม่ผ่านครบสำหรับ GL และ product mapping flow
6. ไม่มี contract drift กับ `docs/API_Contract.md`

---

## 3. Execution Order

ให้ทำตามลำดับนี้เท่านั้น:

1. Ground contract and current UI gaps
2. Implement General Ledger page real flow
3. Implement product revenue mapping UI
4. Harden COA/Product/GL UX states
5. Add frontend tests
6. Run validation suite
7. Run manual smoke test in real mode
8. Update handoff or summary docs if behavior changed materially

เหตุผลของลำดับนี้:

- GL page แยกตัวจาก flow อื่น ทำก่อนแล้ว validate ได้ง่าย
- product revenue mapping กระทบ POS editor และ account loading จึงควรทำหลังจาก contract ถูกยืนยันแล้ว
- UX hardening และ tests ควรทำหลัง flow หลักทำงานจริงแล้ว

---

## 4. Phase A: Contract Grounding and Pre-Flight

### A.1 Files to re-check before editing

- `src/features/adapters/real-app-adapter.ts`
- `src/app/(app)/reports/general-ledger/page.tsx`
- `src/app/(app)/pos/page.tsx`
- `src/app/(app)/coa/page.tsx`
- `src/app/api/v1/reports/gl/route.ts`
- `src/app/api/v1/products/route.ts`
- `src/app/api/v1/products/[productId]/route.ts`
- `docs/API_Contract.md`

### A.2 Non-negotiable contract rules

- GL endpoint ใช้ `GET /api/v1/reports/gl`
- ต้องส่ง query `start_date` และ `end_date` เท่านั้น
- วันที่ต้อง format เป็น `YYYY-MM-DD`
- GL response เป็น `text/csv`, ไม่ใช่ JSON
- Product create/update ต้องส่ง `revenue_account_id` เมื่อมีการเลือกบัญชีรายได้
- COA dropdown ที่ใช้กับ product ต้องอิงข้อมูลจาก `GET /api/v1/coa`

### A.3 Definition of readiness before implementation

เริ่มแก้ไฟล์ได้เมื่อยืนยันครบว่า:

- `real-app-adapter.ts` ใช้ `credentials: "include"` แล้ว
- Product routes รองรับ `revenue_account_id` แล้ว
- GL route พร้อมตอบ CSV แล้ว
- Auth provider ใช้ real mode ได้เมื่อ `NEXT_PUBLIC_APP_ADAPTER=real`

---

## 5. Phase B: General Ledger Page Real Integration

### B.1 Objective

เปลี่ยนหน้า `src/app/(app)/reports/general-ledger/page.tsx` จาก placeholder เป็นหน้าใช้งานจริงสำหรับดาวน์โหลด CSV

### B.2 Required UI behavior

ต้องมีองค์ประกอบต่อไปนี้:

1. Date input สำหรับ `start_date`
2. Date input สำหรับ `end_date`
3. ปุ่ม `Download CSV`
4. Loading state ระหว่างยิง request
5. Error state เมื่อ request ล้มเหลว
6. Success feedback เมื่อเริ่มดาวน์โหลดสำเร็จ
7. Guard สำหรับ role ที่เข้าได้

### B.3 Required technical behavior

ต้องทำงานแบบนี้:

1. รับค่า `start_date` และ `end_date` จาก form state
2. Validate ฝั่ง client ว่ากรอกครบทั้งสองค่า
3. Validate ว่า `start_date <= end_date`
4. ยิง `fetch` ไป `/api/v1/reports/gl?start_date=...&end_date=...`
5. ส่ง `credentials: "include"`
6. อ่าน response เป็น `Blob`
7. สร้าง object URL และ trigger browser download
8. ตั้งชื่อไฟล์ตามช่วงวันที่ เช่น `general-ledger-2026-03-01-to-2026-03-31.csv`
9. cleanup object URL หลังดาวน์โหลด

### B.4 Error cases that must be handled

- ไม่มีการยืนยันตัวตน: 401
- ไม่มีสิทธิ์: 403
- วันที่ผิด format หรือ range ไม่ถูกต้อง: 400
- server error: 500
- network error

### B.5 UX states to implement

- Default state: อธิบายว่ารายงานนี้ใช้ส่งออก CSV ตามช่วงวันที่
- Loading state: ปุ่ม disabled และมีข้อความกำลังดาวน์โหลด
- Validation error: แสดงใต้ฟอร์มหรือใน alert block ให้ชัดเจน
- Success state: แจ้งว่าระบบเริ่มดาวน์โหลดไฟล์แล้ว

### B.6 Suggested implementation notes

- ถ้าใช้ helper fetch กลาง ต้องแน่ใจว่าไม่พยายาม parse JSON กับ response CSV
- ถ้าไม่ใช้ helper เดิม ให้เขียน fetch ตรงใน page นี้เพื่อหลีกเลี่ยง behavior ที่ไม่ตรงชนิด response
- รักษา visual language ของ report pages เดิม ไม่เปลี่ยนทิศทาง UI ทั้งหน้าโดยไม่จำเป็น

### B.7 Done criteria for Phase B

- หน้า GL ใช้งานได้จริงใน real mode
- query string ถูกต้องตาม contract
- ดาวน์โหลดไฟล์ CSV ได้จริงจาก browser
- loading/error/success state ครบ

---

## 6. Phase C: Product Revenue Mapping UI

### C.1 Objective

เพิ่มการเลือกบัญชีรายได้ใน flow สร้างและแก้ไขสินค้า เพื่อให้ backend ทำ dynamic revenue journaling ได้ตาม product mapping จริง

### C.2 Files likely to change

- `src/app/(app)/pos/page.tsx`
- อาจรวม helper หรือ local state ที่เกี่ยวกับ product editor ภายในไฟล์เดียวกัน

### C.3 Required behavior

1. โหลด COA list เมื่อเข้า product editor หรือเมื่อหน้า POS พร้อมใช้งาน
2. กรองหรือแสดงเฉพาะบัญชีประเภท `REVENUE` ที่ยัง active สำหรับ dropdown
3. แสดง dropdown ให้เลือกบัญชีรายได้ตอน create product
4. แสดง dropdown ให้เลือกบัญชีรายได้ตอน edit product
5. ถ้า product มี mapping เดิม ต้อง preload ค่าเดิม
6. ตอน submit ต้องส่ง `revenueAccountId` เข้า adapter
7. adapter ต้องแปลงต่อเป็น `revenue_account_id` ตามที่มีอยู่แล้ว

### C.4 Required validation and UX behavior

- ถ้าโหลด COA ไม่ได้ ต้องแสดง error แยกจาก error อื่น
- ถ้าไม่มี revenue accounts ที่เลือกได้ ต้องแสดง empty state ที่เข้าใจง่าย
- ถ้าบัญชีที่ผูกอยู่เดิม inactive หรือ locked ให้แสดงข้อมูลให้ผู้ใช้รู้ ไม่ใช่หายไปเงียบ ๆ
- ห้ามทำให้ flow เดิมของการสร้างสินค้าเสีย ถ้ายังไม่ได้เลือกบัญชีรายได้ควรยัง submit ได้ตาม contract ที่ field นี้ optional

### C.5 Important technical constraints

- ห้าม rename `revenueAccountId` ใน adapter input ถ้าไม่จำเป็น
- ห้ามเปลี่ยน request field ฝั่ง API จาก `revenue_account_id`
- ต้องรักษา behavior เดิมเรื่อง `product_type`, `track_stock`, และ stock validation

### C.6 Exact code-level goal

ปัจจุบันจุด submit สำคัญอยู่ใน `src/app/(app)/pos/page.tsx`:

- create flow เรียก `adapter.createProduct(...)`
- update flow เรียก `adapter.updateProduct(...)`

เมื่อจบ phase นี้ ทั้งสองจุดต้องส่ง `revenueAccountId` ได้ถ้ามี user selection

### C.7 Done criteria for Phase C

- สร้างสินค้าใหม่พร้อม revenue mapping ได้
- แก้ไขสินค้าเดิมและเปลี่ยน revenue mapping ได้
- ไม่กระทบ flow stock/product เดิม
- ถ้า backend ตอบ error เช่น `REVENUE_ACCOUNT_NOT_FOUND` หรือ `REVENUE_ACCOUNT_INACTIVE` UI ต้องสื่อสารข้อความได้ชัด

---

## 7. Phase D: COA, Product, and GL UX Hardening

### D.1 Objective

เก็บ state ที่ผู้ใช้เจอจริงใน production-like flow ให้ครบก่อนถือว่าปิดงาน integration รอบนี้

### D.2 COA page hardening checklist

- แสดง error ชัดเมื่อ toggle ไม่ผ่านเพราะ `ACCOUNT_LOCKED`
- แยก loading state ของ list กับ toggle action
- รักษา disabled state สำหรับบัญชีที่ locked
- Handle 401/403 แบบอ่านแล้วเข้าใจทันที

### D.3 Product editor hardening checklist

- แยก saving state กับ loading account options
- ถ้า COA โหลดไม่ขึ้น ต้องยังใช้งาน editor ส่วนอื่นได้ตามสมควร
- error ของการ save ต้องไม่หายทันทีโดยไม่มี feedback

### D.4 GL page hardening checklist

- ปุ่ม download disabled ระหว่างโหลด
- ไม่มี duplicate submit ระหว่าง request เดียวกัน
- success message ชัดว่าระบบเริ่มดาวน์โหลดแล้ว
- error จาก server แสดงข้อความ human-readable

### D.5 Done criteria for Phase D

- ไม่มี action สำคัญที่ยิง API แบบเงียบแล้ว fail โดยไม่มี feedback
- ไม่มี state สำคัญที่ทำให้ user งงว่าระบบกำลังทำอะไรอยู่

---

## 8. Phase E: Frontend Test Plan

### E.1 New tests required

ต้องเพิ่มอย่างน้อยชุดต่อไปนี้:

1. GL page triggers CSV download with correct query params
2. Product form sends `revenue_account_id` on create
3. Product form sends `revenue_account_id` on update
4. COA toggle shows locked error when backend returns `ACCOUNT_LOCKED`

### E.2 Suggested test files

- `tests/frontend/general-ledger-page.test.tsx`
- `tests/frontend/pos-product-revenue-mapping.test.tsx`
- อาจเพิ่มใน `tests/frontend/coa-page.test.tsx` ถ้าต้องการเก็บ test ใกล้จุดเดิม

### E.3 What each test must assert

#### GL page test

- render role-allowed page ได้
- กรอก start/end date ได้
- กด download แล้วเรียก URL ถูกต้อง
- ใช้ query params `start_date` และ `end_date`
- handle response เป็น blob/download flow ได้ในระดับ unit test

#### Product mapping tests

- เมื่อ create product แล้วมีการเลือกบัญชีรายได้ ต้องส่งค่าถึง adapter
- เมื่อ update product แล้วมีการเลือกบัญชีรายได้ ต้องส่งค่าถึง adapter
- ถ้าไม่เลือกบัญชีรายได้ ยัง submit ได้ถ้า contract ยัง optional

#### COA locked test

- เมื่อ backend ตอบ `ACCOUNT_LOCKED` ต้องแสดง error message ที่ผู้ใช้เข้าใจได้
- ปุ่ม toggle ต้องไม่ทำให้ state เพี้ยนหลัง fail

### E.4 Regression tests to re-run

- `tests/frontend/coa-page.test.tsx`
- `tests/frontend/report-placeholders.test.tsx` หรือ test ที่เกี่ยวข้องหลังเปลี่ยน GL page
- `tests/frontend/response-shape-alignment.test.ts`
- test ที่กระทบ POS page

---

## 9. Phase F: Validation Commands

หลังแก้ครบทุก phase ให้รันตามนี้:

1. `npm run lint`
2. `npx vitest run tests/frontend/general-ledger-page.test.tsx`
3. `npx vitest run tests/frontend/pos-product-revenue-mapping.test.tsx`
4. `npx vitest run tests/frontend/coa-page.test.tsx`
5. `npx vitest run`
6. `npm run build`

ถ้าเวลาจำกัด ใช้ลำดับนี้ก่อน:

1. tests ที่เพิ่มใหม่
2. tests ที่กระทบโดยตรง
3. full vitest
4. build

---

## 10. Phase G: Manual Smoke Test Script

ให้ทดสอบบน real mode เท่านั้น:

### G.1 Environment setup

- ตั้ง `NEXT_PUBLIC_APP_ADAPTER=real`
- ใช้ account ที่มี role เป็น `OWNER` หรือ `ADMIN`
- database ต้องมี COA data และมีสินค้าพร้อมทดสอบ

### G.2 Smoke test sequence

1. Login สำเร็จและ session คงอยู่
2. เปิดหน้า COA และโหลดรายการบัญชีได้
3. เข้า product editor
4. สร้างหรือแก้สินค้า 2 ชนิดให้ผูกคนละ revenue account
5. เปิดกะ
6. ขายสินค้าทั้ง 2 ชนิด
7. เปิดหน้า General Ledger
8. เลือกช่วงวันที่ที่ครอบคลุมรายการขาย
9. ดาวน์โหลด CSV
10. เปิดไฟล์และเช็กว่ามีหลายบรรทัดรายได้ตาม account mapping
11. ตรวจว่าฝั่ง debit/credit สมดุลตามที่ backend ส่งออก

### G.3 Smoke test failure checklist

ถ้าพบปัญหา ให้จดอย่างน้อย 4 อย่างนี้ทุกครั้ง:

- หน้าที่พัง
- request ที่ยิง
- response code และ error code
- ผลกระทบต่อ user flow

---

## 11. Out of Scope For This Round

ห้ามขยายงานออกนอกขอบเขตนี้ในรอบเดียวกัน:

- Shift summary API integration
- Profit/Loss API integration
- Advanced inventory adjustment UI
- การ redesign report system ใหม่ทั้งชุด
- การ refactor adapter ใหญ่โดยไม่จำเป็น

---

## 12. Recommended Commit Strategy

ให้แยกงานเป็น 3 ก้อนชัดเจน:

1. `feat(frontend): wire GL CSV export page`
2. `feat(frontend): add product revenue account mapping UI`
3. `test(frontend): cover GL and revenue mapping flows`

ถ้าต้องทำใน branch เดียวก็ยังควรจัด commit ตามก้อนนี้ เพื่อ review ง่ายและ rollback ง่าย

---

## 13. Definition of Done For Agent B Round

ถือว่าปิดรอบนี้ได้เมื่อครบทุกข้อ:

- หน้า GL ไม่เป็น placeholder แล้ว
- ดาวน์โหลด CSV ได้จริงจาก UI
- product create/edit ส่ง `revenue_account_id` ได้จริงผ่าน adapter
- COA/Product/GL มี loading/error/success state ครบตามจุดสำคัญ
- frontend tests ที่เพิ่มใหม่ผ่าน
- ไม่มี contract drift กับ `docs/API_Contract.md`
- manual smoke test real mode ผ่านอย่างน้อย 1 รอบ

---

## 14. Immediate Start Checklist

ใช้ checklist นี้ตอนเริ่มลงมือ:

- อ่าน `docs/Handoff_2026-03-12_Agent-B_Phase2-Ready.md` อีกรอบ
- เปิด `src/app/(app)/reports/general-ledger/page.tsx`
- แทน placeholder ด้วย real download flow
- เปิด `src/app/(app)/pos/page.tsx`
- เพิ่ม revenue account dropdown และ wiring
- เพิ่ม tests ใหม่
- รัน validation
- สรุปผล smoke test

---

## 15. Short Tactical Recommendation

ถ้าต้องเริ่มตอนนี้ทันทีโดยไม่คิดเพิ่ม ให้เริ่มแบบนี้:

1. ทำ GL page ให้เสร็จก่อน
2. ค่อยทำ product revenue mapping
3. ค่อยปิดท้ายด้วย tests และ smoke test

ลำดับนี้ให้ความคืบหน้าเห็นผลเร็วที่สุด และลดความเสี่ยงจากการแก้ POS page ก่อนโดยยังไม่มี regression coverage ของ GL flow

---

## 16. Remaining Work After 2026-03-13

งานที่ยังเหลือหลังจบวันนี้มีแค่ก้อนที่ต้องใช้ environment จริงและการ follow-up ข้ามทีม:

1. เปิด real mode ให้ครบด้วย `.env` จริงและฐานข้อมูลที่พร้อมใช้งาน
2. seed หรือเตรียมข้อมูลสินค้า/COA จริงสำหรับ smoke test ปลายทาง
3. รัน Phase G แบบ end-to-end ด้วย account `OWNER` หรือ `ADMIN`
4. ตรวจว่าชื่อสินค้า ราคา และ revenue mapping ในข้อมูลจริงตรงกับหน้าร้านหรือ seed ที่ทีมต้องการ
5. ถ้ามีความต่างของข้อมูลจริงกับ mock preview ให้ปรับ catalog/data setup ที่ backend แทนการฝัง assumption ใหม่ใน frontend

เอกสารที่ใช้ส่งต่องานหลังจบวันนี้:

- `docs/Status_2026-03-13_Agent-B_End_Of_Day.md`
- `docs/Handoff_2026-03-13_Frontend_to_Backend_Next.md`
- `docs/Plan_2026-03-13_Frontend_Next_Real_Mode.md`