# Frontend / Backend Integration Status Analysis

**Date:** 2026-03-10  
**Project:** fitnessLA Phase 1  
**Purpose:** สรุปสถานะจริงของฝั่ง Frontend และ Backend จากโค้ดและเอกสารปัจจุบัน, แยกสิ่งที่ต่อกันแล้วจริงออกจากสิ่งที่ยังเป็น mock หรือยังขาด contract, และจัดทำแผนงานละเอียดสำหรับงานที่เหลือทั้งหมด

---

## 1. Executive Summary

จากการอ่านทั้งเอกสารและโค้ดปัจจุบัน สถานะของระบบ ณ ตอนนี้สรุปได้ตรงที่สุดว่า:

1. Frontend ไปไกลกว่าระดับ scaffold มากแล้ว และอยู่ในสถานะ **mock-first application with strong UI structure and adapter-based integration design**
2. Backend ไปไกลกว่าที่ note handoff ของ Frontend วันที่ 2026-03-08 ระบุไว้ในบางส่วน โดยเฉพาะ `expenses`, `admin/users`, `shift close`, `daily summary`, และ route inventory หลัก
3. อย่างไรก็ตาม ระบบยัง **ไม่ใช่ end-to-end real integration เต็มระบบ** เพราะแกน auth/session ยังเป็น mock, `real-app-adapter.ts` ยัง implement ไม่ครบ, และมี contract mismatch หลายจุดระหว่าง docs, frontend types, และ backend implementation จริง

สรุปสั้นที่สุด:

- **Frontend พร้อมมากในเชิง UI/UX, guard, flow, state, และ test**
- **Backend พร้อมมากในเชิง operations core API**
- **จุดที่ยังขาดจริงไม่ใช่แค่ API เพิ่ม แต่เป็น integration glue ระหว่าง session, adapter, DTO shape, และ feature contract ที่ยังไม่ล็อกตรงกัน**

---

## 2. วิธีวิเคราะห์และแหล่งข้อมูลที่ใช้

การวิเคราะห์นี้อ้างอิงจาก 2 แหล่งพร้อมกัน:

### 2.1 เอกสาร

- `docs/Progress_2026-03-08_Frontend_Backend_Handoff.md`
- `docs/Plan_Person_A.md`
- `docs/API_Contract.md`
- `docs/WorkSplit_2People_Phase1.md`
- `docs/Requirement_Phase1.md`
- `docs/PRD_Phase1.md`
- `project_map.md`

### 2.2 โค้ดจริง

- Frontend adapter layer
- Frontend session/provider layer
- Frontend pages หลัก
- Backend API routes ทั้งหมดใน `src/app/api`
- Backend services ใน `src/features/operations/services.ts`
- Backend tests ใน `tests/backend`

หลักการของเอกสารนี้คือ:

- ให้ความสำคัญกับ **โค้ดจริง** มากกว่าเอกสารที่อาจล้าสมัย
- ใช้เอกสารเพื่ออธิบาย intent, roadmap, และ contract governance
- ชี้จุดที่ docs กับ code ไม่ตรงกันอย่างตรงไปตรงมา

---

## 3. สถานะ Frontend ปัจจุบัน

## 3.1 สิ่งที่ Frontend ทำเสร็จแล้วในระดับใช้งานจริง

ฝั่ง Frontend อยู่ในสภาพที่แข็งแรงพอสมควรแล้วในมิติหลักดังนี้:

### A. โครงสร้างแอปและ UX หลัก

- มี app shell สำหรับ authenticated area แล้ว
- มี guard แยก auth, role, shift แล้ว
- มี navigation ตาม role แล้ว
- มีธีม, branding slot, ภาษาไทย, และ structure สำหรับ demo/operation แล้ว

### B. Operational pages หลักพร้อมใช้งานแบบ mock-first

- Login
- Dashboard
- Open Shift
- Close Shift
- POS
- Expenses / Petty Cash
- Daily Summary
- COA page
- Admin Users page
- Report placeholder pages สำหรับ Shift Summary, P&L, General Ledger

### C. Adapter architecture พร้อมสำหรับการสลับ data source

มี `AppAdapter` กลางและมี 2 implementation:

- `mockAppAdapter`
- `realAppAdapter`

ผลคือ UI หลายหน้าไม่ได้ผูกกับ mock data ตรง ๆ แล้ว แต่เรียกผ่าน adapter layer ก่อน

### D. Frontend tests มีอยู่จริงและครอบหลาย flow สำคัญ

จากเอกสาร handoff และโครงสร้าง test ที่มีอยู่ Frontend มี regression coverage สำหรับ:

