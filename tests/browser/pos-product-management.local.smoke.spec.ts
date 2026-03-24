import { expect, test } from "@playwright/test";

const demoPassword = "demo1234";

async function loginAsOwner(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();

  await page.getByLabel("ชื่อผู้ใช้").fill("owner");
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
  await page.goto("/pos/products");
  await expect(page.getByRole("heading", { name: "ย้ายการจัดการสินค้าไปหน้าใหม่แบบตารางแยกหมวด" })).toBeVisible();
  await expect(page.getByText("กำลังโหลดรายการสินค้า...")).toHaveCount(0);
  await expect(page.getByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "เพิ่มสินค้าใหม่" }).first()).toBeVisible();
}

test.describe("POS product management localhost smoke", () => {
  test("owner can create and update a product from POS products page", async ({ page }) => {
    const uniqueSuffix = Date.now();
    const createdSku = `COFFEE-SMOKE-${uniqueSuffix}`;
    const createdName = `Smoke Latte ${uniqueSuffix}`;
    const updatedSku = `COFFEE-EDIT-${uniqueSuffix}`;
    const updatedName = `Smoke Latte Updated ${uniqueSuffix}`;

    await loginAsOwner(page);
    await ensureOpenShift(page);
    await openPosReady(page);

    await page.getByRole("button", { name: "เพิ่มสินค้าใหม่" }).first().click();
    await page.getByLabel("SKU").fill(createdSku);
    await page.getByLabel("ชื่อสินค้า").fill(createdName);
    await page.getByLabel("ราคา").fill("85");
    await page.getByLabel("สต็อกคงเหลือ").fill("12");
    await page.getByLabel("คำโปรยสินค้า").fill("Browser smoke create flow");
    await page.getByRole("button", { name: "สร้างสินค้าใหม่" }).click();

    await expect(page.getByText("เพิ่มสินค้าใหม่เรียบร้อยแล้ว")).toBeVisible();
    await page.getByLabel("ค้นหาสินค้า").fill(createdName);
    const createdRow = page.getByLabel(`Product row ${createdName}`);
    await expect(createdRow).toBeVisible();

    await createdRow.getByRole("button").first().click();
    await page.getByLabel("SKU").fill(updatedSku);
    await page.getByLabel("ชื่อสินค้า").fill(updatedName);
    await page.getByLabel("ราคา").fill("109");
    await page.getByLabel("คำโปรยสินค้า").fill("Browser smoke update flow");
    await page.getByRole("button", { name: "บันทึกสินค้า" }).click();

    await expect(page.getByText("อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว")).toBeVisible();

    await page.getByLabel("ค้นหาสินค้า").fill(updatedName);
    const productRow = page.getByLabel(`Product row ${updatedName}`);
  await expect(productRow).toBeVisible();
    await productRow.getByRole("button", { name: `เติมสินค้า ${updatedName}` }).click();

    const restockRow = page.getByLabel(`Restock row ${updatedName}`);
    await restockRow.getByLabel(`เติมเพิ่ม ${updatedName}`).fill("6");
    await restockRow.getByLabel(`หมายเหตุการเติมสินค้า ${updatedName}`).fill("Browser smoke inline restock flow");
    await restockRow.getByRole("button", { name: "บันทึกการเติมสินค้า" }).click();

    await expect(productRow).toContainText(updatedName);
    await expect(productRow).toContainText("18");
  });
});