# Report: Owner Authorization for Members and Trainers

Date: 2026-03-21
Project: fitnessLA
Scope: จำกัดสิทธิ์การแก้ไขข้อมูลสมาชิกและเทรนเนอร์ให้ owner เท่านั้น พร้อมตรวจ regression ของระบบ

## Summary

รอบนี้ได้ปรับระบบให้การแก้ไขข้อมูลสมาชิกและเทรนเนอร์เป็น owner-only ในจุดที่มีการแก้ไขข้อมูลจริงอยู่แล้ว ทั้งฝั่ง API และ UI

ผลลัพธ์หลัก:

1. owner ยังสามารถแก้ไขข้อมูลสมาชิกที่เป็น mutation flow เดิมได้
2. owner ยังสามารถเพิ่มเทรนเนอร์และแก้ไขข้อมูลลูกเทรนได้
3. admin และ user อื่นที่ไม่ใช่ owner จะเห็นข้อมูลแบบ read-only หรือถูกปฏิเสธด้วย 403 เมื่อเรียก API แก้ไข
4. เทสต์เฉพาะจุดผ่านครบ
5. เทสต์รวมทั้งโปรเจ็กต์ผ่านครบ
6. production build ผ่าน

## Implemented Changes

### 1. Centralized owner-only role checks

เพิ่ม helper ใหม่ใน [src/lib/roles.ts](src/lib/roles.ts) สำหรับแยกสิทธิ์ของ member/trainer management ออกจาก helper เดิมที่ยังใช้กับงาน admin อื่น

สิทธิ์ใหม่:

1. canManageMembers = OWNER เท่านั้น
2. canManageTrainers = OWNER เท่านั้น

### 2. Member mutation APIs are now owner-only

ปรับ route ต่อไปนี้ให้ตรวจสิทธิ์ owner ก่อน mutation:

1. [src/app/api/v1/members/[memberId]/renew/route.ts](src/app/api/v1/members/[memberId]/renew/route.ts)
2. [src/app/api/v1/members/[memberId]/restart/route.ts](src/app/api/v1/members/[memberId]/restart/route.ts)
3. [src/app/api/v1/members/special/route.ts](src/app/api/v1/members/special/route.ts)

พฤติกรรมใหม่:

1. ถ้าไม่ login จะได้ 401
2. ถ้า login แต่ไม่ใช่ owner จะได้ 403
3. owner เท่านั้นที่ทำ mutation ได้

### 3. Trainer mutation APIs are now owner-only

ปรับ route ต่อไปนี้ให้ owner-only:

1. [src/app/api/v1/trainers/route.ts](src/app/api/v1/trainers/route.ts)
2. [src/app/api/v1/trainers/enrollments/[enrollmentId]/route.ts](src/app/api/v1/trainers/enrollments/[enrollmentId]/route.ts)

พฤติกรรมใหม่:

1. GET ยังอ่านข้อมูลได้ตาม session เดิม
2. POST เพิ่มเทรนเนอร์ ต้องเป็น owner
3. PATCH แก้ไขลูกเทรน ต้องเป็น owner

### 4. Members page is read-only for non-owner

ปรับ [src/app/(app)/members/page.tsx](src/app/(app)/members/page.tsx) ให้แยกสิทธิ์ระหว่างการดูข้อมูลกับการแก้ไข

พฤติกรรมใหม่:

1. owner เห็นปุ่ม ต่ออายุ และ เริ่มใหม่ ตามเดิม
2. non-owner เห็น banner ว่าเป็น read-only
3. non-owner จะไม่เห็นปุ่ม mutation

### 5. Trainers page is read-only for non-owner

ปรับ [src/app/(app)/trainers/page.tsx](src/app/(app)/trainers/page.tsx)

พฤติกรรมใหม่:

1. owner เห็นฟอร์มเพิ่มเทรนเนอร์
2. owner เห็น input/select/save สำหรับแก้ลูกเทรน
3. admin เข้าหน้าได้แบบ read-only
4. admin ไม่เห็นปุ่มเพิ่มเทรนเนอร์และปุ่มบันทึก
5. cashier ยังถูกกันออกจากหน้าด้วย role guard เดิม

### 6. Fixed existing members/special service gap discovered by build

ระหว่างตรวจ build พบว่า route สมาชิกพิเศษอ้างถึง createSpecialMember แต่ service ยังไม่มี export จริง ทำให้ build ล้ม

จึงเพิ่ม implementation ใน [src/features/operations/services.ts](src/features/operations/services.ts) เพื่อให้ route ทำงานจริงและ build ผ่าน

logic ที่เพิ่ม:

1. validate ชื่อสมาชิกและวันที่
2. หา membership product ที่ตรงชื่อและ period ก่อน
3. ถ้าไม่พบ จะสร้าง membership product พิเศษให้ผูกข้อมูลได้อย่างถูกต้อง
4. สร้าง member subscription พร้อม renewal_method = NONE

## Test Coverage Added or Updated

### Backend

อัปเดตหรือเพิ่มเทสต์ในไฟล์ต่อไปนี้:

1. [tests/backend/members-routes.test.ts](tests/backend/members-routes.test.ts)
2. [tests/backend/members-special-route.test.ts](tests/backend/members-special-route.test.ts)
3. [tests/backend/trainers-routes.test.ts](tests/backend/trainers-routes.test.ts)
4. [tests/backend/trainer-enrollment-route.test.ts](tests/backend/trainer-enrollment-route.test.ts)

