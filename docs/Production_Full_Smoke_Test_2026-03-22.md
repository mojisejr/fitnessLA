# Production Full Smoke Test

เอกสารนี้เป็นคู่มือ manual smoke test สำหรับ production ของระบบ fitnessLA โดยครอบคลุมทุกเมนูและทุก action ที่เปิดใช้งานบน UI ปัจจุบันตามโค้ดใน repository ณ วันที่ 2026-03-22

Production URL: `https://fitness-la.vercel.app`

บัญชีตั้งต้นที่ใช้เริ่มทดสอบ:

- Username: `phuwasit`
- Password: `phuwasit1!`

## เป้าหมาย

ยืนยันว่า production ใช้งานได้จริงครบตาม flow หลักต่อไปนี้:

- login, session, route protection
- dashboard และ quick links
- open shift และ close shift
- POS, cart, checkout
- POS product management และ stock adjustment
- members management
- trainers management และ PT enrollment ที่มาจาก POS
- expenses พร้อมแนบใบเสร็จ
- chart of accounts
- daily summary, shift summary, profit and loss
- general ledger ตามสถานะ feature flag ปัจจุบัน
- owner-only, admin-only, cashier-only permission behavior
- attendance machine approval, check-in, check-out
- owner force close shift

## ขอบเขตที่เอกสารนี้ครอบคลุม

เอกสารนี้ครอบคลุมทุกหน้าที่มี route และมี action บน UI จริงใน production build ปัจจุบัน:

| เมนู | Path | Role ที่ควรเข้าได้ | หมายเหตุ |
| --- | --- | --- | --- |
| Login | `/login` | ทุกคน | ใช้ Better Auth |
| Dashboard | `/dashboard` | OWNER, ADMIN, CASHIER | มี quick links และ attendance card สำหรับ ADMIN/CASHIER |
| Open Shift | `/shift/open` | OWNER, ADMIN, CASHIER | ใช้เปิดกะ |
| POS | `/pos` | OWNER, ADMIN, CASHIER | ต้องมีกะเปิดอยู่ |
| POS Products | `/pos/products` | OWNER, ADMIN, CASHIER | จัดการสินค้าและเติม stock |
| Expenses | `/expenses` | OWNER, ADMIN, CASHIER | ต้องมีกะเปิดอยู่ |
| Close Shift | `/shift/close` | OWNER, ADMIN, CASHIER | blind drop, owner force close ได้ |
| Members | `/members` | OWNER, ADMIN | ADMIN เป็น read-only |
| Trainers | `/trainers` | OWNER, ADMIN | ADMIN เป็น read-only |
| COA | `/coa` | OWNER, ADMIN | CASHIER เข้าไม่ได้ |
| Daily Summary | `/reports/daily-summary` | OWNER, ADMIN | OWNER แก้ไขและลบบิลได้ |
| Shift Summary | `/reports/shift-summary` | OWNER, ADMIN | OWNER แก้ไขบิลได้ |
| Profit & Loss | `/reports/profit-loss` | OWNER | ADMIN, CASHIER เข้าไม่ได้ |
| Admin Attendance | `/admin/attendance` | OWNER | OWNER ดูย้อนหลังทั้งทีม |
| Admin Users | `/admin/users` | OWNER | ใช้สร้าง user และอนุมัติเครื่องลงเวลา |
| General Ledger | `/reports/general-ledger` | OWNER, ADMIN | อาจถูกปิดด้วย feature flag |

## ข้อควรระวังสำหรับ production

การทดสอบชุดนี้มีบาง step ที่สร้างข้อมูลจริงใน production และบางรายการเป็น audit trail ถาวร จึงควรทดสอบในช่วงที่ owner อนุมัติแล้วเท่านั้น

รายการที่กระทบข้อมูลจริงแน่นอน:

- เปิดกะและปิดกะ
- checkout สินค้า, membership, PT package
- บันทึกรายจ่าย
- attendance check-in และ check-out
- สร้างผู้ใช้, สร้างสมาชิก, สร้างเทรนเนอร์, สร้างบัญชี, สร้างสินค้า

รายการที่ cleanup ได้จาก UI บางส่วน:

- สมาชิกที่สร้างเอง
- เทรนเนอร์ที่สร้างเอง
- user ชั่วคราวที่สร้างเอง
- บิลขายบางรายการผ่านหน้า report ของ owner
- training enrollment ที่เกิดจาก PT package

รายการที่ควรถือว่าเป็นบันทึกจริงและไม่ควรลบเองถ้าไม่ได้รับอนุมัติ:

- กะที่เปิดและปิดแล้ว
- attendance log
- expense record

## กติกาการตั้งชื่อข้อมูลทดสอบ

