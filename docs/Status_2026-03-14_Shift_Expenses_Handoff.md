# Status 2026-03-14 Shift / Expenses Handoff

## Summary

สถานะล่าสุดของงานฝั่ง frontend และ integration หลังรอบแก้ POS, shift, members, expenses, และ reports:

- หน้า POS แยกกรอบสินค้าและกรอบตะกร้า/คิดเงินให้เลื่อนอิสระจากกันแล้ว
- ค้นหาสินค้าบน POS ใช้งานได้กับชื่อไทยที่ผู้ใช้เห็นจริงบนจอ ไม่ได้จำกัดแค่ชื่อดิบในข้อมูล
- layout หลักของแอปขยายเต็มพื้นที่มากขึ้น ลดปัญหาการ์ดตรงกลางอัดกัน
- inventory summary ใน POS อ่านง่ายขึ้นและเลื่อนแนวนอนได้เมื่อพื้นที่ไม่พอ
- เอา placeholder/mock blocks ที่ไม่ต้องใช้แล้วออกจาก dashboard และ open-shift
- หน้า close-shift เปลี่ยนส่วนล่างจาก stock summary เป็นตารางรายการขายจริงของกะนั้น
- เพิ่ม `responsible_name` ใน flow เปิดกะ, ปิดกะ, รายงานสรุปรายวัน, และหน้าสรุปกะ
- หน้า members ไม่ seed mock member list อีกต่อไป และเริ่มต้นจากข้อมูลว่างจริง
- เอา mock data ที่ไม่ใช้แล้วบางส่วนออก และปรับ copy หน้า expense ให้ชัดกับงานบัญชีมากขึ้น
- หน้า `expenses` เปลี่ยนชื่อเรียกใน UI เป็น `รายจ่าย`
- หน้าสรุปกะเชื่อมกับข้อมูลรายวันจริงของวันนั้นแล้ว, กรองตามผู้รับผิดชอบได้, แยกเงินสด/พร้อมเพย์/บัตรออกจากกัน
- หน้าสรุปกะเพิ่มช่อง `เงินสดเกิน` และ `เงินสดขาด` จากข้อมูลปิดกะจริงของวันนั้น
- หน้า `รายจ่าย` กลับมาบันทึกได้ใน mock mode เพราะมี expense account ที่ active ให้เลือกแล้ว และมี regression test ครอบ flow นี้

## What Was Done

1. แก้หน้า POS ให้ใช้งานหน้างานจริงมากขึ้น
   - แยก scroll ของฝั่งรายการขายกับฝั่งตะกร้า/คิดเงิน
   - แก้ search ให้ match label ภาษาไทยที่มองเห็นบน UI
   - ปรับตาราง inventory summary ให้ responsive และเลื่อนได้

2. แก้ layout ระดับ shell
   - เอา `max-w-7xl` ที่ทำให้ content แคบเกินไปออก
   - เพิ่ม `min-w-0` ให้ container หลักเพื่อหลีกเลี่ยง overflow

3. ลด placeholder และ mock UI ที่ไม่จำเป็น
   - เอา connection status cards ออกจาก dashboard
   - เอา note block ออกจากหน้า open-shift
   - เปลี่ยนหน้า close-shift ให้แสดงรายการขายจริงในกะนั้น

4. เพิ่ม responsible person ใน flow กะและรายงาน
   - open/close shift รับ `responsible_name`
   - adapter, auth provider, API routes, tests, และ report pages ถูกปรับตาม contract ใหม่
   - daily summary table แสดงผู้รับผิดชอบ

5. ทำหน้าสรุปกะให้มีข้อมูลใช้งานจริงมากขึ้น
   - เปลี่ยนจาก placeholder report เป็นหน้า data-driven
   - ใช้ `adapter.getDailySummary(date)` เป็น source หลัก
   - เพิ่มตัวกรองผู้รับผิดชอบ
   - แยกยอดขายเงินสด, พร้อมเพย์, บัตรเครดิต
   - เพิ่มตาราง source data ของบิลที่ใช้คำนวณ
   - เพิ่ม section ผลต่างเงินสดจากการปิดกะ พร้อมแยก `เงินสดเกิน` และ `เงินสดขาด`

