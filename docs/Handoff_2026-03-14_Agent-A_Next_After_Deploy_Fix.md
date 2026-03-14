# Handoff 2026-03-14: Agent A Next After Deploy Fix

## Context

รอบนี้มีงาน 2 ก้อนที่ต้องล็อกสถานะให้ Agent A รับต่อได้ไว:

1. frontend/integration ฝั่ง shift, expenses, reports เดินต่อจนใช้งานและทดสอบได้มากขึ้นแล้ว
2. มี deploy blocker บน Vercel จาก mock contract mismatch และถูกแก้เรียบร้อยแล้วบน `staging`

## What Was Done Already

### 1. Deploy blocker ถูกแก้แล้ว

- สาเหตุ: `src/lib/mock-api.ts` คืน `DailySummary` ไม่ครบ contract เพราะขาด `shift_rows`
- ผลกระทบ: `npm run build` fail บน Vercel ที่ขั้น TypeScript
- วิธีแก้: เพิ่ม `buildMockDailyShiftRows()` และให้ `fetchMockDailySummary()` คืน `shift_rows` ครบตาม `DailySummary`
- สถานะ: push แล้วบน `staging`
- Commit ล่าสุดของงานนี้: `c975038` (`fix mock daily summary shift rows`)

### 2. งาน frontend/integration ที่ปิดไปก่อนหน้านี้

- หน้า POS ปรับ layout และ search ให้ใช้งานกับข้อมูลที่ผู้ใช้เห็นจริงมากขึ้น
- หน้า close-shift เปลี่ยนส่วนล่างเป็นรายการขายจริงของกะ
- flow open shift, close shift, daily summary, shift summary รองรับ `responsible_name`
- หน้า shift summary ใช้ daily summary เป็นฐานและแสดงเงินสดเกิน/ขาดจาก `shift_rows`
- หน้า expenses ใน mock mode กลับมาบันทึกได้ และมี regression test ครอบ flow หลัก
- COA/Product/GL export integration ฝั่ง UI ต่อกับ real adapter ไปแล้วตาม contract ก่อนหน้า

## Current Verified State

- `npm run build` ผ่านใน local หลังแก้ deploy blocker
- branch ที่ push ล่าสุดคือ `staging`
- Vercel error ตัวล่าสุดเรื่อง `DailySummary.shift_rows` ควรหายแล้วเมื่อ redeploy

## What Agent A Should Do Next

1. Persist `responsible_name` ลงฐานข้อมูล `Shift` จริง
   - เพิ่ม field ใน Prisma schema
   - สร้าง migration
   - ปรับ service/route ที่เปิดกะ ปิดกะ และรายงานให้ดึงจาก DB จริง

2. เปิด endpoint รายงาน `shift summary` แบบตรงตัว
   - ตอนนี้ UI ฝั่ง shift summary ยังประกอบจาก `daily summary`
   - ถ้าจะให้รายงานกะละเอียดและเสถียรกว่าเดิม ควรมี endpoint ที่คืน closed shifts พร้อมยอด expected cash, actual cash, difference, responsible person, และรายการขายต่อกะ

3. ตรวจ real-mode readiness ของ expenses และ COA
   - ยืนยันว่า environment จริงมี expense accounts ที่ `ACTIVE`
   - ยืนยันว่า owner/admin account สำหรับ smoke test ใช้งานได้จริง
   - ถ้า dataset จริงยังไม่พร้อม ให้เตรียม seed หรือ runbook ที่ชัดเจน

4. ตรวจ production/runtime config ที่ไม่ใช่ blocker แต่ควรแก้
   - `BETTER_AUTH_SECRET` ปัจจุบันมี warning ว่ายาวไม่พอหรือ entropy ต่ำ
   - ควรเปลี่ยนเป็น secret แบบสุ่มจริงยาวอย่างน้อย 32 ตัวอักษรสำหรับ production

## Notes For Fast Continuation

- ห้ามลบหรือ rename field ใน contract `DailySummary` โดยไม่อัปเดตทั้ง mock, adapter, และ report pages พร้อมกัน
- จุดที่เพิ่งชน deploy คือ mock layer ไม่ใช่ backend route จริง เพราะฉะนั้นเวลาปรับ contract ให้ตรวจทั้ง `src/lib/contracts.ts`, `src/lib/mock-api.ts`, `src/lib/mock-data.ts`, และ adapter ที่เกี่ยวข้องพร้อมกัน
- ถ้าจะรับช่วงงาน shift summary ต่อ ให้เริ่มจากการนิยาม DTO/response shape ใน `docs/API_Contract.md` ก่อน แล้วค่อยลง service/route

## Suggested Validation After Agent A Changes

1. `npm run build`
2. `npx vitest run`
3. smoke test เปิดกะ, ขาย, ลงรายจ่าย, ปิดกะ, ดูรายงาน shift summary ใน `NEXT_PUBLIC_APP_ADAPTER=real`