เพื่อแยกข้อมูล test ออกจากข้อมูลลูกค้าจริง ให้ใช้ prefix เดียวกันทั้งรอบทดสอบ:

- Smoke code: `SMOKE-PROD-20260322-01`
- สมาชิก: `SMOKE-PROD-20260322-01 MEMBER`
- เทรนเนอร์: `SMOKE-PROD-20260322-01 TRAINER`
- สินค้า: `SMOKE-PROD-20260322-01 PRODUCT`
- User admin: `smoke.admin.0322`
- User cashier: `smoke.cashier.0322`
- Expense description: `SMOKE-PROD-20260322-01 petty cash`
- Device label: `SMOKE-PROD-20260322-01 DESKTOP`

ถ้ามีการ rerun หลายรอบในวันเดียวกัน ให้เปลี่ยน suffix ท้ายชื่อ เช่น `-02`, `-03`

## หลักฐานที่ควรเก็บทุก step

ในทุก section ให้เก็บอย่างน้อย 1 อย่างต่อไปนี้:

- screenshot หน้าจอหลัง action สำเร็จ
- screenshot error ถ้า fail
- เวลา test จริง
- URL ปัจจุบัน
- ถ้าเปิด DevTools ได้ ให้จด method, endpoint, status code ของ request สำคัญ

## Step 0: Preflight

1. เปิด `https://fitness-la.vercel.app`
2. ยืนยันว่าเว็บโหลดได้และไม่มีหน้า 500 จาก Vercel
3. เตรียมไฟล์รูปเล็ก 1 รูปสำหรับใช้เป็น receipt เช่น JPG หรือ PNG ขนาดไม่เกิน 5 MB
4. เตรียมจดข้อมูลที่ต้องสร้างในรอบทดสอบนี้ตาม prefix ด้านบน
5. ถ้ามีผู้ใช้งานจริงในร้าน ณ เวลานั้น ให้หยุดก่อนและขอ owner อนุมัติช่วง test window

Expected result:

- เว็บเปิดได้ปกติ
- ไม่มี maintenance banner หรือ server error ทันที

## Step 1: Login และ Session Smoke

1. เข้า path `/login`
2. ยืนยันว่ามีหัวข้อ `เข้าสู่ระบบ`
3. กรอก username `phuwasit`
4. กรอก password `phuwasit1!`
5. กดปุ่ม `เข้าสู่ระบบ`
6. ยืนยันว่าระบบ redirect ไป `/dashboard`
7. refresh 1 ครั้ง
8. ยืนยันว่า session ยังอยู่และไม่ถูกเด้งกลับ `/login`
9. เปิดแท็บใหม่แล้วเข้า `/dashboard` ตรง ๆ
10. ยืนยันว่าเข้าหน้าได้โดยไม่ต้อง login ใหม่

Expected result:

- login สำเร็จ
- เห็นชื่อผู้ใช้และ role badge ที่ sidebar
- refresh แล้วยังอยู่ในระบบ

Optional network check:

- `POST /api/auth/sign-in/username` ได้ 2xx หรือ success redirect
- `GET /api/auth/session` ได้ 200

## Step 2: Protected Route และ Redirect Smoke

1. เปิด incognito หรือ browser profile ใหม่
2. เข้า `https://fitness-la.vercel.app/pos` โดยยังไม่ login
3. ยืนยันว่าถูก redirect ไป `/login`
4. กลับมาที่ browser หลักซึ่งยัง login อยู่
5. เข้า `/members`, `/trainers`, `/coa`, `/reports/daily-summary` จาก sidebar ได้ตามปกติ

Expected result:

- browser ที่ไม่มี session ถูกบล็อก
- browser หลักยังใช้งานได้ต่อ

## Step 3: Dashboard Owner Smoke

1. ที่หน้า `/dashboard` ยืนยันว่ามีหัวข้อ `สวัสดี`
2. ตรวจ card สถานะกะ
3. ถ้ายังไม่มีกะเปิด ต้องเห็นข้อความลักษณะ `ยังไม่มีกะที่เปิด`
4. ตรวจ quick links ต่อไปนี้ว่ามีอยู่และกดได้:
5. `เปิดกะ`
6. `POS`
7. `สมาชิก`
8. `รายจ่าย`
9. `ผังบัญชี`
10. `attendance ทีม`
11. `สร้างผู้ใช้`
12. `สรุปยอด`
13. `สรุปกะ`
14. `กำไรขาดทุน`

Expected result:

- quick links ครบตาม role OWNER
- ไม่มีข้อความ permission denied บน dashboard

## Step 4: Open Shift Smoke