สิ่งที่ยืนยัน:

1. owner ทำ renew member ได้
2. owner ทำ restart member ได้
3. admin ถูกปฏิเสธ renew member ด้วย 403
4. admin ถูกปฏิเสธ restart member ด้วย 403
5. owner สร้าง special member ได้
6. admin ถูกปฏิเสธ special member ด้วย 403
7. owner เพิ่มเทรนเนอร์ได้
8. admin และ cashier ถูกปฏิเสธเพิ่มเทรนเนอร์ด้วย 403
9. owner แก้ enrollment ได้
10. admin ถูกปฏิเสธแก้ enrollment ด้วย 403

### Frontend

อัปเดตหรือเพิ่มเทสต์ในไฟล์ต่อไปนี้:

1. [tests/frontend/members-page.test.tsx](tests/frontend/members-page.test.tsx)
2. [tests/frontend/trainers-page.test.tsx](tests/frontend/trainers-page.test.tsx)

สิ่งที่ยืนยัน:

1. non-owner เห็น members page แบบ read-only
2. non-owner ไม่เห็นปุ่มต่ออายุและเริ่มใหม่
3. admin เห็น trainers page แบบ read-only
4. admin ไม่เห็นปุ่มเพิ่มเทรนเนอร์และบันทึก

## Validation Runs

### Focused authorization suites

คำสั่ง:

npx vitest run tests/backend/members-routes.test.ts tests/backend/members-special-route.test.ts tests/backend/trainers-routes.test.ts tests/backend/trainer-enrollment-route.test.ts tests/frontend/members-page.test.tsx tests/frontend/trainers-page.test.tsx --reporter=verbose

ผล:

1. 6 test files ผ่าน
2. 29 tests ผ่าน

### Full test suite

คำสั่ง:

npm run test

ผล:

1. 30 test files ผ่าน
2. 157 tests ผ่าน

### Lint

คำสั่ง:

npm run lint

ผล:

1. ไม่มี error
2. เหลือ 2 warnings ที่เป็นของเดิมใน workspace

warning ที่ยังเหลือ:

1. [src/features/adapters/mock-app-adapter.ts](src/features/adapters/mock-app-adapter.ts) มี import RenewalMethod ที่ไม่ถูกใช้
2. [src/features/auth/auth-provider.tsx](src/features/auth/auth-provider.tsx) มี react-hooks/exhaustive-deps warning เรื่อง activeShift

### Production build

คำสั่ง:

npm run build

ผล:

1. build ผ่าน
2. route members/special และ trainers compile ผ่าน

## Scope Clarification

คำว่า เพิ่ม หรือ ลด ใน requirement นี้ ถูกปิดให้กับ mutation flow ที่มี implementation อยู่จริงในระบบปัจจุบันแล้ว

สิ่งที่ระบบรองรับหลังรอบนี้:

1. member renew
2. member restart
3. special member create ผ่าน API
4. trainer create
5. trainer enrollment update

สิ่งที่ยังไม่มี implementation จริงใน codebase ตอนนี้:

1. delete member
2. archive member
3. delete trainer
4. deactivate trainer จากหน้า trainers

ดังนั้นรอบนี้ไม่ได้เพิ่ม flow ลบใหม่ แต่ได้ล็อกสิทธิ์ทุก mutation point ที่มีอยู่จริงให้เป็น owner-only เรียบร้อยแล้ว

## Files Touched

### Application code

1. [src/lib/roles.ts](src/lib/roles.ts)
2. [src/app/api/v1/members/[memberId]/renew/route.ts](src/app/api/v1/members/[memberId]/renew/route.ts)
3. [src/app/api/v1/members/[memberId]/restart/route.ts](src/app/api/v1/members/[memberId]/restart/route.ts)
4. [src/app/api/v1/members/special/route.ts](src/app/api/v1/members/special/route.ts)
5. [src/app/api/v1/trainers/route.ts](src/app/api/v1/trainers/route.ts)
6. [src/app/api/v1/trainers/enrollments/[enrollmentId]/route.ts](src/app/api/v1/trainers/enrollments/[enrollmentId]/route.ts)
7. [src/app/(app)/members/page.tsx](src/app/(app)/members/page.tsx)
8. [src/app/(app)/trainers/page.tsx](src/app/(app)/trainers/page.tsx)
9. [src/features/operations/services.ts](src/features/operations/services.ts)
10. [src/features/adapters/mock-app-adapter.ts](src/features/adapters/mock-app-adapter.ts)

### Tests

1. [tests/backend/members-routes.test.ts](tests/backend/members-routes.test.ts)
2. [tests/backend/members-special-route.test.ts](tests/backend/members-special-route.test.ts)
3. [tests/backend/trainers-routes.test.ts](tests/backend/trainers-routes.test.ts)
4. [tests/backend/trainer-enrollment-route.test.ts](tests/backend/trainer-enrollment-route.test.ts)
5. [tests/frontend/members-page.test.tsx](tests/frontend/members-page.test.tsx)
6. [tests/frontend/trainers-page.test.tsx](tests/frontend/trainers-page.test.tsx)

## Final Status

สถานะงานรอบนี้: Completed

สรุปสั้น:

1. owner-only authorization สำหรับ member และ trainer mutation ใช้งานได้แล้ว
2. non-owner ถูกกันที่ทั้ง UI และ API
3. full test suite ผ่าน
4. build ผ่าน
5. มี lint warnings เก่า 2 จุด แต่ไม่มี lint error