- cart store
- receipt validation
- shift guard
- blind drop close shift
- POS keyboard shortcuts
- report placeholders
- COA page
- admin users page

## 3.2 จุดแข็งของ Frontend ตอนนี้

### A. แยก concern ได้ดี

UI, state, adapter, guard, และ utility ถูกแยกค่อนข้างชัด ทำให้ตอนเสียบ backend จริงไม่จำเป็นต้องรื้อ page ทั้งก้อน

### B. UX หลักของธุรกิจถูก encode แล้ว

- Blind drop ไม่แสดง expected cash ก่อน submit
- POS บังคับ active shift ทาง UI
- Expenses บังคับแนบ receipt ทาง UI
- COA/Admin จำกัดสิทธิ์ทาง UI

### C. หน้าหลักพร้อมสำหรับ integration มากกว่าการเริ่มใหม่

สำหรับ POS, shift, daily summary, และส่วน report shell โครง presentation พร้อมแล้ว

## 3.3 จุดที่ Frontend ยังไม่เสร็จจริง

แม้ UI จะพร้อมมาก แต่ยังมีจุดค้างระดับ integration ที่สำคัญ:

### A. Session ของทั้งแอปยังเป็น mock

Root layout ปัจจุบันยังห่อด้วย `MockSessionProvider` ทั้งระบบ ไม่ได้ใช้ real auth/session provider จริง

### B. Frontend ยังไม่มี real session bootstrap

ไม่มี flow ที่:

- เรียก session จริงตอน app start
- refresh session จริง
- logout จริง
- sync active shift จาก backend ตอน reload หน้า

### C. หลายหน้าพึ่ง mock-only data model อยู่

โดยเฉพาะ:

- COA page
- Admin Users page
- Expenses page ส่วน account dropdown
- Login page

### D. `real-app-adapter.ts` ยัง implement ไม่ครบ

ตอนนี้ implement แล้วเพียงบาง method และมีหลาย method ที่ยังโยน `NOT_IMPLEMENTED`

---

## 4. สถานะ Backend ปัจจุบัน

## 4.1 Route inventory ที่มีอยู่จริงในโค้ด

จาก `src/app/api` ปัจจุบันมี route จริงดังนี้:

### Auth / Session

- `GET /api/auth/session`

### Operations API

- `GET /api/v1/products`
- `GET /api/v1/shifts/active`
- `POST /api/v1/shifts/open`
- `POST /api/v1/shifts/close`
- `POST /api/v1/orders`
- `POST /api/v1/expenses`
- `GET /api/v1/reports/daily-summary`

### Admin

- `POST /api/v1/admin/users`

## 4.2 สิ่งที่ Backend ทำได้จริงแล้ว

จาก `src/features/operations/services.ts` และ tests ฝั่ง backend สถานะล่าสุดของ backend core คือ:

### A. Products

- list products จาก database ได้
- route มี auth check แล้ว

### B. Active Shift

- ตรวจว่าพนักงานมีกะเปิดอยู่หรือไม่
- ถ้าไม่มีคืน 404 ได้ตาม flow ที่ออกแบบไว้

### C. Open Shift

- เปิดกะได้
- ป้องกันการเปิดกะซ้ำ
- ลง journal entry เริ่มต้นได้

### D. Orders / Sell Flow

- สร้าง order แบบ transactional
- สร้าง order items
- reserve document number
- สร้าง tax document
- post journal
- rollback เมื่อ journal failure
- มี concurrency protection สำหรับ sequence

### E. Expenses / Petty Cash

- บันทึกรายจ่ายได้
- post journal ได้
- หัก expected cash ในกะได้
- route parse ได้ทั้ง JSON และ `multipart/form-data`

### F. Close Shift

- ปิดกะด้วย actual cash ได้
- คำนวณ expected cash และ difference ได้
- ลงบัญชี shortage/overage ได้

### G. Daily Summary

- ดึงยอดขายรวม แยกตาม payment method ได้
- ดึง total expenses ได้
- รวม shift discrepancies ได้
- จำกัดสิทธิ์เฉพาะ OWNER/ADMIN ได้

### H. Admin User Creation

- มี route สร้าง user จริงแล้ว
- มี validation
- มี role guard
- handle duplicate user ได้

## 4.3 สิ่งที่ Backend ยังไม่ครบหรือยังไม่ใช่ production auth จริง

### A. Better Auth จริงยังไม่เห็นใน flow ที่ Frontend ใช้ได้ทันที