1. ไปที่ `/shift/open`
2. ยืนยันว่ามีหัวข้อ `เปิดกะ`
3. ถ้ามีกะเปิดค้างอยู่แล้ว ให้หยุด และไปทำ Step 15 เพื่อตรวจว่ากะเดิมเป็นของใครก่อน
4. กรอก `เงินทอนตั้งต้น` เป็น `500`
5. กด `ยืนยันเปิดกะ`
6. จด shift id และเวลาเปิดกะที่ระบบแสดง
7. กดลิงก์ไป `POS`

Expected result:

- เปิดกะสำเร็จ
- หน้าแสดง success message ลักษณะ `เปิดกะ #... เรียบร้อยแล้ว`
- หลังเปิดกะแล้วสามารถเข้า `/pos` และ `/expenses` ได้

Optional network check:

- `POST /api/v1/shifts/open` ได้ 2xx หรือ 201

## Step 5: POS Main Screen Smoke

1. ที่หน้า `/pos` ยืนยันว่ามีหัวข้อ `เคาน์เตอร์ขาย LA GYM`
2. ยืนยันว่าไม่ค้างข้อความ `กำลังโหลดสินค้า...`
3. ยืนยันว่ามีช่องค้นหาสินค้า
4. ยืนยันว่ามีหมวดสินค้าให้กดเปลี่ยน
5. ยืนยันว่ามีตะกร้าและปุ่ม `คิดเงิน`
6. กดเปลี่ยนหมวดอย่างน้อย 3 หมวด เช่น ALL, MEMBERSHIP, TRAINING หรือ FOOD/BEVERAGE ตามที่แสดงจริง
7. ค้นหาด้วย SKU หรือชื่อสินค้า 1 ครั้ง

Expected result:

- รายการสินค้าขึ้นครบ
- search ทำงาน
- category filter ทำงาน

## Step 6: POS Product Management Smoke

1. ไปที่ `/pos/products`
2. ยืนยันหัวข้อ `ย้ายการจัดการสินค้าไปหน้าใหม่แบบตารางแยกหมวด`
3. ยืนยันว่าไม่ค้าง `กำลังโหลดรายการสินค้า...`
4. ยืนยันว่าไม่ค้าง `กำลังโหลดตัวเลือกบัญชีรายได้...`
5. กด `เพิ่มสินค้าใหม่`
6. สร้างสินค้าใหม่ด้วยข้อมูลตัวอย่างนี้:
7. SKU: `SMOKE-PROD-20260322-01-GOOD`
8. ชื่อสินค้า: `SMOKE-PROD-20260322-01 PRODUCT`
9. ราคา: `89`
10. สต็อกคงเหลือ: `9`
11. คำโปรยสินค้า: `production smoke create flow`
12. เลือกหมวดขาย POS ใดก็ได้ 1 หมวด
13. ถ้ามี dropdown บัญชีรายได้ ให้เลือกบัญชีรายได้ที่ active
14. กด `สร้างสินค้าใหม่`
15. ค้นหาสินค้าที่เพิ่งสร้าง
16. เปิดโหมดแก้ไขสินค้า
17. เปลี่ยนชื่อเป็น `SMOKE-PROD-20260322-01 PRODUCT UPDATED`
18. เปลี่ยนราคาเป็น `119`
19. กด `บันทึกสินค้า`
20. เปิด inline restock ของสินค้านี้
21. กรอก `เติมเพิ่ม` เป็น `2`
22. กรอกหมายเหตุ `SMOKE-PROD-20260322-01 restock`
23. กด `บันทึกการเติมสินค้า`

Expected result:

- create สำเร็จ
- update สำเร็จ
- stock จาก 9 เพิ่มเป็น 11
- แถวสินค้าที่แก้ไขแล้วแสดงชื่อใหม่ ราคาใหม่ และจำนวน stock ใหม่

Optional network check:

- `POST /api/v1/products` ได้ 2xx
- `PATCH /api/v1/products/:productId` ได้ 200
- `POST /api/v1/products/stock-adjustments` ได้ 2xx

## Step 7: Goods Checkout Smoke

1. กลับไป `/pos`
2. ค้นหาสินค้า `SMOKE-PROD-20260322-01 PRODUCT UPDATED`
3. กด `เพิ่มลงบิล`
4. ตรวจว่าตะกร้ามีสินค้า 1 รายการ
5. ยืนยันยอดรวมเท่ากับ `119`
6. เลือกวิธีชำระเงินเป็น `CASH`
7. กรอกชื่อลูกค้าเป็น `SMOKE-PROD-20260322-01 WALKIN`
8. กด `คิดเงิน`
9. ที่ modal หรือขั้นตอนยืนยัน ให้กด `ยืนยันการคิดเงิน`
10. รอจนบิลสำเร็จ

