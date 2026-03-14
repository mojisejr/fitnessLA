# Phase G Smoke Checklist

เอกสารนี้เป็น checklist แบบติ๊กตามหน้าจอสำหรับรัน manual smoke test ใน local real mode หลังตั้ง env และเปิด dev server แล้ว

ใช้คู่กับ `docs/Local_Real_Mode_Runbook.md`

## Before Opening Browser

- [ ] มีไฟล์ `.env` อยู่ที่ root project
- [ ] `NEXT_PUBLIC_APP_ADAPTER=real`
- [ ] `DATABASE_URL` และ/หรือ `DIRECT_URL` ใช้งานได้จริง
- [ ] `BETTER_AUTH_SECRET` ถูกตั้งค่าแล้ว
- [ ] `BETTER_AUTH_URL=http://localhost:3000`
- [ ] `NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000/api/auth`
- [ ] รัน `npm run db:seed:real-mode` ผ่านแล้ว
- [ ] รัน `npm run dev` แล้วไม่มี startup error

## Screen 1: Login Page

Path: `/login`

- [ ] หน้า login เปิดได้ที่ `http://localhost:3000/login`
- [ ] เห็นข้อความ `เข้าสู่ระบบแบบ real auth`
- [ ] กรอก `owner` และรหัสผ่านที่ seed ไว้
- [ ] กดปุ่ม `เข้าสู่ระบบจริง`
- [ ] ระบบพาไป `/dashboard` สำเร็จ
- [ ] ไม่มี error banner บนหน้า login

ถ้า fail ให้จด:

- request `POST /api/auth/sign-in/username`
- status code
- response body

## Screen 2: Session Persistence

Path: `/dashboard`

- [ ] refresh หน้าแล้ว session ยังอยู่
- [ ] เปิด DevTools และเห็น cookie `better-auth.session_token` หรือชื่อที่ขึ้นต้นด้วยค่านี้
- [ ] เปิด `/api/auth/session` จาก browser แล้วได้ `200`

ถ้า fail ให้จด:

- cookie มีหรือไม่มี
- request `GET /api/auth/session`
- ถ้า redirect ให้จด path ต้นทางและ path ปลายทาง

## Screen 3: COA Page

Path: `/coa`

- [ ] เปิดหน้า COA ได้โดยไม่ถูกส่งกลับ `/login`
- [ ] รายการบัญชีโหลดขึ้น
- [ ] มีบัญชีหมวด `REVENUE` อย่างน้อย 1 รายการ
- [ ] ถ้ามีบัญชี locked UI แสดงสถานะชัดเจน
- [ ] ไม่มี 401 หรือ 403 ที่ไม่คาดหวัง

สิ่งที่ควรจดระหว่างดูหน้า:

- [ ] จำนวน revenue accounts ที่ active คร่าว ๆ
- [ ] account code ของ 2 บัญชีที่จะใช้ผูกสินค้า

## Screen 4: POS Entry

Path: `/pos`

- [ ] เปิดหน้า POS ได้
- [ ] รายการสินค้าโหลดขึ้น
- [ ] ส่วน `จัดการสินค้าใน POS` แสดงฟอร์มครบ
- [ ] ส่วน `บัญชีรายได้` แสดง dropdown `เลือกบัญชีรายได้`
- [ ] ไม่มี error โหลด COA ในส่วน revenue account ถ้า backend พร้อม

ถ้า dropdown ว่าง:

- [ ] ตรวจ `GET /api/v1/coa`
- [ ] จดว่าหน้าว่างเพราะไม่มีข้อมูลหรือ request fail

## Screen 5: Product Mapping Create Flow

Path: `/pos`

- [ ] กด `เพิ่มสินค้าใหม่`
- [ ] เลือกประเภทสินค้า
- [ ] กรอก `SKU`
- [ ] กรอก `ชื่อสินค้า`
- [ ] กรอก `ราคา`
- [ ] ถ้าเป็น goods ให้กรอก `stock คงเหลือ`
- [ ] เลือก revenue account จาก dropdown
- [ ] กด `สร้างสินค้าใหม่`
- [ ] เห็น success message หลังบันทึก
- [ ] ไม่มี contract error จาก backend

Network assertions:

- [ ] request เป็น `POST /api/v1/products`
- [ ] payload มี `revenue_account_id`
- [ ] status code เป็น 2xx

## Screen 6: Product Mapping Update Flow

Path: `/pos`