แม้เอกสารบางฉบับจะระบุว่า auth setup เสร็จแล้ว แต่ในโค้ดที่ Frontend ใช้จริงตอนนี้ session resolution ยังอิง `x-user-id` หรือ `x-username` จาก request headers ผ่าน `resolveSessionFromRequest()`

นั่นหมายความว่า:

- ยังไม่มี login API จริงที่ Frontend เรียกแล้วได้ session/cookie พร้อมใช้
- ยังไม่ใช่ browser auth flow ที่ complete
- `/api/auth/session` ตอนนี้เป็นเพียง endpoint สำหรับคืน session ที่ resolve จาก header ไม่ใช่ proof ว่า Better Auth end-to-end ใช้งานได้แล้วในหน้าเว็บ

### B. COA backend APIs ยังไม่มี route จริง

ยังไม่พบ route สำหรับ:

- list COA
- create COA
- toggle COA
- edit COA

### C. Reports beyond daily summary ยังไม่มี route จริง

ยังไม่พบ route สำหรับ:

- shift summary
- P&L
- general ledger
- export CSV/XLSX

### D. Admin workflow ยังไม่ครบตาม UI ของ Frontend

Backend มีแค่ `POST /api/v1/admin/users` แบบสร้าง user ตรง ขณะที่ Frontend page ตอนนี้ออกแบบเป็น flow แบบ:

- สร้างคำขอผู้ใช้
- list คำขอ
- approve คำขอ

ซึ่งเป็นคนละ model กัน

---

## 5. สิ่งที่ Frontend ต่อกับ Backend แล้วจริง ๆ

หัวข้อนี้แยกเป็น 3 ระดับเพื่อไม่ให้สับสน:

1. **UI พร้อมเรียกผ่าน adapter**
2. **real adapter มี implementation จริง**
3. **ระบบใช้งานจริง end-to-end ได้หรือยัง**

## 5.1 ต่อแล้วในระดับ `real-app-adapter.ts`

ปัจจุบัน `real-app-adapter.ts` implement จริงสำหรับ:

- `listProducts()` -> `GET /api/v1/products`
- `openShift()` -> `POST /api/v1/shifts/open`
- `closeShift()` -> `POST /api/v1/shifts/close`
- `createOrder()` -> `POST /api/v1/orders`
- `getDailySummary()` -> `GET /api/v1/reports/daily-summary`

ดังนั้นในเชิง code path ฝั่ง Frontend ถือว่า 5 จุดนี้ถูกเสียบ endpoint แล้ว

## 5.2 แต่ยังไม่ถือว่า end-to-end real integration สมบูรณ์

เหตุผลสำคัญมี 4 ข้อ:

### A. ไม่มี real authentication/session bridge ที่ใช้ได้จริงใน browser

route ฝั่ง backend ต้องการ session ที่ resolve จาก request headers แต่ `real-app-adapter.ts` ปัจจุบันเรียก `fetch()` แบบไม่มี header bridge ใด ๆ

ผลคือถ้าเปิด `NEXT_PUBLIC_APP_ADAPTER=real` ตรง ๆ request หลักมีแนวโน้มโดน `401 UNAUTHENTICATED`

### B. ทั้งระบบยังใช้ `MockSessionProvider`

แม้จะเรียก adapter จริง แต่ state หลักของ login/session/active shift ยังผูกกับ local mock session store

### C. ไม่มี boot sync active shift จาก backend

backend มี `GET /api/v1/shifts/active` จริง แต่ Frontend ยังไม่ใช้ route นี้เพื่อ hydrate state ตอน refresh หน้า

### D. type contract ยังไม่ตรงทั้งหมด

Frontend contracts หลายตัวใช้ `number` แต่ backend implementation จริงใช้ `string` สำหรับ ids หลายจุด เช่น shift, user, order, journal

## 5.3 สรุปแบบไม่สับสน

สิ่งที่พูดได้อย่างแม่นคือ:

- **Frontend มี code path พร้อมยิง backend จริงแล้วบางจุด**
- **แต่ระบบยังไม่พร้อมใช้งาน real mode แบบครบ flow**
- **สาเหตุหลักคือ session/auth bridge และ type/contract mismatch ไม่ใช่แค่ขาด endpoint อย่างเดียว**

---

## 6. สิ่งที่ Backend ทำแล้ว แต่ Frontend ยังไม่ได้ต่อ

## 6.1 `GET /api/auth/session`

Backend มีแล้ว แต่ Frontend ยังไม่มี provider จริงที่ใช้ endpoint นี้เป็น source of truth

### ผลกระทบ

