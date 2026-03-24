# POS Product Create Debug Plan

Date: 2026-03-21
Project: fitnessLA
Status: Grounded and documented for follow-up
Scope: บันทึกแผนและข้อเท็จจริงของปัญหา สร้างสินค้าในหน้า POS ยังไม่ผ่านหลัง restart เพื่อใช้ไล่ต่อในรอบถัดไป

## 1. Objective

เอกสารนี้สรุปสถานะจริงของปัญหา create product จากหน้า POS หลังเพิ่ม field ใหม่ดังนี้:

1. เลือกหมวดขาย POS
2. ใส่คำโปรยสินค้า
3. ปักหมุดสินค้า 4 ช่อง

เป้าหมายคือเก็บสิ่งที่พิสูจน์แล้ว, สมมติฐานที่ถูกตัดทิ้ง, จุดที่ยังน่าสงสัย, และลำดับการ debug รอบถัดไป โดยไม่ต้องไล่ซ้ำตั้งแต่ต้น

## 2. Grounded Facts

ข้อเท็จจริงด้านล่างยืนยันแล้วจาก code path จริง, route จริง, และ database จริง

### 2.1 Database Schema

1. migration สำหรับ product metadata ถูก deploy แล้ว
2. ฐานข้อมูลจริงมี column ใหม่ครบ:
   - `tagline`
   - `posCategoryCode`
   - `featuredSlot`
3. Prisma client ถูก generate ใหม่แล้ว
4. rollback-only SQL probes สำหรับ `UPDATE` และ `INSERT` ผ่าน

สรุป: ปัญหาไม่ได้เกิดจาก schema ของ database ไม่ตรงกับ code อีกแล้ว

### 2.2 Service Layer

ตรวจสอบ `createProduct()` โดยตรงแล้วใน environment จริงด้วย payload ใกล้เคียงกับหน้าจอ:

```json
{
  "sku": "W-1",
  "name": "น้ำขวดเล็ก",
  "tagline": "น้ำขวดเล็ก",
  "price": 15,
  "product_type": "GOODS",
  "pos_category": "COUNTER",
  "featured_slot": 1,
  "stock_on_hand": 10
}
```

ผล: `createProduct()` สร้างสำเร็จจริง

สรุป: service ไม่ได้พังกับ payload รูปแบบนี้

### 2.3 Product POST Route

ตรวจสอบ route `POST /api/v1/products` โดยตรงด้วย request จริงแล้ว

ผลที่ยืนยันได้:

1. SKU ใหม่ที่ไม่ซ้ำ -> `201 Created`
2. SKU ซ้ำ -> `409 DUPLICATE_PRODUCT_SKU`
3. `revenue_account_id` เป็น string ว่าง -> `400 VALIDATION_ERROR`
4. `price` ติดลบ -> `400 VALIDATION_ERROR`

สรุป: route ไม่ได้พังแบบ generic เสมอไป และสามารถตอบ error code เฉพาะได้ตามปกติ

### 2.4 Revenue Account Default

service ฝั่ง create ใช้ default revenue account code `4010` เมื่อไม่ได้ส่ง `revenue_account_id`

ตรวจแล้วว่าสร้างสินค้าสำเร็จได้โดยไม่ต้องระบุ `revenue_account_id`

สรุป: default revenue account ไม่ใช่ blocker สำหรับเส้นทาง create นี้

## 3. Changes Already Applied

มีการแก้ code เพื่อให้เห็นสาเหตุจริงชัดขึ้นแล้ว

### 3.1 API Improvements

ไฟล์:

1. `src/app/api/v1/products/route.ts`
2. `src/app/api/v1/products/[productId]/route.ts`

สิ่งที่เพิ่ม:

1. map `INVALID_PRODUCT` เป็น `400 VALIDATION_ERROR`
2. map `INVALID_PRODUCT_PRICE` เป็น `400 VALIDATION_ERROR`
3. handle invalid JSON body ก่อนเข้า zod parse
4. log unexpected error ด้วย `console.error(...)`

### 3.2 POS UI Error Visibility

ไฟล์:

1. `src/app/(app)/pos/page.tsx`

สิ่งที่เพิ่ม:

1. ดึง `details.fieldErrors` จาก `VALIDATION_ERROR` มาแสดงข้อความแรกตรง ๆ
2. แก้ fallback message ให้ create ใช้ข้อความ `ไม่สามารถสร้างสินค้าได้` และ update ใช้ `ไม่สามารถอัปเดตสินค้าได้`

สรุป: รอบถัดไป ถ้ายังพัง ผู้ใช้ควรเห็น error ที่แคบลง และ server ควรมี log ของ unexpected exception ให้ trace ต่อได้

## 4. Hypotheses Ruled Out

สมมติฐานที่ถูกตัดออกแล้ว