Expected result:

- checkout สำเร็จ
- cart ถูก reset หรือ disabled ตาม state สำเร็จของหน้า
- stock ของสินค้าที่ขายลดลงตามจำนวนที่ซื้อ

Optional network check:

- `POST /api/v1/orders` ได้ 2xx

## Step 8: Membership Checkout Smoke

1. ที่หน้า `/pos` ค้นหาสินค้า membership 1 รายการ เช่น monthly membership หรือชื่อ membership ที่มีอยู่จริง
2. กด `เพิ่มลงบิล`
3. กรอกชื่อลูกค้าเป็น `SMOKE-PROD-20260322-01 MEMBER`
4. กรอกเบอร์โทรของลูกค้า ถ้า UI มี field ให้กรอก
5. เลือกวิธีชำระเงินเป็น `PROMPTPAY`
6. กด `คิดเงิน`
7. กดยืนยันการคิดเงิน
8. รอ success state

Expected result:

- ระบบสร้าง order สำเร็จ
- membership customer name ถูกบันทึก
- ไม่มี error ประเภท `MEMBERSHIP_CUSTOMER_REQUIRED` หรือ `MEMBERSHIP_SINGLE_QUANTITY`

## Step 9: Members Page Smoke จาก Membership Checkout

1. ไปที่ `/members`
2. ยืนยันหัวข้อ `สมาชิกและวันหมดอายุ`
3. ค้นหาชื่อ `SMOKE-PROD-20260322-01 MEMBER`
4. ยืนยันว่าพบสมาชิกที่เพิ่งเกิดจาก membership checkout
5. ตรวจข้อมูลต่อไปนี้:
6. member code มีค่า
7. ชื่อสมาชิกถูกต้อง
8. package หรือ membership name ตรงกับที่ซื้อ
9. started_at และ expires_at มีค่า
10. renewal method แสดงค่าได้

Expected result:

- members page อ่านจาก backend truth ได้
- สมาชิกจาก checkout ปรากฏจริงหลัง reload

## Step 10: Direct Member Management Owner Smoke

1. ที่หน้า `/members` ยืนยันว่ามี section สร้างสมาชิกใหม่สำหรับ owner
2. สร้างสมาชิกเพิ่มอีก 1 คน:
3. ชื่อ `SMOKE-PROD-20260322-01 MEMBER MANUAL`
4. เบอร์โทร `0800003221`
5. membership name `SMOKE MANUAL`
6. membership period เลือก `MONTHLY`
7. started_at ใช้เวลาปัจจุบัน
8. expires_at ใช้ค่า default ที่ระบบเติมให้
9. กดสร้างสมาชิก
10. ค้นหาสมาชิกที่สร้างเอง
11. เปิดโหมดแก้ไขวันเริ่มและวันหมดอายุ
12. เลื่อนวันหมดอายุไปอีก 1 วัน
13. กดบันทึก
14. กด `ต่ออายุ` กับสมาชิกที่เหมาะสม 1 รายการ
15. กด `เริ่มใหม่` กับสมาชิกที่เหมาะสม 1 รายการ
16. กด `ปิดใช้งาน` หรือ `เปิดใช้งาน` 1 ครั้ง แล้วกดกลับอีกครั้งเพื่อคืนสถานะเดิมถ้าต้องการ
17. ทดสอบการเลือก checkbox ของสมาชิกอย่างน้อย 2 รายการ
18. ถ้าต้องการ cleanup ทันที ให้ใช้ `ลบสมาชิกที่เลือก` เฉพาะข้อมูล smoke ที่สร้างเอง

Expected result:

- owner สร้างสมาชิกเองได้
- แก้ไข started_at/expires_at ได้
- renew และ restart ทำงาน
- toggle active ทำงาน
- bulk selection ทำงาน

หมายเหตุ:

- ห้ามลบสมาชิกจริงของธุรกิจ
- ให้ลบเฉพาะชื่อที่มี prefix `SMOKE-PROD-20260322-01`

## Step 11: Trainer Management Smoke

1. ไปที่ `/trainers`
2. ยืนยันหัวข้อ `เทรนเนอร์`
3. กด `เพิ่มเทรนเนอร์`
4. สร้างเทรนเนอร์ด้วยข้อมูลนี้:
5. ชื่อ `SMOKE-PROD-20260322-01 TRAINER`
6. nickname `SMOKE`
7. phone `0810003221`
8. กดเพิ่มเทรนเนอร์
9. ค้นหาหรือเลื่อนหาเทรนเนอร์ที่สร้างใหม่
10. ยืนยันว่าแถวเทรนเนอร์แสดงสถานะ active