6. แก้หน้า `รายจ่าย`
   - เปลี่ยน copy จาก `เงินสดย่อย` เป็น `รายจ่าย` ในหน้า, เมนู, dashboard, guard, และ metadata
   - เพิ่มข้อความเตือนให้ชัดเมื่อไม่มีบัญชีรายจ่าย active
   - เพิ่ม expense account ที่ active ใน mock data เพื่อไม่ให้ปุ่มบันทึกถูก block ตลอดเวลา
   - เพิ่ม frontend regression test สำหรับการบันทึกรายจ่าย

## What Is Still Missing

1. `responsible_name` ยังไม่ได้ persist เป็น field จริงในฐานข้อมูล `Shift`
   - ตอนนี้ฝั่ง real flow ส่งค่าไปใน request/response ได้
   - แต่ schema จริงยังไม่มี dedicated column สำหรับเก็บชื่อผู้รับผิดชอบของกะโดยตรง

2. หน้าสรุปกะยังอิง `daily summary` เป็นหลัก ไม่ได้ใช้ endpoint เฉพาะของ `shift summary`
   - ตอนนี้พอใช้งานได้และสอดคล้องกับความต้องการหลัก
   - แต่ถ้าจะทำรายงานระดับกะให้ลึกขึ้น ควรมี backend endpoint เฉพาะที่คืน closed shifts พร้อมรายละเอียดครบชุด

3. หน้า `รายจ่าย` ใน real mode ยังขึ้นกับความพร้อมของ COA API และข้อมูลผังบัญชีจริง
   - ถ้า environment จริงยังไม่มีบัญชีหมวด `EXPENSE` ที่ active ผู้ใช้จะยังบันทึกไม่ได้
   - ตอนนี้แก้ครบใน mock mode และทำ error state ให้ชัดแล้ว

4. ยังไม่มีตารางประวัติรายจ่ายในหน้า `รายจ่าย`
   - ผู้ใช้บันทึกได้แล้ว แต่ยังไม่เห็นรายการที่เคยบันทึกในกะนั้นจากหน้าเดียวกัน

## Risks And Notes

- ข้อมูล `เงินสดเกิน/ขาด` ในหน้าสรุปกะตอนนี้ขึ้นกับ `shift_rows` ของ daily summary ถ้า backend fixture หรือ schema จริงไม่ส่งข้อมูลกะปิดครบ รายงานจะเห็นเท่าที่ backend ให้มา
- backend fixture บางตัวไม่มีชื่อผู้รับผิดชอบใน shift ปิดกะ จึงต้องมี fallback เป็น `ไม่ระบุผู้รับผิดชอบ`
- ถ้าฝั่งธุรกิจต้องการตรวจตาม `คนรับผิดชอบกะ` ที่ไม่เท่ากับ `staffId` ของ user ปัจจุบัน ต้องทำ schema migration เพิ่ม
- branch ปัจจุบันสำหรับ push คือ `staging-frontA`

## Validation

ชุดทดสอบล่าสุดที่รันผ่าน:

- `npx vitest run tests/frontend/report-placeholders.test.tsx tests/frontend/expenses-page.test.tsx tests/frontend/response-shape-alignment.test.ts tests/backend/phase-a4-services.test.ts --reporter=verbose`
  - ผ่าน `20/20`

validation ที่ผ่านก่อนหน้านี้ในรอบเดียวกัน:

- focused POS tests ผ่านหลังแก้ search/layout
- close-shift focused tests ผ่านหลังเปลี่ยนเป็นตารางขายตามกะ
- member/shift/report/API focused suite ผ่าน `39/39`

## Next Plan

1. Persist `responsible_name` ลงฐานข้อมูล `Shift` จริง
   - ปรับ Prisma schema
   - สร้าง migration
   - ปรับ services/routes/adapters ให้เก็บและอ่านค่าจาก DB จริง

2. แยก backend endpoint สำหรับ `shift summary`
   - คืนข้อมูล closed shifts, expected cash, actual cash, difference, responsible person, และรายการขายต่อกะ
   - ลดการต้องประกอบข้อมูลหลายชั้นจาก daily summary

3. เพิ่มประวัติ `รายจ่าย` ในหน้าเดียวกัน
   - แสดงรายการรายจ่ายของกะปัจจุบัน
   - ช่วยตรวจย้อนหลังได้ทันทีหลังบันทึก

4. ทำ smoke test ใน real mode
   - ตรวจว่า COA, shift open/close, reports, และ expense posting ทำงานครบกับข้อมูลจริง

## Push Target

- Remote: `origin`
- Branch: `staging-frontA`