- [ ] กด `แก้ไขสินค้าเดิม`
- [ ] เลือกสินค้าที่มีอยู่
- [ ] ยืนยันว่าค่า revenue account เดิมถูก preload ถ้ามี mapping อยู่แล้ว
- [ ] เปลี่ยน revenue account เป็นอีกบัญชีหนึ่ง
- [ ] กด `บันทึกสินค้า`
- [ ] เห็น success message หลังบันทึก

Network assertions:

- [ ] request เป็น `PATCH /api/v1/products/:productId`
- [ ] payload มี `revenue_account_id`
- [ ] status code เป็น 2xx

## Screen 7: Open Shift

Path: `/pos` หรือหน้า shift ตาม flow ปัจจุบัน

- [ ] เปิดกะได้สำเร็จ
- [ ] ไม่มี validation error ที่ไม่คาดหวัง
- [ ] หลังเปิดกะ หน้า POS พร้อมขายสินค้า

Network assertions:

- [ ] request `POST /api/v1/shifts/open`
- [ ] status code เป็น 2xx

## Screen 8: Sell Two Mapped Products

Path: `/pos`

- [ ] เพิ่มสินค้าตัวที่ map revenue account แรกลงตะกร้า
- [ ] เพิ่มสินค้าตัวที่ map revenue account ที่สองลงตะกร้า
- [ ] ตรวจยอดรวมในตะกร้าถูกต้อง
- [ ] เลือกวิธีชำระเงิน
- [ ] กด checkout สำเร็จ
- [ ] ได้ success state หรือ receipt state ตาม UI ปัจจุบัน

Network assertions:

- [ ] request `POST /api/v1/orders`
- [ ] status code เป็น 2xx
- [ ] ไม่มี error เรื่อง shift หรือ stock ที่ไม่คาดหวัง

## Screen 9: General Ledger Page

Path: `/reports/general-ledger`

- [ ] เปิดหน้าได้
- [ ] เห็นฟิลด์ `วันเริ่มต้น`
- [ ] เห็นฟิลด์ `วันสิ้นสุด`
- [ ] เห็นปุ่ม `Download CSV`
- [ ] ไม่มี role error ถ้าใช้ `owner` หรือ `admin`

## Screen 10: Download GL CSV

Path: `/reports/general-ledger`

- [ ] เลือกวันที่ให้ครอบคลุมรายการขายเมื่อกี้
- [ ] กด `Download CSV`
- [ ] ปุ่มเปลี่ยนเป็น loading state ระหว่างยิง request
- [ ] browser เริ่มดาวน์โหลดไฟล์
- [ ] เห็น success message บนหน้า
- [ ] ชื่อไฟล์อยู่ในรูปแบบ `general-ledger-YYYY-MM-DD-to-YYYY-MM-DD.csv`

Network assertions:

- [ ] request เป็น `GET /api/v1/reports/gl?start_date=...&end_date=...`
- [ ] query param ใช้ชื่อ `start_date` และ `end_date` เท่านั้น
- [ ] status code เป็น `200`
- [ ] response content-type เป็น `text/csv`

## Screen 11: CSV Validation

เปิดไฟล์ CSV ที่ดาวน์โหลดมาแล้วติ๊กตามนี้:

- [ ] มีรายการรายได้มากกว่า 1 บัญชี
- [ ] เห็นร่องรอยของการแยกตาม revenue mapping ของสินค้า 2 ตัว
- [ ] debit รวมเท่ากับ credit รวม
- [ ] ช่วงวันที่ในไฟล์ตรงกับช่วงวันที่ที่เลือก

## Screen 12: Guard And Sign-out Regression

- [ ] เปิด incognito แล้วเข้าหน้า `/pos` โดยไม่ login
- [ ] ระบบ redirect ไป `/login`
- [ ] กลับมา session เดิมในหน้าปกติยังใช้งานได้
- [ ] sign out แล้ว protected route ถูกบล็อกจริง

## Failure Log Template

```text
Page:
Checklist item:
Action:
Request:
Response status:
Response body/code:
Observed UI:
Expected UI:
User impact:
```

## Sign-off

- [ ] Login real mode ผ่าน
- [ ] Session persistence ผ่าน
- [ ] COA page ผ่าน
- [ ] Product mapping create ผ่าน
- [ ] Product mapping update ผ่าน
- [ ] Open shift ผ่าน
- [ ] Checkout ผ่าน
- [ ] GL export ผ่าน
- [ ] CSV validation ผ่าน
- [ ] Guard/sign-out regression ผ่าน