Expected result:

- owner เพิ่มเทรนเนอร์ได้
- เทรนเนอร์ใหม่ปรากฏในรายการ

## Step 12: PT Checkout และ Enrollment Smoke

1. กลับไป `/pos`
2. ค้นหาสินค้า PT package 1 รายการที่มีอยู่จริง
3. กด `เพิ่มลงบิล`
4. ใน cart ต้องมี dropdown `เลือกเทรนเนอร์`
5. เลือก `SMOKE-PROD-20260322-01 TRAINER`
6. กรอกชื่อลูกค้า `SMOKE-PROD-20260322-01 PT CUSTOMER`
7. เลือกวิธีชำระเงิน `CREDIT_CARD`
8. กด `คิดเงิน`
9. กดยืนยันการคิดเงิน
10. กลับไป `/trainers`
11. เปิดรายละเอียดเทรนเนอร์ smoke ที่สร้างไว้
12. ยืนยันว่ามี active assignment หรือ enrollment ของลูกค้า `SMOKE-PROD-20260322-01 PT CUSTOMER`
13. แก้ไข `sessions remaining` ลดหรือเพิ่ม 1 ครั้ง
14. เปลี่ยน status ของ enrollment เป็นอีกสถานะหนึ่งที่เหมาะสม เช่น `CLOSED` พร้อมใส่ close reason
15. กดบันทึก
16. ถ้าต้องการ cleanup ให้ลบ enrollment ที่สร้างจาก smoke
17. ทดสอบปิดใช้งานเทรนเนอร์ 1 ครั้ง
18. ถ้าระบบอนุญาต ให้เปิดใช้งานกลับ
19. เมื่อลบ enrollment แล้ว ให้ลบเทรนเนอร์ smoke ที่สร้างเอง

Expected result:

- PT checkout ผูก trainer ได้
- trainer page แสดง enrollment จริงจาก order
- update enrollment ทำงาน
- delete enrollment ทำงาน
- toggle trainer ทำงาน

## Step 13: Expense Smoke

1. ไปที่ `/expenses`
2. ยืนยันหัวข้อ `รายจ่าย`
3. ยืนยันว่ามีบัญชีรายจ่ายให้เลือกอย่างน้อย 1 รายการ
4. กรอกจำนวนเงิน `1`
5. เลือกบัญชีรายจ่าย 1 บัญชี
6. กรอกรายละเอียด `SMOKE-PROD-20260322-01 petty cash`
7. แนบไฟล์ receipt JPG หรือ PNG ที่เตรียมไว้
8. ยืนยันว่ามี preview รูป
9. กด `บันทึกรายจ่าย`

Expected result:

- submit สำเร็จ
- ไม่มี error ว่า `กรุณาเปิดกะก่อนบันทึกรายจ่าย`
- ไม่มี error ว่าไม่มีบัญชีรายจ่ายให้เลือก

หมายเหตุสำคัญ:

- expense เป็นบันทึกจริงใน production
- step นี้ควรทำเฉพาะเมื่อ owner อนุมัติผลกระทบทางบัญชีแล้ว

## Step 14: COA Smoke

1. ไปที่ `/coa`
2. ยืนยันหัวข้อ `ผังบัญชี`
3. ใช้ช่องค้นหา 1 ครั้ง
4. ใช้ filter หมวดบัญชี 2 แบบขึ้นไป เช่น `REVENUE`, `EXPENSE`
5. สร้างบัญชีใหม่ 1 บัญชีด้วยข้อมูลตัวอย่าง:
6. รหัสบัญชี `7999`
7. ชื่อบัญชี `SMOKE PROD TEMP ACCOUNT`
8. ประเภท `EXPENSE` หรือ `REVENUE`
9. คำอธิบาย `SMOKE-PROD-20260322-01`
10. กด `สร้างบัญชีใหม่`
11. ค้นหาบัญชีที่เพิ่งสร้าง
12. กด `ปิดใช้งาน`
13. กด `เปิดใช้งาน` กลับ

Expected result:

- search และ filter ทำงาน
- create account สำเร็จ
- toggle active สำเร็จ

## Step 15: Daily Summary Smoke

