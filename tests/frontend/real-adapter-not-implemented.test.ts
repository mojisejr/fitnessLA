import { realAppAdapter } from "@/features/adapters/real-app-adapter";

/**
 * Phase 3: notImplemented Surface Tests
 *
 * Goal: ยืนยันว่า methods ที่ยังไม่ได้ implement ใน real adapter
 * throw `{ code: "NOT_IMPLEMENTED" }` อย่าง predictable — ไม่ crash silently
 * และ UI สามารถ catch + แสดง user-friendly error ได้
 */
describe("real-app-adapter — notImplemented surface", () => {
  it("3-1: getShiftInventorySummary throws NOT_IMPLEMENTED", async () => {
    await expect(
      realAppAdapter.getShiftInventorySummary("701"),
    ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
  });

});