- login page ยังเป็น mock
- route guard ฝั่ง client ยังอิง local state
- reload หน้าแล้ว state จริงจาก backend ไม่ถูก hydrate

## 6.2 `GET /api/v1/shifts/active`

Backend มีแล้ว แต่ Frontend ยังไม่ใช้

### ผลกระทบ

- active shift state หลัง reload ไม่ได้มาจาก backend
- flow real session + real shift state ยังไม่ complete

## 6.3 `POST /api/v1/expenses`

Backend มี route จริงแล้ว และ parse multipart ได้แล้ว แต่ Frontend real adapter ยัง `NOT_IMPLEMENTED`

### ผลกระทบ

- หน้า petty cash ยังไม่สามารถทำงานแบบ real mode ได้
- note handoff วันที่ 2026-03-08 ส่วนนี้ล้าสมัยบางส่วน เพราะ backend เดินมาถึง route แล้ว

## 6.4 `POST /api/v1/admin/users`

Backend มี route จริงแล้ว แต่ Frontend admin page ยังใช้ model แบบ request/approval queue ซึ่งไม่ตรงกับ backend route ปัจจุบัน

### ผลกระทบ

- ต่อกันตรง ๆ ไม่ได้
- ต้องเลือกว่าจะปรับ frontend ให้ตรง backend หรือขยาย backend ให้ตรง UI intent เดิม

---

## 7. สิ่งที่ Frontend ยังไม่ได้ต่อ เพราะ Backend ยังไม่มีหรือ contract ยังไม่ชัด

## 7.1 COA APIs

ยังไม่พบ backend route จริงสำหรับ:

- list accounts
- create account
- toggle account
- edit account

### ผลกระทบ

- หน้า COA ยังเป็น mock-backed ทั้งหน้า
- หน้า expenses ยังโหลด account dropdown จาก mock COA data

## 7.2 Reports อื่นนอกจาก Daily Summary

ยังไม่พบ backend route จริงสำหรับ:

- shift summary
- profit and loss
- general ledger
- export reports

### ผลกระทบ

- หน้า report ที่เหลือยังเป็น placeholder shell

## 7.3 Better Auth end-to-end login/logout/session persistence

ยังไม่เห็น browser-ready flow ที่ Frontend ใช้ได้จริง เช่น:

- login endpoint สำหรับ credential submit
- logout endpoint
- cookie/session persistence จริง
- middleware หรือ server-side enforcement ที่ใช้กับหน้า app จริง

## 7.4 Expense file storage semantics

แม้ route จะ parse multipart ได้แล้ว แต่ยังไม่เห็นรายละเอียดที่ล็อกครบสำหรับ:

- field ที่ใช้รับไฟล์จริง
- upload storage path
- public/private access policy
- receipt URL generation strategy

## 7.5 Admin workflow แบบ approval queue

หากธุรกิจต้องการ flow:

- submit request
- review queue
- approve/reject

backend ปัจจุบันยังไม่รองรับ model นี้

---

## 8. Contract Mismatches และจุดที่ docs กับ code ไม่ตรงกัน

หัวข้อนี้สำคัญมาก เพราะถ้าไม่แก้ จะทำให้ integration รอบต่อไปติดแบบเงียบ ๆ

## 8.1 Session endpoint path ไม่ตรงกัน

`docs/API_Contract.md` ระบุ `GET /api/session` แต่โค้ดจริงมี `GET /api/auth/session`

### ผลกระทบ

- Contract docs ไม่ตรงกับ implementation
- คนต่อ Frontend ตามเอกสารอย่างเดียวจะยิงผิด path

## 8.2 ID types ไม่ตรงกัน

ใน `src/lib/contracts.ts` ฝั่ง Frontend ids หลักหลายตัวเป็น `number` แต่ backend routes/services ใช้ `string` ids ตาม Prisma entities จริง

ตัวอย่างผลกระทบ:

- `UserSession.user_id`
- `active_shift_id`
- `shift_id`
- `order_id`
- `journal_entry_id`

### ความเสี่ยง

- compile-time contract เพี้ยน
- mapping แอบผิดเมื่อเปลี่ยนไป real mode
- UI บางจุดอาจทำงานได้โดยบังเอิญ แต่ type safety จะหลอกทีม

## 8.3 Better Auth status ถูกพูดเกินจริงในบางเอกสาร

`project_map.md` และบางส่วนของ `Plan_Person_A.md` ให้ภาพว่า auth ค่อนข้างพร้อม แต่จาก code path ที่ Frontend ใช้จริง ยังไม่ใช่ Better Auth end-to-end ที่พร้อมสลับจาก mock ได้ทันที