1. ไปที่ `/reports/daily-summary`
2. ยืนยันหัวข้อ `สรุปยอด`
3. ทดสอบ period ทั้ง 4 ค่า:
4. `DAY`
5. `WEEK`
6. `MONTH`
7. `CUSTOM`
8. ใน mode `CUSTOM` เลือกวันที่ที่ครอบคลุมรายการ smoke ของวันนี้
9. ยืนยันว่ามี metric cards สำหรับ:
10. ยอดขายรวม
11. รายจ่ายรวม
12. กระแสเงินสดสุทธิ
13. ผลต่างจากการปิดกะ
14. เลื่อนดู sales by category
15. เลื่อนดู sales by payment method
16. ในตาราง `รายการขายตามบิล` ให้หา order ของ smoke ที่เพิ่งสร้าง
17. กด `แก้ไข` ที่ 1 บิล
18. ใช้ปุ่ม `+` และ `-` กับรายการสินค้าอย่างน้อย 1 ครั้ง
19. กด `ยกเลิก` ก่อน เพื่อไม่เปลี่ยนยอดจริงถ้าไม่ต้องการกระทบข้อมูล
20. เลือก checkbox ของบิล smoke อย่างน้อย 1 รายการ
21. ทดสอบปุ่ม `ลบที่เลือก` เฉพาะบิล smoke ที่ owner อนุมัติให้ลบ

Expected result:

- report โหลดได้ทุก period
- owner เห็นปุ่มแก้ไขและลบ
- quantity editor ทำงาน
- bulk selection ทำงาน

หมายเหตุ:

- ถ้าไม่ต้องการกระทบยอดจริง ให้ทดสอบเข้าโหมดแก้ไขแล้วกด `ยกเลิก`
- การลบบิลใน production ต้องทำเฉพาะบิล smoke ที่สร้างเอง

## Step 16: Shift Summary Smoke

1. ไปที่ `/reports/shift-summary`
2. ยืนยันหัวข้อ `สรุปกะ`
3. เลือก `วันที่ธุรกิจ` เป็นวันที่ทดสอบ
4. ดู card metrics ทั้งหมด:
5. จำนวนบิล
6. ยอดขายเงินสด
7. ยอดขายพร้อมเพย์
8. ยอดขายบัตรเครดิต
9. ยอดปิดกะเงินสด
10. เงินสดเกิน
11. เงินสดขาด
12. เปลี่ยน filter `ผู้รับผิดชอบ` จาก `ทุกคน` ไปเป็นชื่อผู้รับผิดชอบที่มีจริง แล้วกลับมา `ทุกคน`
13. ในตาราง source data ของบิล ให้เปิด `แก้ไข` ของบิล smoke 1 รายการ
14. ทดสอบปุ่ม `+` และ `-` 1 ครั้ง
15. กด `ยกเลิก` ถ้าไม่ต้องการเปลี่ยนข้อมูลจริง

Expected result:

- shift summary สรุปตาม responsible ได้
- source data table แสดงบิลจริง
- owner เห็นปุ่มแก้ไข

## Step 17: Profit & Loss Smoke

1. ไปที่ `/reports/profit-loss`
2. ยืนยันหัวข้อ `กำไรขาดทุน`
3. เปลี่ยนวันเริ่มต้นและวันสิ้นสุดให้ครอบคลุม data smoke ของวันนี้
4. ตรวจ cards ต่อไปนี้:
5. รายได้รวม
6. รายจ่ายรวม
7. ผลการดำเนินงาน
8. ตรวจ section โครงสร้างรายได้ตามวิธีชำระเงิน
9. ตรวจ net cash flow

Expected result:

- owner เข้าได้
- ตัวเลขโหลดได้
- ไม่มี permission error

## Step 18: General Ledger Smoke

1. เข้า `/reports/general-ledger` โดยตรง
2. ถ้าหน้าแสดงข้อความ `หน้ารายงานนี้ถูกปิดใช้งานชั่วคราว` ให้บันทึกว่า feature flag ยังปิดอยู่ และถือว่า PASS ตาม runtime truth ปัจจุบัน
3. ถ้าหน้าเปิดใช้งานอยู่ ให้ทำต่อดังนี้:
4. กรอกวันเริ่มต้นและวันสิ้นสุดให้ครอบคลุมช่วง data smoke
5. กด `ดาวน์โหลด CSV`
6. ยืนยันว่า browser เริ่มดาวน์โหลดไฟล์
7. ยืนยันว่ามี success message ว่าระบบเริ่มดาวน์โหลดไฟล์แล้ว
8. เปิดไฟล์ CSV ที่ดาวน์โหลดมา
9. ตรวจว่ามี header และข้อมูลอย่างน้อย 1 แถว

Expected result:

- ถ้า flag ปิด ต้องเห็น disabled message
- ถ้า flag เปิด ต้องดาวน์โหลด CSV ได้

## Step 19: Create Temporary Admin และ Cashier

