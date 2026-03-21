import { expect, test } from "@playwright/test";

const password = process.env.FITNESSLA_SEED_PASSWORD ?? "ChangeMe123!";

async function loginAsOwner(page: Parameters<typeof test>[0]["page"]) {
  let lastBodyText = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();

    await page.getByLabel("ชื่อผู้ใช้").fill("owner");
    await page.getByLabel("รหัสผ่าน").fill(password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    try {
      await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
      return;
    } catch {
      lastBodyText = await page.locator("body").innerText();

      if (attempt === 3) {
        throw new Error(`Login failed for owner: ${lastBodyText.slice(0, 400)}`);
      }

      await page.waitForTimeout(2_000);
    }
  }
}

async function apiJson(page: Parameters<typeof test>[0]["page"], url: string, init?: RequestInit) {
  return page.evaluate(
    async ({ requestUrl, requestInit }) => {
      const response = await fetch(requestUrl, requestInit);
      const raw = await response.text();

      let body = null;
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
      }

      return {
        ok: response.ok,
        status: response.status,
        body,
      };
    },
    { requestUrl: url, requestInit: init },
  );
}

async function ensureActiveShift(page: Parameters<typeof test>[0]["page"]) {
  const active = await apiJson(page, "/api/v1/shifts/active");
  if (active.ok && active.body?.shift_id) {
    return String(active.body.shift_id);
  }

  const opened = await apiJson(page, "/api/v1/shifts/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ starting_cash: 500, responsible_name: "Owner Smoke" }),
  });

  expect(opened.status, JSON.stringify(opened.body)).toBe(201);
  return String(opened.body.shift_id);
}

async function openPosReady(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/pos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "เคาน์เตอร์ขาย LA GYM" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("กำลังโหลดสินค้า...")).toHaveCount(0);
  await expect(page.getByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "เพิ่มสินค้าใหม่" })).toBeVisible({ timeout: 15_000 });
}

test.describe("POS product management smoke", () => {
  test("owner can create and update a product from POS UI in real mode", async ({ page }) => {
    const uniqueSuffix = Date.now();
    const createdSku = `SMOKE-REAL-${uniqueSuffix}`;
    const createdName = `Real Smoke Product ${uniqueSuffix}`;
    const updatedSku = `SMOKE-EDIT-${uniqueSuffix}`;
    const updatedName = `Real Smoke Product Updated ${uniqueSuffix}`;

    await loginAsOwner(page);
    await ensureActiveShift(page);
    await openPosReady(page);

    await page.getByRole("button", { name: "เพิ่มสินค้าใหม่" }).click();
    await page.getByLabel("SKU").fill(createdSku);
    await page.getByLabel("ชื่อสินค้า").fill(createdName);
    await page.getByLabel("ราคา").fill("85");
    await page.getByLabel("สต็อกคงเหลือ").fill("12");
    await page.getByLabel("คำโปรยสินค้า").fill("Real-mode browser smoke create flow");
    await page.getByRole("button", { name: "สร้างสินค้าใหม่" }).click();

    await expect(page.getByText("เพิ่มสินค้าใหม่เรียบร้อยแล้ว")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("เลือกสินค้าเพื่อแก้ไข")).toContainText(createdName);

    const createProductsResponse = await apiJson(page, "/api/v1/products");
    expect(createProductsResponse.status, JSON.stringify(createProductsResponse.body)).toBe(200);
    const createdProduct = Array.isArray(createProductsResponse.body)
      ? createProductsResponse.body.find((candidate) => candidate.sku === createdSku)
      : null;
    expect(createdProduct).toBeTruthy();

    await page.getByRole("button", { name: "แก้ไขสินค้าเดิม" }).click();
    await page.getByLabel("เลือกสินค้าเพื่อแก้ไข").selectOption({ label: createdName });
    await page.getByLabel("SKU").fill(updatedSku);
    await page.getByLabel("ชื่อสินค้า").fill(updatedName);
    await page.getByLabel("ราคา").fill("109");
    await page.getByLabel("สต็อกคงเหลือ").fill("18");
    await page.getByLabel("คำโปรยสินค้า").fill("Real-mode browser smoke update flow");
    await page.getByRole("button", { name: "บันทึกสินค้า" }).click();

    await expect(page.getByText("อัปเดตสินค้าและ stock เรียบร้อยแล้ว")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("เลือกสินค้าเพื่อแก้ไข")).toContainText(updatedName);

    await page.getByLabel("Product search").fill(updatedName);
    await expect(page.getByRole("heading", { name: updatedName })).toBeVisible({ timeout: 20_000 });

    const updatedProductsResponse = await apiJson(page, "/api/v1/products");
    expect(updatedProductsResponse.status, JSON.stringify(updatedProductsResponse.body)).toBe(200);
    const updatedProduct = Array.isArray(updatedProductsResponse.body)
      ? updatedProductsResponse.body.find((candidate) => candidate.sku === updatedSku)
      : null;

    expect(updatedProduct).toBeTruthy();
    expect(updatedProduct.name).toBe(updatedName);
    expect(Number(updatedProduct.price)).toBe(109);
    expect(Number(updatedProduct.stock_on_hand)).toBe(18);
  });
});