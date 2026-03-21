import { expect, test } from "@playwright/test";

const demoPassword = "demo1234";

async function loginAsCashier(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();

  await page.getByLabel("ชื่อผู้ใช้").fill("cashier");
  await page.getByLabel("รหัสผ่าน").fill(demoPassword);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

async function ensureOpenShift(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/shift/open");
  await expect(page.getByRole("heading", { name: "เปิดกะ" })).toBeVisible();

  if (await page.getByText("ตอนนี้มีกะที่เปิดอยู่แล้ว").isVisible().catch(() => false)) {
    return;
  }

  await page.getByLabel("เงินทอนตั้งต้น").fill("500");
  await page.getByRole("button", { name: "ยืนยันเปิดกะ" }).click();

  await expect(page.getByText("ตอนนี้มีกะที่เปิดอยู่แล้ว")).toBeVisible();
}

async function openPosReady(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/pos");
  await expect(page.getByRole("heading", { name: "เคาน์เตอร์ขาย LA GYM" })).toBeVisible();
  await expect(page.getByText("กำลังโหลดสินค้า...")).toHaveCount(0);
  await expect(page.getByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "เพิ่มสินค้าใหม่" })).toBeVisible();
}

test.describe("POS product management localhost smoke", () => {
  test("cashier can create and update a product from POS", async ({ page }) => {
    const uniqueSuffix = Date.now();
    const createdSku = `COFFEE-SMOKE-${uniqueSuffix}`;
    const createdName = `Smoke Latte ${uniqueSuffix}`;
    const updatedSku = `COFFEE-EDIT-${uniqueSuffix}`;
    const updatedName = `Smoke Latte Updated ${uniqueSuffix}`;

    await loginAsCashier(page);
    await ensureOpenShift(page);
    await openPosReady(page);

    await page.getByRole("button", { name: "เพิ่มสินค้าใหม่" }).click();
    await page.getByLabel("SKU").fill(createdSku);
    await page.getByLabel("ชื่อสินค้า").fill(createdName);
    await page.getByLabel("ราคา").fill("85");
    await page.getByLabel("สต็อกคงเหลือ").fill("12");
    await page.getByLabel("คำโปรยสินค้า").fill("Browser smoke create flow");
    await page.getByRole("button", { name: "สร้างสินค้าใหม่" }).click();

    await expect(page.getByText("เพิ่มสินค้าใหม่เรียบร้อยแล้ว")).toBeVisible();
    await expect(page.getByLabel("เลือกสินค้าเพื่อแก้ไข")).toContainText(createdName);

    await page.getByRole("button", { name: "แก้ไขสินค้าเดิม" }).click();
    await page.getByLabel("เลือกสินค้าเพื่อแก้ไข").selectOption({ label: createdName });
    await page.getByLabel("SKU").fill(updatedSku);
    await page.getByLabel("ชื่อสินค้า").fill(updatedName);
    await page.getByLabel("ราคา").fill("109");
    await page.getByLabel("สต็อกคงเหลือ").fill("18");
    await page.getByLabel("คำโปรยสินค้า").fill("Browser smoke update flow");
    await page.getByRole("button", { name: "บันทึกสินค้า" }).click();

    await expect(page.getByText("อัปเดตสินค้าและ stock เรียบร้อยแล้ว")).toBeVisible();
    await expect(page.getByLabel("เลือกสินค้าเพื่อแก้ไข")).toContainText(updatedName);

    const inventoryRow = page.getByLabel(`Inventory ${updatedName}`);
    await expect(inventoryRow).toBeVisible();
    await expect(inventoryRow).toContainText(updatedName);
    await expect(inventoryRow).toContainText("18");

    await page.getByLabel("Product search").fill(updatedName);
    await expect(page.getByRole("heading", { name: updatedName })).toBeVisible();
  });
});