1. ไปที่ `/admin/users`
2. ยืนยันหัวข้อ `จัดการผู้ใช้และเวลาเข้างาน`
3. ที่ส่วน device approval กรอก label `SMOKE-PROD-20260322-01 DESKTOP`
4. กด `อนุมัติเครื่องนี้สำหรับลงเวลา`
5. ยืนยัน success message
6. สร้าง admin ชั่วคราวด้วยข้อมูลนี้:
7. ชื่อ `Smoke Admin 0322`
8. เบอร์โทร `0800000322`
9. username `smoke.admin.0322`
10. password `SmokePass!0322`
11. role `ADMIN`
12. scheduled start `08:00`
13. scheduled end `17:00`
14. กด `สร้างผู้ใช้`
15. สร้าง cashier ชั่วคราวด้วยข้อมูลนี้:
16. ชื่อ `Smoke Cashier 0322`
17. เบอร์โทร `0800001322`
18. username `smoke.cashier.0322`
19. password `SmokePass!0322`
20. role `CASHIER`
21. scheduled start `08:00`
22. scheduled end `17:00`
23. กด `สร้างผู้ใช้`
24. ทดสอบแก้เวลางานของ user ชั่วคราวอย่างน้อย 1 รายการ แล้วกดบันทึก

Expected result:

- current device ถูก approve
- สร้าง ADMIN และ CASHIER ได้
- แก้ scheduled time ได้

## Step 20: Admin Permission Smoke

1. ออกจากระบบ
2. login ด้วย `smoke.admin.0322` / `SmokePass!0322`
3. ยืนยันว่าเข้า `/dashboard` ได้
4. เข้า `/members`
5. ยืนยันว่ามีข้อความ read-only ลักษณะ `บัญชีนี้ดูข้อมูลสมาชิกได้อย่างเดียว`
6. ยืนยันว่าไม่เห็นปุ่ม `ต่ออายุ` และ `เริ่มใหม่`
7. เข้า `/trainers`
8. ยืนยันว่ามีข้อความ read-only ลักษณะ `บัญชีนี้ดูข้อมูลเทรนเนอร์ได้อย่างเดียว`
9. ยืนยันว่าไม่เห็นปุ่ม `เพิ่มเทรนเนอร์`
10. เข้า `/coa`
11. ยืนยันว่าเข้าได้
12. เข้า `/reports/daily-summary` และ `/reports/shift-summary`
13. ยืนยันว่าเข้าได้
14. เข้า `/reports/profit-loss`
15. ยืนยันว่าโดนบล็อกด้วยข้อความ permission denied
16. เข้า `/admin/users`
17. ยืนยันว่าโดนบล็อกด้วยข้อความ permission denied
18. เข้า `/admin/attendance`
19. ยืนยันว่าโดนบล็อกด้วยข้อความ permission denied

Expected result:

- ADMIN ใช้หน้า owner/admin shared pages ได้
- ADMIN ถูกบล็อกจาก owner-only pages
- ADMIN เห็น members/trainers แบบ read-only

## Step 21: Cashier Attendance Smoke

1. ออกจากระบบ
2. login ด้วย `smoke.cashier.0322` / `SmokePass!0322`
3. ที่ dashboard ตรวจ card attendance
4. ยืนยันว่าเครื่องปัจจุบันแสดงสถานะพร้อมใช้งานหรือได้รับอนุญาต
5. กด `ลงชื่อเข้างาน`
6. ยืนยันว่ามี success message เช่น `ลงชื่อเข้างานเรียบร้อยแล้ว` หรือ warning เรื่องมาสาย

Expected result:

- cashier check-in ได้จาก browser ที่ owner approve ไว้
- ไม่มี error เรื่องเครื่องไม่ได้รับอนุญาต

## Step 22: Cashier Shift Smoke และ Owner Force Close

1. ยังอยู่ในบัญชี cashier
2. ไป `/shift/open`
3. ถ้ายังมีกะเก่าค้างอยู่ ให้หยุดและปิดกะเดิมก่อน
4. กรอกเงินทอนตั้งต้น `500`
5. กด `ยืนยันเปิดกะ`
6. ยืนยันว่าเปิดกะได้ในชื่อ cashier
7. ออกจากระบบ
8. login กลับด้วยบัญชี owner `phuwasit`
9. ไป `/shift/close`
10. ยืนยันว่ามีข้อความว่ามีกะที่เปิดโดยคนอื่นอยู่ และ owner สามารถบังคับปิดกะแทนได้
11. ยืนยันว่า checkbox `บังคับปิดกะแทนผู้เปิดกะเดิม` แสดงอยู่
12. ปล่อย checkbox อยู่ในสถานะที่ระบบตั้งไว้ให้
13. กรอก `actual cash` เป็น `500`
14. กรอกหมายเหตุปิดกะ `SMOKE-PROD-20260322-01 owner force close`
15. กด `ส่งผลการนับเงิน`
16. ยืนยันว่าปิดกะสำเร็จ
17. ตรวจ `expected_cash`, `actual_cash`, `difference`

