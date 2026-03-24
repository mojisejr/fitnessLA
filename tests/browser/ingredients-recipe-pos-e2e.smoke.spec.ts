import { expect, test } from "@playwright/test";

const password = process.env.FITNESSLA_SEED_PASSWORD ?? "ChangeMe123!";
const ownerFullName = "Owner FitnessLA";

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
      await expect.poll(async () => {
        const sessionResponse = await apiJson(page, "/api/auth/session");
        return sessionResponse.status;
      }).toBe(200);
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
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await page.evaluate(
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
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Failed to fetch") || attempt === 3) {
        throw error;
      }

      await page.waitForTimeout(1_500);
    }
  }

  throw new Error(`Failed to fetch ${url}`);
}

async function ensureActiveShift(page: Parameters<typeof test>[0]["page"]) {
  const active = await apiJson(page, "/api/v1/shifts/active");
  if (active.ok && active.body?.shift_id) {
    return String(active.body.shift_id);
  }

  const opened = await apiJson(page, "/api/v1/shifts/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ starting_cash: 500, responsible_name: ownerFullName }),
  });

  expect(opened.status, JSON.stringify(opened.body)).toBe(201);
  return String(opened.body.shift_id);
}

async function openProductsReady(page: Parameters<typeof test>[0]["page"]) {
  let lastBodyText = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/pos/products", { waitUntil: "domcontentloaded" });

    try {
      await expect(page.getByRole("heading", { name: "ย้ายการจัดการสินค้าไปหน้าใหม่แบบตารางแยกหมวด" })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("กำลังโหลดรายการสินค้า...")).toHaveCount(0);
      await expect(page.getByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).toHaveCount(0);
      return;
    } catch {
      lastBodyText = await page.locator("body").innerText();

      if (lastBodyText.includes("กรุณาเข้าสู่ระบบก่อนใช้งาน")) {
        await loginAsOwner(page);
      }

      if (attempt === 3) {
        throw new Error(`POS products page did not become ready: ${lastBodyText.slice(0, 400)}`);
      }

      await page.waitForTimeout(2_000);
    }
  }
}

async function openPosReady(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/pos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "เคาน์เตอร์ขาย LA GYM" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("กำลังโหลดสินค้า...")).toHaveCount(0);
}

function getProductEditorSection(page: Parameters<typeof test>[0]["page"]) {
  return page.locator("section").filter({ hasText: "แก้ไขสินค้าที่เลือก" }).first();
}

function getIngredientSection(page: Parameters<typeof test>[0]["page"]) {
  return page.locator("section").filter({ hasText: "คลังวัตถุดิบ" }).first();
}

function getRecipeSection(page: Parameters<typeof test>[0]["page"]) {
  return page.locator("section").filter({ hasText: "สูตรต้นทุนต่อหน่วยขาย" }).first();
}

