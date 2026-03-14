# Frontend Next Plan 2026-03-13: Return To Real Data

## Objective

เป้าหมายรอบถัดไปของ frontend คือหยุดประเมินด้วย mock preview แล้วกลับไปปิดงานบนข้อมูลจริงและ flow จริงให้ครบ โดยไม่สร้าง contract drift ใหม่

## Current Truth

- runtime path ของ frontend ยังเลือก adapter ตาม `NEXT_PUBLIC_APP_ADAPTER`
- `.env.example` ตั้งค่าเป้าหมายไว้ที่ `NEXT_PUBLIC_APP_ADAPTER="real"` แล้ว
- งาน mock catalog ที่เพิ่มเข้ามาเป็นเพียงชุดข้อมูลสำหรับ preview และ test support ไม่ได้เปลี่ยน contract ฝั่ง production

## Preconditions

ก่อนเริ่มรอบถัดไป ต้องมีสิ่งต่อไปนี้ครบ:

1. `.env` ที่ใช้ได้จริงใน local
2. database ที่ migrate พร้อมแล้ว
3. account `OWNER` หรือ `ADMIN` ที่ login ได้จริง
4. seed data จริงหรือ dataset จริงสำหรับ COA, products, members, และ shift flow

## Execution Plan

1. เปิด real mode ด้วย `NEXT_PUBLIC_APP_ADAPTER=real`
2. รัน `npm run db:seed:real-mode` ถ้าจำเป็น
3. ตรวจ login, cookie session, และ middleware redirect
4. เปิดหน้า COA และยืนยันว่า dropdown บน product editor อ่านบัญชีรายได้จริงได้ครบ
5. สร้างหรือแก้สินค้าอย่างน้อย 2 รายการให้ผูกคนละ revenue account
6. เปิดกะและทำรายการขายจริงอย่างน้อย 2 ประเภทสินค้า
7. ดาวน์โหลด General Ledger CSV แล้วตรวจ mapping ของรายได้ตาม account จริง
8. เก็บ bug ที่เจอพร้อม request, response code, error code, และผลกระทบต่อ flow

## Frontend Follow-up After Real Smoke

1. ถ้าข้อมูลจริงไม่ตรงกับ mock preview ให้ลด hard-coded presentation mapping ที่ไม่จำเป็น
2. ถ้า backend ส่งชื่อสินค้า/ราคา/SKU ต่างจากที่คาด ให้ย้ายการตัดสินใจไปที่ data setup แทนการ patch UI ซ้ำ
3. ถ้า CSV export หรือ revenue mapping fail ให้เขียน regression test เพิ่มเฉพาะกรณีที่เจอจริง
4. ถ้าหน้า POS ยังต้อง polish ต่อ ให้ทำหลังจาก real smoke ผ่านแล้วเท่านั้น

## Definition Of Done

ถือว่ารอบถัดไปของ frontend ปิดได้เมื่อ:

1. smoke test แบบ real mode ผ่านครบตาม `docs/Phase_G_Smoke_Checklist.md`
2. product revenue mapping บนข้อมูลจริงทำงานครบ create, update, sale, และ GL export
3. ไม่มี blocker จาก auth/session/middleware ใน flow หลัก
4. ไม่มี assumption จาก mock preview ที่บังคับให้ production ใช้งานไม่ได้