Expected result:

- cashier เปิดกะได้
- owner เห็น force close UI เมื่อกะเป็นของคนอื่น
- owner ปิดกะแทนได้สำเร็จ

## Step 23: Cashier Check-out Smoke

1. ออกจากระบบ
2. login กลับด้วยบัญชี cashier
3. ไป `/dashboard`
4. กด `ลงชื่อออกงาน`
5. ยืนยัน success message `ลงชื่อออกงานเรียบร้อยแล้ว`

Expected result:

- cashier check-out ได้หลังจากไม่มีกะเปิดค้างอยู่แล้ว

## Step 24: Owner Attendance Report Smoke

1. ออกจากระบบ
2. login กลับด้วย owner `phuwasit`
3. ไป `/admin/attendance`
4. ยืนยันหัวข้อ `พนักงานที่เข้างาน วันนี้ กี่โมง ออกกี่โมง สายเท่าไหร่`
5. ตรวจ section `attendance วันนี้`
6. ยืนยันว่าพบ `smoke.cashier.0322` หรือ `Smoke Cashier 0322` อยู่ในรายการวันนี้
7. ตรวจเวลา check-in และ check-out
8. ตรวจสถานะมาและสถานะกลับ
9. ที่ section สรุปรายคนย้อนหลัง ให้ทดสอบ period เหล่านี้:
10. `รายวัน`
11. `รายสัปดาห์`
12. `รายเดือน`
13. `เลือกช่วงวัน`
14. เปลี่ยน filter `เลือกพนักงาน` เป็น cashier smoke แล้วกลับเป็น `ทุกคน`

Expected result:

- owner เห็น attendance today และ summary history
- filter period และ filter user ทำงาน

## Step 25: Cleanup

ทำเฉพาะข้อมูล smoke ที่สร้างเองเท่านั้น

1. ไป `/members`
2. ค้นหาด้วย prefix `SMOKE-PROD-20260322-01`
3. ลบสมาชิก smoke ที่สร้างเองทั้งหมดที่ไม่จำเป็นต้องเก็บไว้
4. ไป `/trainers`
5. ลบ enrollment smoke ถ้ายังเหลือ
6. ลบเทรนเนอร์ smoke ถ้ายังเหลือ
7. ไป `/admin/users`
8. เลือก user ชั่วคราว `smoke.admin.0322` และ `smoke.cashier.0322`
9. กด `ลบที่เลือก`
10. ไป `/reports/daily-summary`
11. ถ้า owner อนุมัติ ให้ลบบิล smoke ที่สร้างเองและไม่ต้องการคงไว้
12. บันทึกไว้ชัดเจนว่ารายการใด cleanup แล้ว และรายการใดยังต้องคงไว้เพราะเป็น audit trail

ห้าม cleanup สิ่งต่อไปนี้โดยพลการ:

- expense smoke
- attendance logs
- closed shift records

## เกณฑ์ผ่านขั้นต่ำ

ถือว่ารอบ smoke นี้ผ่าน เมื่อครบทั้งหมดด้านล่าง:

- owner login และ session persistence ผ่าน
- open shift ผ่าน
- POS product create, update, restock ผ่าน
- goods checkout ผ่าน
- membership checkout ผ่าน และเห็นสมาชิกใน `/members`
- members owner actions ผ่านอย่างน้อย create + edit + renew/restart อย่างใดอย่างหนึ่ง + toggle + delete selected เฉพาะข้อมูล smoke
- trainer create ผ่าน และ PT enrollment flow ผ่าน
- expense submit ผ่าน
- COA create + toggle ผ่าน
- daily summary และ shift summary โหลดได้
- profit and loss โหลดได้
- general ledger ถูกยืนยันสถานะตาม feature flag จริง
- admin permission smoke ผ่าน
- cashier check-in, open shift, owner force close, cashier check-out ผ่าน
- owner attendance report เห็นข้อมูลของ cashier smoke

## Failure Log Template

ใช้ format นี้ทุกครั้งที่ fail:

```text
Step:
Role:
URL:
Action:
Expected:
Observed:
Request:
Status code:
Response body:
Screenshot filename:
Impact:
```

## สรุปผลที่ควรส่งกลับหลังจบรอบทดสอบ

ให้ทำสรุปสั้นในรูปแบบนี้:

```text
Production smoke date/time:
Tester:
Scope completed:
Passed items:
Failed items:
Blocked items:
Cleanup completed:
Audit-impact records left intentionally:
Overall result: PASS / FAIL / PASS WITH NOTES
```