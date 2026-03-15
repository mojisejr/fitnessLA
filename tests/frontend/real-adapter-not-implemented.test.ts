import { realAppAdapter } from "@/features/adapters/real-app-adapter";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * Phase 3: Real Adapter Shift Inventory Summary
 *
 * Goal: ยืนยันว่า `getShiftInventorySummary()` เรียก backend endpoint จริง
 * และส่งต่อ payload/error shape แบบ deterministic
 */
describe("real-app-adapter — shift inventory summary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns rows from backend endpoint", async () => {
    const payload = [
      {
        product_id: "prod_water",
        sku: "WATER-001",
        name: "Mineral Water",
        opening_stock: 3,
        sold_quantity: 3,
        remaining_stock: 0,
      },
    ];

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await realAppAdapter.getShiftInventorySummary("701");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/shifts/701/inventory-summary",
      expect.objectContaining({
        credentials: "include",
      }),
    );
    expect(result).toEqual(payload);
  });

  it("passes backend error body through for UI handling", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "SHIFT_OWNER_MISMATCH",
          message: "ไม่มีสิทธิ์เข้าถึงสรุปสินค้าในกะนี้",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(realAppAdapter.getShiftInventorySummary("shift_2")).rejects.toMatchObject({
      code: "SHIFT_OWNER_MISMATCH",
    });
  });
});
