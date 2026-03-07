# Mission Blueprint: project-scaffold-foundation
**Project:** fitnessLA | Phase 1: Environment Setup
**Date:** 2026-03-07 23:57
**Status:** ✅ Completed (Executed)
**Objective:** ตั้งโครงสร้างพื้นฐานของโปรเจกต์ (Next.js, Dependencies, Config) เพื่อเป็นจุดเริ่มต้นให้ Agent A และ B ทำงานต่อได้ทันที

---

## 🛠️ Execution Plan (Step-by-Step)

### Phase 1: Initialize Next.js (The Shell)
- [x] **Next.js Project Creation:** 
    - รัน `npx create-next-app@latest projects/fitnessLA --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [x] **Directory Re-organization:** 
    - ตรวจสอบย้ายหรือสร้างโฟลเดอร์ `tests/` ที่ Root ตามข้อตกลง

### Phase 2: Core Dependencies Installation
- [x] **Backend & Auth (Agent A's Tools):**
    - `npm install prisma @prisma/client zod better-auth`
- [x] **Frontend & UI (Agent B's Tools):**
    - `npm install jotai lucide-react clsx tailwind-merge shadcn-ui serwist`
- [x] **Testing Framework:**
    - `npm install -D vitest @testing-library/react @vitejs/plugin-react`

### Phase 3: Configuration & Environment
- [x] **Environment Template (`.env.example`):**
    - สร้างไฟล์ต้นแบบที่มี Key สำหรับ:
        - `DATABASE_URL` (Supabase Connect String)
        - `DIRECT_URL` (Supabase Direct Connect)
        - `BETTER_AUTH_SECRET`
        - `SUPABASE_PROJECT_URL` & `SUPABASE_ANON_KEY`
- [x] **Vitest Config:**
    - สร้าง `vitest.config.ts` ที่ Root เพื่อกำหนดโฟลเดอร์ `tests/`
- [x] **PWA (Serwist) Scaffold:** 
    - ตั้งค่า `next.config.js` เบื้องต้นเพื่อรองรับ PWA

### Phase 4: Verification (The Hard Gate)
- [x] **Build Check:** รัน `npm run build` เพื่อให้มั่นใจว่าโครงสร้างเริ่มต้นสมบูรณ์
- [x] **Sync Log:** บันทึกความเปลี่ยนแปลงลงใน [project_map.md](../project_map.md)

---

## 🛡️ User Confirmation Required
- [x] .env.example ครบถ้วนตามที่ต้องการ
- [x] ใช้โฟลเดอร์ `src/` ตามมาตรฐาน Next.js เรียบร้อย

---

**Before we proceed:**
- แผนนี้ครอบคลุมสิ่งที่คุณนนท์ต้องการเตรียมการให้ Agent A และ B หรือยังครับ?
- หากเรียบร้อย ผมจะเริ่มดำเนินการสร้างโครงสร้างนี้ทันทีครับ

Execution completed.