### ข้อสรุปที่ปลอดภัยกว่า

ควรถือว่า **backend มี temporary session resolution bridge แล้ว แต่ real browser auth integration ยังไม่ complete**

## 8.4 Admin model mismatch

Frontend ออกแบบ `pending request` + `approve request`  
Backend ออกแบบ `create user directly`

### นี่ไม่ใช่ bug เล็ก

นี่คือ business workflow mismatch ระดับ feature model ต้องตัดสินใจร่วมกันก่อน implement ต่อ

## 8.5 Expense contract drift

เอกสารเก่าระบุว่า expense real adapter ยังรอ multipart contract แต่ backend route จริงตอนนี้ parse multipart ได้แล้ว

### อย่างไรก็ตาม

ยังไม่ควรสรุปว่า feature นี้จบ เพราะยังไม่เห็น file storage flow ครบถ้วน

---

## 9. Feature-by-Feature Matrix

| Feature | Frontend UI | Frontend Real Adapter | Backend API | End-to-End Ready | หมายเหตุ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Login / Session | พร้อมแบบ mock | ยังไม่จริง | มี session route แบบ header-based | ไม่พร้อม | ขาด real login/logout/persistence |
| Products | พร้อม | ต่อแล้ว | มีแล้ว | ยังไม่พร้อมเต็ม | ติด session bridge |
| Active Shift check | UI พึ่ง local session | ยังไม่ต่อ | มีแล้ว | ไม่พร้อม | ควรใช้ hydrate หลัง reload |
| Open Shift | พร้อม | ต่อแล้ว | มีแล้ว | ยังไม่พร้อมเต็ม | ติด session bridge |
| Close Shift | พร้อม | ต่อแล้ว | มีแล้ว | ยังไม่พร้อมเต็ม | ติด session bridge |
| POS / Orders | พร้อม | ต่อแล้ว | มีแล้ว | ยังไม่พร้อมเต็ม | ติด session bridge |
| Expenses | พร้อม | ยังไม่ต่อจริง | มีแล้ว | ไม่พร้อม | route มี แต่ FE ยังไม่ implement และยังพึ่ง COA |
| Daily Summary | พร้อม | ต่อแล้ว | มีแล้ว | ยังไม่พร้อมเต็ม | ติด session bridge |
| COA | พร้อม | ไม่ต่อ | ยังไม่มี | ไม่พร้อม | ต้องรอ backend contract/API |
| Admin Users | พร้อมแบบ request queue | ไม่ต่อ | มี create user route บางส่วน | ไม่พร้อม | workflow mismatch |
| Shift Summary | Placeholder | ไม่ต่อ | ยังไม่มี | ไม่พร้อม | รอ backend |
| P&L | Placeholder | ไม่ต่อ | ยังไม่มี | ไม่พร้อม | รอ backend |
| General Ledger | Placeholder | ไม่ต่อ | ยังไม่มี | ไม่พร้อม | รอ backend |
| Export CSV/XLSX | Placeholder | ไม่ต่อ | ยังไม่มี | ไม่พร้อม | รอ backend |

---

## 10. งานที่เหลือทั้งหมด แยกตามความจริงของ dependency

หัวข้อนี้แยกเป็น 3 กลุ่มเพื่อให้ทำงานต่อได้แบบไม่สับสน

## 10.1 กลุ่มที่ Frontend ทำต่อได้ทันทีโดยไม่ต้องรอ backend เพิ่ม

### F-1. แก้ integration foundation ให้พร้อมสลับ mock -> real

- ออกแบบ `RealSessionProvider` หรือ refactor provider ปัจจุบันให้รองรับ real session source
- แยก mock session logic ออกจาก app-wide auth source
- เพิ่ม bootstrap ตอน app load เพื่อ fetch session/active shift จริง
- เพิ่ม logout flow ที่ไม่พึ่ง local-only reset

### F-2. ใช้ `GET /api/v1/shifts/active` ให้จริง

- hydrate active shift ตอนเปิดแอป
- sync active shift หลัง refresh
- ลดการพึ่ง local state อย่างเดียว

### F-3. ทำ real adapter ของ expenses

- เปลี่ยน `createExpense()` จาก `NOT_IMPLEMENTED`
- สร้าง multipart request ให้ตรง backend route ปัจจุบัน
- map error response ให้เข้ากับ UI message

### F-4. ปรับ docs และ types กลางให้ตรงโค้ดจริง

