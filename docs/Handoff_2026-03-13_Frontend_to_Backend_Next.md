# Handoff 2026-03-13: Frontend To Backend Next Steps

## Context

frontend ปิดงาน integration หลักของ Phase 2 ฝั่ง UI แล้ว เหลืองานที่ต้องอาศัย environment จริง, seed จริง, และการยืนยัน behavior ด้วยข้อมูลจริงในระบบ

สิ่งที่ frontend ยืนยันแล้ว:

- หน้า GL ดาวน์โหลด CSV ตาม contract `GET /api/v1/reports/gl?start_date=...&end_date=...` แล้ว
- Product create/update ส่ง `revenue_account_id` ผ่าน flow ของ adapter แล้ว
- หน้า COA handle `ACCOUNT_LOCKED`, `401`, `403` ชัดขึ้น และเปิดให้ `OWNER` กับ `ADMIN`
- เส้นทาง runtime จริงยังใช้ `real-app-adapter` เมื่อกำหนด `NEXT_PUBLIC_APP_ADAPTER=real`

## What Backend Should Take Next

1. เตรียมฐานข้อมูลหรือ seed data สำหรับ real mode ให้พร้อมรัน smoke test
2. ยืนยันว่า COA dataset มีบัญชี `REVENUE` ที่ active และเหมาะกับ product mapping ที่หน้าร้านจะใช้จริง
3. ยืนยันว่า product master จริงมีข้อมูลครบสำหรับการขายจริง หรือเตรียม seed ที่สะท้อน catalog ที่ต้องการใช้ในหน้าร้าน
4. จัด account สำหรับ smoke test อย่างน้อย `OWNER` หรือ `ADMIN` ที่ login ได้จริง
5. ช่วยตรวจ output ของ General Ledger CSV บนรายการขายจริงว่า debit/credit สมดุลและแยก account ตาม product mapping ถูกต้อง

## Requested Backend Deliverables

1. `.env` หรือค่าจริงที่จำเป็นสำหรับ local real mode
2. ฐานข้อมูลที่ migrate แล้วและพร้อมให้ `npm run db:seed:real-mode`
3. รายการบัญชีรายได้จริงที่ต้องการให้ product ผูกใช้งาน
4. product dataset จริงหรือ script seed เพิ่มเติม ถ้าต้องการให้ POS หน้าร้านสะท้อนรายการขายล่าสุด
5. ผลยืนยันว่า CSV ที่ backend ส่งออกบนข้อมูลจริงถูกต้องเชิงบัญชี

## Notes About Mock Preview

- การขยาย mock catalog รอบนี้ทำเพื่อ preview หน้า POS และคุย UI กับธุรกิจเท่านั้น
- frontend ไม่ได้ล็อก production path ไว้กับ mock data
- เมื่อรันด้วย `NEXT_PUBLIC_APP_ADAPTER=real` หน้าเดิมจะกลับไปอ่านข้อมูลจาก backend จริงตาม adapter เดิม

## Verification Sequence After Backend Ready

1. ตั้ง `.env` ตาม `docs/Local_Real_Mode_Runbook.md`
2. รัน `npm run db:seed:real-mode`
3. เปิดแอปด้วย `NEXT_PUBLIC_APP_ADAPTER=real`
4. ทำตาม `docs/Phase_G_Smoke_Checklist.md`
5. ถ้ามี mismatch ให้แยกว่าเป็น data issue, seed issue, หรือ UI issue แล้วส่งกลับพร้อม request/response ที่เกี่ยวข้อง