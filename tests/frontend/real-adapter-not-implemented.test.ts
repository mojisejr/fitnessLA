import { realAppAdapter } from "@/features/adapters/real-app-adapter";
import type { CreateProductInput, UpdateProductInput } from "@/features/adapters/types";

/**
 * Phase 3: notImplemented Surface Tests
 *
 * Goal: ยืนยันว่า methods ที่ยังไม่ได้ implement ใน real adapter
 * throw `{ code: "NOT_IMPLEMENTED" }` อย่าง predictable — ไม่ crash silently
 * และ UI สามารถ catch + แสดง user-friendly error ได้
 */
describe("real-app-adapter — notImplemented surface", () => {
  const DUMMY_PRODUCT_INPUT: CreateProductInput = {
    sku: "SKU-001",
    name: "Test Product",
    price: 100,
    productType: "GOODS",
    stockOnHand: null,
  };

  const DUMMY_UPDATE_INPUT: UpdateProductInput = {
    productId: "42",
    sku: "SKU-001",
    name: "Updated Product",
    price: 120,
    stockOnHand: 10,
  };

  it("3-1: createProduct throws NOT_IMPLEMENTED", async () => {
    await expect(
      realAppAdapter.createProduct(DUMMY_PRODUCT_INPUT),
    ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
  });

  it("3-2: updateProduct throws NOT_IMPLEMENTED", async () => {
    await expect(
      realAppAdapter.updateProduct(DUMMY_UPDATE_INPUT),
    ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
  });

  it("3-3: getShiftInventorySummary throws NOT_IMPLEMENTED", async () => {
    await expect(
      realAppAdapter.getShiftInventorySummary("701"),
    ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
  });

});