- แก้ endpoint session ใน docs
- ตัดสินใจเรื่อง id type ให้ชัดเจน
- อัปเดต contract ที่ drift จาก code แล้ว

### F-5. เตรียมแยก adapter tests สำหรับ real mode

- เพิ่ม tests ฝั่ง Frontend สำหรับ real adapter behavior
- ทดสอบ error mapping และ loading states เมื่อ backend คืน 401/403/404/409/500

## 10.2 กลุ่มที่ต้อง “ตกลง contract/feature direction” ก่อน

### C-1. Admin user management

ต้องตัดสินใจก่อนว่า business ต้องการแบบไหน:

#### Option A: Direct create user

Frontend ปรับหน้า admin ให้กลายเป็น create user form ตรงกับ backend route ปัจจุบัน

#### Option B: Request + approval queue

Backend ต้องเพิ่ม routes เช่น:

- list pending requests
- create request
- approve request
- reject request

### C-2. Auth strategy

ต้องตกลงว่าช่วง integration ระยะสั้นจะใช้แบบไหน:

- temporary dev session bridge
- Better Auth จริงเต็ม flow
- mock login + server header injection สำหรับ dev only

ถ้าไม่ตัดสินใจตรงนี้ Frontend จะต่อ real mode ได้แค่บางส่วนและเปราะมาก

### C-3. Expense file semantics

ต้องล็อก field name และ storage behavior ให้ชัด เช่น:

- ใช้ `receipt_file` หรือ `receipt_url` หรือทั้งคู่
- backend เป็นคน upload file หรือรับ URL หลัง upload เสร็จแล้ว
- ชื่อ field ไหนเป็น single source of truth

## 10.3 กลุ่มที่ต้องรอ backend เพิ่มจริง

### B-1. COA CRUD APIs

- list COA
- create COA
- toggle active/inactive
- validation สำหรับ locked accounts

### B-2. Reports เพิ่มเติม

- shift summary
- P&L
- general ledger

### B-3. Export APIs

- CSV export
- XLSX export
- filename convention
- auth policy ของ export endpoints

### B-4. Better Auth complete browser flow

- login
- logout
- persistent session
- secure server enforcement

---

## 11. แผนงานละเอียดที่แนะนำ

หัวข้อนี้เป็นแผนที่ปฏิบัติได้จริง โดยเรียงตาม dependency และผลกระทบสูงสุดก่อน

## Phase 0: Reality Alignment

**เป้าหมาย:** ทำให้ docs, contract, และทีมเข้าใจสภาพจริงตรงกันก่อนลงมือ integration ต่อ

### งาน

1. อัปเดตเอกสารกลางให้ตรง code จริง
2. สรุป endpoint inventory ปัจจุบันอย่างเป็นทางการ
3. ตัดสินใจเรื่อง id types ว่าจะย้าย Frontend ไปใช้ string หรือปรับ backend DTO mapping กลับเป็น number
4. ตัดสินใจ strategy ของ auth/session ระยะสั้นและระยะจริง
5. ตัดสินใจ admin workflow ว่าจะ direct create หรือ approval queue

### Output ที่ต้องได้

- contract revision 1 รอบ
- feature decision เรื่อง admin/auth/expense upload
- รายการ backlog ที่ไม่กำกวม

## Phase 1: Integration Foundation

**เป้าหมาย:** ทำให้ Frontend สามารถเปิด real mode ได้จริงอย่างน้อยสำหรับ flow หลัก

### งาน Frontend

1. แยก mock provider ออกจาก real provider
2. เพิ่ม session bootstrap จาก backend
3. เพิ่ม active shift bootstrap จาก backend
4. ทำ error mapping มาตรฐานสำหรับ adapter
5. ทดสอบ real mode สำหรับ authenticated routes

### งาน Backend

1. ยืนยัน path และ shape ของ session route
2. ยืนยัน auth mechanism ที่ Frontend เรียกได้จริง
3. หากยังไม่ใช้ Better Auth เต็ม ต้องมี dev-safe bridge ที่เป็นทางการ ไม่ใช่ implicit header assumption อย่างเดียว

### Definition of Done

- เปิดแอปแล้ว session จริงโหลดได้
- refresh หน้าแล้ว active shift ยัง sync ถูก
- `products`, `open shift`, `close shift`, `orders`, `daily summary` ใช้งานได้ใน real mode

## Phase 2: Operations Real Integration

**เป้าหมาย:** ทำให้ flow ที่ backend พร้อมแล้ว ใช้งานจริงครบเส้นทาง

### ลำดับแนะนำ

