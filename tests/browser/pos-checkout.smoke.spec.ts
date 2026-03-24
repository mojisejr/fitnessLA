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
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await page.evaluate(
        async ({ url: requestUrl, init: requestInit }) => {
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
        { url, init },
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
    body: JSON.stringify({ starting_cash: 500 }),
  });

  expect(opened.status, JSON.stringify(opened.body)).toBe(201);
  return String(opened.body.shift_id);
}

async function openPosReady(page: Parameters<typeof test>[0]["page"]) {
  let lastBodyText = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/pos");

    try {
      await expect(page.getByRole("heading", { name: "เคาน์เตอร์ขาย LA GYM" })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("กำลังโหลดสินค้า...")).toHaveCount(0);
      await expect(page.getByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).toHaveCount(0);
      await expect(page.getByPlaceholder("ค้นหาจากชื่อเมนู รหัสสินค้า หรือหมวดขาย")).toBeVisible({ timeout: 20_000 });
      return;
    } catch {
      lastBodyText = await page.locator("body").innerText();

      if (lastBodyText.includes("กรุณาเข้าสู่ระบบก่อนใช้งาน")) {
        await loginAsOwner(page);
      }

      if (attempt === 3) {
        throw new Error(`POS page did not become ready: ${lastBodyText.slice(0, 400)}`);
      }

      await page.waitForTimeout(2_000);
    }
  }
}

function pickProduct(products: Array<Record<string, unknown>>, preferredSkus: string[]) {
  for (const sku of preferredSkus) {
    const product = products.find((candidate) => candidate.sku === sku);
    if (product) {
      return product;
    }
  }

  throw new Error(`Missing product for any of: ${preferredSkus.join(", ")}`);
}

test.describe("POS checkout smoke", () => {
  test("owner can create a mixed POS sale and see the member record", async ({ page }) => {
    await loginAsOwner(page);
    await expect(page.getByRole("link", { name: "POS เปิด", exact: true })).toBeVisible({ timeout: 15_000 });

    await expect.poll(async () => {
      const sessionResponse = await apiJson(page, "/api/auth/session");
      return sessionResponse.status;
    }).toBe(200);

    const shiftId = await ensureActiveShift(page);

    const [productsResponse, trainersResponse] = await Promise.all([
      apiJson(page, "/api/v1/products"),
      apiJson(page, "/api/v1/trainers"),
    ]);

    expect(productsResponse.status, JSON.stringify(productsResponse.body)).toBe(200);
    expect(trainersResponse.status, JSON.stringify(trainersResponse.body)).toBe(200);

    const products = Array.isArray(productsResponse.body) ? productsResponse.body : [];
    const trainers = Array.isArray(trainersResponse.body) ? trainersResponse.body : [];
    const trainer = trainers.find((candidate) => candidate.is_active);

    expect(trainer).toBeTruthy();

    const snack = pickProduct(products, ["SHAKE-01", "SNK-001", "FOOD-01"]);
    const coffee = pickProduct(products, ["COFFEE-02", "COFFEE-01", "FOOD-02"]);
    const membership = pickProduct(products, ["MEM-MONTH", "MEM-001"]);
    const training = pickProduct(products, ["PT-10", "PT-001", "PT-01"]);

    const customerName = `POS Smoke ${Date.now()}`;
    const orderResponse = await apiJson(page, "/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shift_id: shiftId,
        items: [
          { product_id: snack.product_id, quantity: 1 },
          { product_id: coffee.product_id, quantity: 1 },
          { product_id: membership.product_id, quantity: 1 },
          { product_id: training.product_id, quantity: 1, trainer_id: trainer.trainer_id },
        ],
        payment_method: "CASH",
        customer_info: { name: customerName },
      }),
    });

    expect(orderResponse.status, JSON.stringify(orderResponse.body)).toBe(201);
    expect(orderResponse.body?.status).toBe("COMPLETED");
    expect(Number(orderResponse.body?.total_amount)).toBeGreaterThan(0);
    expect(String(orderResponse.body?.order_number ?? "")).toMatch(/^ORD-/);
    expect(String(orderResponse.body?.tax_doc_number ?? "")).toMatch(/^INV-/);

    const today = new Date().toISOString().slice(0, 10);
    const dailySummaryResponse = await apiJson(page, `/api/v1/reports/daily-summary?period=DAY&date=${today}`);
    expect(dailySummaryResponse.status, JSON.stringify(dailySummaryResponse.body)).toBe(200);

    const salesRows = Array.isArray(dailySummaryResponse.body?.sales_rows)
      ? dailySummaryResponse.body.sales_rows
      : [];
    const createdSale = salesRows.find(
      (candidate) => candidate.order_number === orderResponse.body?.order_number && candidate.customer_name === customerName,
    );

    expect(createdSale).toBeTruthy();
    expect(Number(createdSale?.total_amount)).toBe(Number(orderResponse.body?.total_amount));
  });

  test("owner can sell membership from POS UI and members page shows the new member", async ({ page }) => {
    await loginAsOwner(page);

    await expect.poll(async () => {
      const sessionResponse = await apiJson(page, "/api/auth/session");
      return sessionResponse.status;
    }).toBe(200);

    await ensureActiveShift(page);
    await openPosReady(page);

    const customerName = `UI Member ${Date.now()}`;
    const searchInput = page.getByPlaceholder("ค้นหาจากชื่อเมนู รหัสสินค้า หรือหมวดขาย");
    await searchInput.fill("Membership");

    const productTitle = page.getByRole("button", { name: /Monthly Membership|สมาชิก 1 เดือน/ }).first();
    await expect(productTitle).toBeVisible({ timeout: 15_000 });
    const productCard = page.locator("article").filter({ has: productTitle }).first();
    await productCard.getByRole("button", { name: "เพิ่มลงบิล" }).click();

    await page.getByPlaceholder("ชื่อลูกค้าสมาชิก").fill(customerName);
    await page.getByRole("button", { name: "คิดเงิน" }).click();
    await page.getByRole("button", { name: "ยืนยันการคิดเงิน" }).click();

    await expect(page.getByText("คิดเงินสำเร็จ")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(customerName)).toHaveCount(0);

    await page.getByRole("link", { name: "สมาชิก เปิด" }).click();
    await expect(page).toHaveURL(/\/members$/);
    await expect(page.getByText("สมาชิกและวันหมดอายุ")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("ไม่สามารถโหลดข้อมูลสมาชิกได้")).toHaveCount(0);
    await expect(page.getByText(customerName)).toBeVisible({ timeout: 20_000 });
  });
});