1. database ยังไม่มี column ใหม่
2. migration ยังไม่ apply
3. Prisma client เก่า
4. service create พังกับ payload ปกติของ GOODS
5. route create พังทุกกรณี
6. ไม่มี default revenue account ที่ใช้ได้

## 5. Most Likely Remaining Causes

หลัง grounding แล้ว สาเหตุที่ยังน่าสงสัยมีดังนี้

1. request ที่ออกจากหน้า POS จริง ไม่ตรงกับ payload ที่เห็นบนฟอร์ม
2. browser/session ของ route จริงหลัง restart ไปชน auth state หรือ cookie state บางจุด
3. app server ที่ผู้ใช้รันอยู่เป็น build/instance คนละชุดกับ code ปัจจุบัน
4. มี unexpected runtime error เฉพาะใน request path ที่มาจาก UI จริง ซึ่งก่อนหน้านี้ถูกกลืนเป็น generic `500`
5. SKU ที่กรอกในหน้า UI ซ้ำกับข้อมูลจริงโดยไม่ได้สังเกต

## 6. Next Debug Order

เมื่อกลับมาไล่ต่อ ให้ทำตามลำดับนี้

### Step 1: Restart With Latest Code

1. restart app ด้วย source ปัจจุบันที่มี improved error handling แล้ว
2. ใช้ SKU ใหม่ที่ไม่ซ้ำชัดเจน เช่น `DBG-<timestamp>` เพื่อกัน false positive จาก unique constraint

### Step 2: Capture Real UI Error

1. ลองสร้างสินค้าจากหน้า POS อีกครั้ง
2. จดข้อความ error ที่หน้า UI แสดงรอบล่าสุด
3. ถ้าเป็น `VALIDATION_ERROR` ให้ดูข้อความ field error ที่แสดงออกมาตรง ๆ

### Step 3: Capture Server Error

ถ้ายังได้ `500` หรือยังสร้างไม่ได้:

1. ดู terminal log ของ server
2. หา log ที่ขึ้นต้นด้วย:

```text
POST /api/v1/products failed
```

3. เก็บ `error.message`, `code`, และ stack บรรทัดแรก

### Step 4: Compare UI Payload vs Known-Good Payload

ถ้ายังไม่เจอสาเหตุ:

1. เพิ่ม temporary logging ของ payload ที่ route รับจริง
2. เปรียบเทียบกับ known-good payload นี้:

```json
{
  "sku": "DBG-UNIQUE",
  "name": "debug product",
  "tagline": "debug",
  "price": 15,
  "product_type": "GOODS",
  "pos_category": "COUNTER",
  "featured_slot": 1,
  "stock_on_hand": 10
}
```

3. ตรวจ field ที่อาจเพี้ยน เช่น:
   - `price`
   - `stock_on_hand`
   - `featured_slot`
   - `pos_category`
   - `revenue_account_id`
   - `sku`

### Step 5: Check Runtime Environment If Needed

ถ้า route probe ยังผ่าน แต่ UI ยังพัง:

1. ตรวจว่าตัว app dev server restart ขึ้นด้วย source ล่าสุดจริง
2. ตรวจว่ามี process เก่าหรือ cache เก่าค้างหรือไม่
3. ตรวจ network response จาก browser devtools หากเปิดใช้งานได้

## 7. Suggested Temporary Logging

ถ้าต้องไล่ต่อจริงในรอบหน้า แนะนำ temporary instrumentation แบบสั้น ๆ ที่ route `POST /api/v1/products`:

1. log body หลัง parse สำเร็จ
2. log `parseResult.error.flatten()` เมื่อ validation fail
3. log unexpected exception พร้อม error object เต็ม

หมายเหตุ: เมื่อหาสาเหตุเจอแล้ว ให้ลบ temporary logging ที่เปิดเผย payload ออก

## 8. Current Conclusion

ข้อสรุป ณ ตอนเขียนเอกสารนี้คือ:

1. backend create path สำหรับสินค้าใช้งานได้จริงใน environment ปัจจุบัน
2. database พร้อมแล้ว
3. route พร้อมแล้ว
4. ปัญหาที่เหลือมีแนวโน้มอยู่ที่ request จาก UI จริง, runtime instance, session/auth state, หรือ unexpected exception ที่ต้องดูจาก log รอบถัดไป

## 9. Verification Completed

ยืนยันแล้วว่าการเปลี่ยนแปลงล่าสุดไม่ทำ regression ในจุดหลักที่เกี่ยวข้อง:

1. focused route and adapter tests ผ่าน
2. product POST route success path ผ่าน
3. product POST route validation path ผ่าน

เอกสารนี้ตั้งใจให้เป็น source of truth สำหรับการไล่ต่อในรอบถัดไป