1. Products
2. Open Shift
3. Active Shift sync
4. Orders / POS
5. Close Shift
6. Daily Summary
7. Expenses

### หมายเหตุ

ควรทำ `Expenses` หลังจากมีความชัดเจนเรื่อง COA data source และ receipt semantics เพราะต่อแค่ route create ไม่พอถ้ายังไม่มี source สำหรับ account list

## Phase 3: Feature Contract Closure

**เป้าหมาย:** ปิดช่องว่างระหว่าง UI ที่มีอยู่กับ backend features ที่ยังไม่ครบ

### งานหลัก

1. ล็อก COA API contract
2. ล็อก admin management model
3. ล็อก expense upload contract แบบสุดท้าย
4. ล็อก report contracts สำหรับ shift summary / P&L / GL
5. ล็อก export behavior

## Phase 4: COA และ Admin Realization

**เป้าหมาย:** เปลี่ยน COA และ admin pages จาก mock-backed ไปเป็น backend-backed

### COA

- ต่อ list/create/toggle
- map validation message
- รองรับ locked account rules

### Admin

- ถ้าใช้ direct create: simplify page และเพิ่ม list users ภายหลัง
- ถ้าใช้ approval queue: backend ต้องเพิ่ม request entities และ approval routes ก่อน

## Phase 5: Reporting Expansion

**เป้าหมาย:** เปลี่ยน report placeholders เป็นหน้าใช้งานจริง

### งาน

1. Shift Summary data + filters
2. P&L data + presentation
3. General Ledger data + filters
4. Export CSV/XLSX

---

## 12. รายการงานคงค้างแบบละเอียด 100%

หัวข้อนี้คือ backlog รายการย่อยแบบตรวจเช็กได้

## 12.1 Frontend

### Auth / Session

- เปลี่ยน login page จาก mock wording/behavior ไปเป็น real auth flow
- แยก demo login ออกจาก production-like login path
- เพิ่ม session fetch ตอน app init
- เพิ่ม logout จริง
- เพิ่ม unauthorized handling จาก backend
- เพิ่ม forbidden handling จาก backend
- เพิ่ม loading state ระหว่าง bootstrap session

### Shift

- ใช้ active shift API ตอน hydrate
- sync active shift หลัง open/close
- รองรับ reload แล้ว state ไม่หาย
- ทดสอบกรณี backend คืน 404 active shift

### POS

- ตรวจ real mode error states ให้ครบ
- ทดสอบกรณี session หมดอายุระหว่าง checkout
- ยืนยัน DTO ของ order result กับ backend จริง

### Expenses

- ต่อ createExpense real adapter
- สรุป multipart payload ให้ตรง backend
- ตัดสินใจ field ของ file upload
- หยุดพึ่ง mock COA สำหรับ dropdown เมื่อ COA API พร้อม

### COA

- map UI กับ backend DTO จริง
- รองรับ locked account error
- รองรับ empty/loading/error จาก API จริง

### Admin Users

- ปรับหน้าให้ตรงกับ workflow ที่ตกลงใหม่
- เพิ่ม adapter methods ตาม workflow ที่เลือก
- เพิ่ม tests สำหรับ real API success/error states

### Reports

- เติม shift summary page
- เติม P&L page
- เติม GL page
- เติม export interactions จริง

### Types / Contracts

- แก้ id types ให้ตรงกับ backend
- แก้ endpoint path ที่ drift
- แก้ข้อความ validation ที่ยังเป็นอังกฤษบางจุด

### Tests

- เพิ่ม test สำหรับ real adapter mode
- เพิ่ม test สำหรับ auth bootstrap
- เพิ่ม test สำหรับ session expiry/401 handling
- เพิ่ม test สำหรับ integration states ของ expenses/admin/COA เมื่อเริ่มต่อจริง

## 12.2 Backend

### Auth

- ทำ login route ที่ Frontend เรียกได้จริง หรือเปิดใช้ Better Auth flow ให้ครบ
- ทำ logout/session persistence ให้ครบ
- ยืนยัน browser-compatible auth strategy

### COA

- สร้าง list/create/toggle/update routes
- เพิ่ม validation สำหรับ account in use / locked rules
- เพิ่ม tests ระดับ route/service

### Expenses

- ตัดสินใจ final receipt upload flow
- เชื่อม storage จริง
- คืน receipt reference ที่ Frontend และ audit ใช้ได้

### Admin

- ถ้าจะคง direct create user: เพิ่ม list users / status management ตามจำเป็น
- ถ้าจะใช้ approval queue: เพิ่ม request entity + routes + approval rules