test.describe("ingredient recipe POS e2e smoke", () => {
  test("owner can add ingredient, assign recipe, and sell the product from POS", async ({ page }) => {
    const uniqueSuffix = Date.now();
    const ingredientName = `Matcha Powder ${uniqueSuffix}`;
    const productSku = `MATCHA-SMOKE-${uniqueSuffix}`;
    const productName = `Matcha Smoke ${uniqueSuffix}`;

    await loginAsOwner(page);
    await ensureActiveShift(page);
    await openProductsReady(page);

    const ingredientSection = getIngredientSection(page);
    await ingredientSection.scrollIntoViewIfNeeded();
    await expect(ingredientSection.getByLabel("ชื่อวัตถุดิบ")).toBeVisible({ timeout: 20_000 });
    await ingredientSection.getByLabel("ชื่อวัตถุดิบ").fill(ingredientName);
    await ingredientSection.getByLabel("หน่วยวัตถุดิบ").selectOption("G");
    await ingredientSection.getByLabel("ปริมาณที่ซื้อ").fill("500");
    await ingredientSection.getByLabel("ราคาซื้อรวม").fill("450");
    await ingredientSection.getByLabel("หมายเหตุวัตถุดิบ").fill("Local smoke matcha batch");
    await ingredientSection.getByRole("button", { name: "เพิ่มวัตถุดิบ", exact: true }).click();
    await expect(ingredientSection.getByText(ingredientName)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "เพิ่มสินค้าใหม่" }).first().click();
    const productEditorSection = getProductEditorSection(page);
    await expect(productEditorSection.getByLabel("SKU")).toBeVisible({ timeout: 20_000 });
    await productEditorSection.getByLabel("SKU").fill(productSku);
    await productEditorSection.getByLabel("ชื่อสินค้า").fill(productName);
    await productEditorSection.getByLabel("ราคา", { exact: true }).fill("120");
    await productEditorSection.getByLabel("สต็อกคงเหลือ").fill("10");
    await productEditorSection.getByLabel("คำโปรยสินค้า").fill("Ingredient recipe smoke product");
    await productEditorSection.getByLabel("หมวดขาย POS").selectOption("COFFEE");
    await productEditorSection.getByRole("button", { name: "สร้างสินค้าใหม่" }).click();

    await expect(page.getByText("เพิ่มสินค้าใหม่เรียบร้อยแล้ว")).toBeVisible({ timeout: 20_000 });

    const recipeSection = getRecipeSection(page);
    await recipeSection.scrollIntoViewIfNeeded();
    await recipeSection.getByRole("button", { name: "เพิ่มวัตถุดิบในสูตร" }).click();
    const ingredientSelect = recipeSection.getByLabel("วัตถุดิบสูตร 1");
    const createdIngredientValue = await ingredientSelect.evaluate((select, name) => {
      const option = Array.from(select.options).find((candidate) => candidate.text.includes(name));
      return option?.value ?? "";
    }, ingredientName);
    expect(createdIngredientValue).not.toBe("");
    await ingredientSelect.selectOption(createdIngredientValue);
    await recipeSection.getByLabel("ปริมาณสูตร 1").fill("15");
    await recipeSection.getByRole("button", { name: "บันทึกสูตรสินค้า" }).click();

    await expect(page.getByText("บันทึกสูตรสินค้าเรียบร้อยแล้ว")).toBeVisible({ timeout: 20_000 });
    await expect(recipeSection.getByText("฿13.50").first()).toBeVisible({ timeout: 20_000 });

    const productsResponse = await apiJson(page, "/api/v1/products");
    expect(productsResponse.status, JSON.stringify(productsResponse.body)).toBe(200);
    const createdProduct = Array.isArray(productsResponse.body)
      ? productsResponse.body.find((candidate) => candidate.sku === productSku)
      : null;
    expect(createdProduct).toBeTruthy();
    expect(Number(createdProduct.recipe_total_cost)).toBe(13.5);
    expect(Number(createdProduct.recipe_item_count)).toBe(1);

    const recipeResponse = await apiJson(page, `/api/v1/products/${createdProduct.product_id}/recipe`);
    expect(recipeResponse.status, JSON.stringify(recipeResponse.body)).toBe(200);
    expect(Number(recipeResponse.body.total_cost)).toBe(13.5);
    expect(Array.isArray(recipeResponse.body.items)).toBe(true);
    expect(recipeResponse.body.items[0].ingredient_name).toBe(ingredientName);

    await openPosReady(page);
    await page.getByPlaceholder("ค้นหาจากชื่อเมนู รหัสสินค้า หรือหมวดขาย").fill(productName);

    const productCard = page.locator("article").filter({ hasText: productName }).first();
    await expect(productCard).toBeVisible({ timeout: 20_000 });
    await productCard.getByRole("button", { name: "เพิ่มลงบิล" }).click();

    await page.getByRole("button", { name: "คิดเงิน" }).click();
    await page.getByRole("button", { name: "ยืนยันการคิดเงิน" }).click();

    await expect(page.getByText("คิดเงินสำเร็จ")).toBeVisible({ timeout: 20_000 });

    const refreshedProductsResponse = await apiJson(page, "/api/v1/products");
    expect(refreshedProductsResponse.status, JSON.stringify(refreshedProductsResponse.body)).toBe(200);
    const soldProduct = Array.isArray(refreshedProductsResponse.body)
      ? refreshedProductsResponse.body.find((candidate) => candidate.sku === productSku)
      : null;

    expect(soldProduct).toBeTruthy();
    expect(Number(soldProduct.stock_on_hand)).toBe(9);
    expect(Number(soldProduct.recipe_total_cost)).toBe(13.5);
  });
});