### Reports

- shift summary
- P&L
- general ledger
- export csv/xlsx

### Contracts / Docs

- อัปเดต API contract ให้ตรง route จริง
- อัปเดต DTO examples ให้ตรง string/number decision

## 12.3 Shared / Cross-Team

- ตกลง auth strategy
- ตกลง admin workflow
- ตกลง id type policy
- ตกลง expense upload semantics
- ตกลง report response contracts
- ตกลง export naming / file behavior

---

## 13. ความเสี่ยงหลักรอบถัดไป

## 13.1 เปิด real adapter แล้วเจอ 401 ทั้งระบบ

นี่คือความเสี่ยงสูงสุดระยะสั้น เพราะดูเหมือน endpoint พร้อม แต่จริง ๆ session bridge ยังไม่ครบ

## 13.2 Type mismatch ทำให้ integration พังแบบเงียบ

ถ้าไม่แก้ `number` vs `string` ให้ชัด อาจเกิด bug ที่ไม่โผล่ใน mock mode แต่โผล่ใน real mode

## 13.3 Admin feature ทำผิด direction

ถ้าไม่ตัดสินใจก่อนว่าต้องการ direct create หรือ approval queue จะเสียเวลาทำซ้ำทั้งสองฝั่ง

## 13.4 Expenses ต่อได้ไม่สุดเพราะติด COA และ storage

ต่อ create endpoint อย่างเดียวไม่พอ ถ้า account source และ receipt flow ยังไม่ชัด

## 13.5 Docs ทำให้ทีมเข้าใจสถานะเกินจริง

ตอนนี้มีบางไฟล์ที่ให้ภาพว่า auth พร้อมกว่า reality และบางไฟล์ยังบอกว่า backend ยังไม่มาทั้งที่ code มี route แล้ว

---

## 14. ข้อสรุปสุดท้าย

หากตอบแบบตรงที่สุด:

### Frontend ถึงไหนแล้ว

Frontend อยู่ในสถานะที่แข็งแรงมากในเชิงหน้าจอ, UX, guard, test, และ adapter architecture โดยเฉพาะ POS, shift, petty cash, daily summary, COA, admin UI และ report shells

### Frontend ต่อ backend อะไรแล้ว

ต่อในระดับ `real-app-adapter.ts` แล้วสำหรับ:

- products
- open shift
- close shift
- orders
- daily summary

แต่ยัง **ไม่ใช่ real integration สมบูรณ์** เพราะ session/auth bridge ยังไม่ complete และ app-wide session ยังเป็น mock

### Backend ล่าสุดถึงไหน

backend มี route จริงแล้วสำหรับ:

- auth session bridge
- products
- shifts active/open/close
- orders
- expenses
- daily summary
- admin user creation

พร้อม logic หลักเรื่อง transaction, journal, sequence, discrepancy และ backend tests หลายส่วน

### อะไรที่ Frontend ยังไม่ได้ต่อ

มี 2 แบบ:

#### แบบที่ backend มีแล้วแต่ Frontend ยังไม่ใช้จริง

- session route
- active shift route
- expense route
- admin create user route

#### แบบที่ backend ยังไม่มีหรือ contract ยังไม่พอ

- COA APIs
- shift summary API
- P&L API
- general ledger API
- export APIs
- Better Auth complete browser flow
- admin approval queue model หากจะใช้ flow นั้น

### งานถัดไปที่สำคัญที่สุด

ไม่ใช่เริ่มจากทำหน้าใหม่ แต่คือ:

1. ปิด gap ของ auth/session integration
2. ปรับ contract ให้ตรง code จริง
3. ดึง flow ที่ backend พร้อมแล้วให้ทำงาน real mode ได้จริง
4. ตัดสินใจ feature model ที่ยังไม่ตรงกัน เช่น admin และ expense upload

---

## 15. Recommended Immediate Action List

ถ้าต้องเริ่มทำงานต่อจากพรุ่งนี้ ให้เรียงแบบนี้:

1. แก้เอกสาร contract ให้ตรง route/path/id types จริง
2. ตัดสินใจ auth strategy ระยะสั้นและระยะจริง
3. ทำ real session provider + active shift bootstrap
4. เปิด real integration สำหรับ products/open shift/orders/close shift/daily summary
5. ทำ expense real adapter หลังล็อก payload และ account source
6. ตัดสินใจ admin workflow แล้วค่อยต่อหน้า admin
7. รอหรือออก contract สำหรับ COA/reports/export แล้วค่อยเปลี่ยน placeholder/mock ส่วนที่เหลือ
