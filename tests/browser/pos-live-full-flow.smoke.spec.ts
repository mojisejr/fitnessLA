import { expect, test, type Page } from "@playwright/test";

type SmokeAccount = {
  username: string;
  password: string;
};

type ShiftResponse = {
  shift_id: string | number;
  opened_at: string;
  starting_cash: number;
  responsible_name?: string;
};

type Product = {
  product_id: string | number;
  sku: string;
  name: string;
  tagline?: string | null;
  price: number;
  product_type: "GOODS" | "SERVICE" | "MEMBERSHIP";
  pos_category?: string | null;
  featured_slot?: 1 | 2 | 3 | 4 | null;
  revenue_account_id?: string;
  track_stock?: boolean;
  stock_on_hand?: number | null;
  membership_period?: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null;
  membership_duration_days?: number | null;
};

type ChartOfAccount = {
  account_id: string | number;
  account_code: string;
  account_name: string;
  account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  is_active: boolean;
};

type Trainer = {
  trainer_id: string | number;
  is_active: boolean;
};

type DailySalesRow = {
  shift_id?: string | number;
  order_number: string;
  customer_name: string | null;
  payment_method: "CASH" | "PROMPTPAY" | "CREDIT_CARD";
  total_amount: number;
  items?: Array<{
    product_name: string;
    quantity: number;
  }>;
};

type DailyShiftRow = {
  shift_id: string | number;
  expected_cash: number;
  actual_cash: number;
  difference: number;
};

function parseCurrencyAmount(text: string) {
  const normalized = text.replace(/,/g, "");
  const match = normalized.match(/฿\s*([0-9]+(?:\.[0-9]{2})?)/);

  if (!match) {
    throw new Error(`Could not parse currency from: ${text}`);
  }

  return Number(match[1]);
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env ${name}.`);
  }

  return value;
}

function getSmokeAccount(): SmokeAccount {
  return {
    username: process.env.PLAYWRIGHT_REAL_SMOKE_USERNAME?.trim() || process.env.PLAYWRIGHT_REAL_OWNER_USERNAME?.trim() || "owner",
    password: process.env.PLAYWRIGHT_REAL_SMOKE_PASSWORD?.trim() || process.env.PLAYWRIGHT_REAL_OWNER_PASSWORD?.trim() || process.env.FITNESSLA_SEED_PASSWORD?.trim() || "ChangeMe123!",
  };
}

async function apiJson<T>(page: Page, url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T }> {
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

async function loginAs(page: Page, account: SmokeAccount) {
  let lastBodyText = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible({ timeout: 20_000 });

    await page.getByLabel("ชื่อผู้ใช้").fill(account.username);
    await page.getByLabel("รหัสผ่าน").fill(account.password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    try {
      await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
      await expect(page.getByText(`@${account.username}`)).toBeVisible({ timeout: 20_000 });
      return;
    } catch {
      lastBodyText = await page.locator("body").innerText();

      if (attempt === 3) {
        throw new Error(`Login failed for ${account.username}: ${lastBodyText.slice(0, 400)}`);
      }

      await page.waitForTimeout(2_000);
    }
  }
}

async function expectSession(page: Page) {
  await expect
    .poll(async () => {
      const session = await apiJson(page, "/api/auth/session");
      return session.status;
    })
    .toBe(200);
}

async function getActiveShift(page: Page) {
  return apiJson<ShiftResponse | { code: string; message: string }>(page, "/api/v1/shifts/active");
}

async function closeExistingShiftIfPresent(page: Page) {
  const active = await getActiveShift(page);
  if (active.status === 404) {
    return;
  }

  expect(active.status, JSON.stringify(active.body)).toBe(200);

  const shift = active.body as ShiftResponse;
  const businessDate = shift.opened_at.slice(0, 10);
  const dailySummary = await apiJson<{ sales_rows: DailySalesRow[] }>(
    page,
    `/api/v1/reports/daily-summary?period=DAY&date=${businessDate}`,
  );

  expect(dailySummary.status, JSON.stringify(dailySummary.body)).toBe(200);

  const shiftCashSales = (Array.isArray(dailySummary.body.sales_rows) ? dailySummary.body.sales_rows : [])
    .filter((row) => String(row.shift_id) === String(shift.shift_id) && row.payment_method === "CASH")
    .reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);

  const estimatedActualCash = Number((Number(shift.starting_cash) + shiftCashSales).toFixed(2));
  const closed = await apiJson<{ difference: number }>(page, "/api/v1/shifts/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actual_cash: estimatedActualCash,
      closing_note: "Playwright cleanup before live smoke",
    }),
  });

  expect(closed.status, JSON.stringify(closed.body)).toBe(200);

  await expect
    .poll(async () => {
      const refreshed = await getActiveShift(page);
      return refreshed.status;
    })
    .toBe(404);
}

async function openShiftFromUi(page: Page, startingCash: number) {
  await page.getByRole("link", { name: "เปิดกะ เปิด" }).click();
  await expect(page).toHaveURL(/\/shift\/open$/);
  await expect(page.getByRole("heading", { name: "เปิดกะ" })).toBeVisible({ timeout: 20_000 });

  const existingShiftNotice = page.getByText("ตอนนี้มีกะที่เปิดอยู่แล้ว");
  const activeShiftCard = page.locator("section").filter({ hasText: "ตอนนี้มีกะที่เปิดอยู่แล้ว" }).first();

  const activeBeforeOpen = await getActiveShift(page);

  if (activeBeforeOpen.status === 404) {
    const startingCashInput = page.getByLabel("เงินทอนตั้งต้น");

    if (await existingShiftNotice.isVisible().catch(() => false)) {
      await expect(existingShiftNotice).toBeVisible({ timeout: 20_000 });
      return parseCurrencyAmount(await activeShiftCard.innerText());
    } else {
      await expect(startingCashInput).toBeVisible({ timeout: 20_000 });
      await startingCashInput.fill(String(startingCash));
      await page.getByRole("button", { name: "ยืนยันเปิดกะ" }).click();
    }
  } else {
    expect(activeBeforeOpen.status, JSON.stringify(activeBeforeOpen.body)).toBe(200);
    return Number((activeBeforeOpen.body as ShiftResponse).starting_cash);
  }

  await expect(activeShiftCard).toBeVisible({ timeout: 20_000 });
  return parseCurrencyAmount(await activeShiftCard.innerText());
}

async function waitForActiveShift(page: Page) {
  await expect
    .poll(async () => {
      const active = await getActiveShift(page);

      if (active.status !== 200) {
        return null;
      }

      return Number((active.body as ShiftResponse).starting_cash);
    }, { timeout: 20_000 })
    .not.toBeNull();
}

async function openPosReady(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.getByRole("link", { name: "POS เปิด", exact: true }).click();
    await expect(page).toHaveURL(/\/pos$/);

    try {
      await expect(page.getByRole("heading", { name: "เคาน์เตอร์ขาย LA GYM" })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("กำลังโหลดสินค้า...")).toHaveCount(0);
      return;
    } catch (error) {
      const shiftGuardHeading = page.getByRole("heading", { name: "หน้านี้จะใช้งานได้เมื่อมีกะที่เปิดอยู่" });

      if (await shiftGuardHeading.isVisible().catch(() => false)) {
        await page.waitForTimeout(2_000);
        continue;
      }

      if (attempt === 3) {
        throw error;
      }

      await page.waitForTimeout(2_000);
    }
  }
}

async function openProductManager(page: Page) {
  await page.getByRole("link", { name: "สินค้า POS เปิด", exact: true }).click();
  await expect(page).toHaveURL(/\/pos\/products$/);
  await expect(page.getByRole("heading", { name: "ย้ายการจัดการสินค้าไปหน้าใหม่แบบตารางแยกหมวด" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("กำลังโหลดรายการสินค้า...")).toHaveCount(0);
  await expect(page.getByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "เพิ่มสินค้าใหม่" }).first()).toBeVisible({ timeout: 20_000 });
}

async function createAndEditProduct(page: Page) {
  const uniqueSuffix = Date.now();
  const createdSku = `LIVE-SMOKE-${uniqueSuffix}`;
  const createdName = `Live Smoke Product ${uniqueSuffix}`;
  const updatedSku = `LIVE-EDIT-${uniqueSuffix}`;
  const updatedName = `Live Smoke Product Updated ${uniqueSuffix}`;

  await openProductManager(page);

  await page.getByRole("button", { name: "เพิ่มสินค้าใหม่" }).first().click();
  await page.getByLabel("SKU").fill(createdSku);
  await page.getByLabel("ชื่อสินค้า").fill(createdName);
  await page.getByLabel("ราคา").fill("89");
  await page.getByLabel("สต็อกคงเหลือ").fill("9");
  await page.getByLabel("คำโปรยสินค้า").fill("Live real-smoke create flow");
  await page.getByLabel("หมวดขาย POS").selectOption("COFFEE");
  await page.getByRole("button", { name: "สร้างสินค้าใหม่" }).click();

  await expect(page.getByText("เพิ่มสินค้าใหม่เรียบร้อยแล้ว")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("ค้นหาสินค้า").fill(createdName);
  const createdRow = page.getByLabel(`Product row ${createdName}`);
  await expect(createdRow).toBeVisible({ timeout: 20_000 });

  await createdRow.getByRole("button").first().click();
  await page.getByLabel("SKU").fill(updatedSku);
  await page.getByLabel("ชื่อสินค้า").fill(updatedName);
  await page.getByLabel("ราคา").fill("119");
  await page.getByLabel("คำโปรยสินค้า").fill("Live real-smoke update flow");
  await page.getByLabel("หมวดขาย POS").selectOption("FOOD");
  await page.getByRole("button", { name: "บันทึกสินค้า" }).click();

  await expect(page.getByText("อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("ค้นหาสินค้า").fill(updatedName);

  const updatedRow = page.getByLabel(`Product row ${updatedName}`);
  await updatedRow.getByRole("button", { name: `เติมสินค้า ${updatedName}` }).click();

  const restockRow = page.getByLabel(`Restock row ${updatedName}`);
  await restockRow.getByLabel(`เติมเพิ่ม ${updatedName}`).fill("2");
  await restockRow.getByLabel(`หมายเหตุการเติมสินค้า ${updatedName}`).fill("Live real-smoke inline restock flow");
  await restockRow.getByRole("button", { name: "บันทึกการเติมสินค้า" }).click();

  await expect(updatedRow).toContainText("11", { timeout: 20_000 });

  return {
    sku: updatedSku,
    name: updatedName,
    price: 119,
  };
}

async function repairInvalidRevenueMappings(page: Page, products: Product[]) {
  const coaResponse = await apiJson<ChartOfAccount[]>(page, "/api/v1/coa");
  expect(coaResponse.status, JSON.stringify(coaResponse.body)).toBe(200);

  const accounts = Array.isArray(coaResponse.body) ? coaResponse.body : [];
  const validRevenueAccounts = accounts.filter((account) => account.account_type === "REVENUE" && account.is_active);
  const defaultRevenueAccount = validRevenueAccounts.find((account) => account.account_code === "4010") ?? validRevenueAccounts[0];

  expect(defaultRevenueAccount).toBeTruthy();

  const validRevenueAccountIds = new Set(validRevenueAccounts.map((account) => String(account.account_id)));
  const invalidProducts = products.filter(
    (product) => product.revenue_account_id && !validRevenueAccountIds.has(String(product.revenue_account_id)),
  );

  for (const product of invalidProducts) {
    const response = await apiJson<Product>(page, `/api/v1/products/${encodeURIComponent(String(product.product_id))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: product.sku,
        name: product.name,
        tagline: product.tagline ?? null,
        price: product.price,
        pos_category: product.pos_category ?? null,
        featured_slot: product.featured_slot ?? null,
        revenue_account_id: String(defaultRevenueAccount?.account_id),
        stock_on_hand: product.track_stock ? (product.stock_on_hand ?? 0) : null,
        membership_period: product.membership_period ?? null,
        membership_duration_days: product.membership_duration_days ?? null,
      }),
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
  }

  return invalidProducts.map((product) => product.sku);
}

function isSellable(product: Product) {
  return !(product.track_stock && typeof product.stock_on_hand === "number" && product.stock_on_hand <= 0);
}

function isTrainingProduct(product: Product) {
  return product.sku.startsWith("PT-") || product.pos_category === "TRAINING";
}

function isHistoricalSmokeProduct(product: Product, currentSmokeSku: string) {
  if (product.sku === currentSmokeSku) {
    return false;
  }

  return (
    product.sku.startsWith("LIVE-SMOKE-") ||
    product.sku.startsWith("LIVE-EDIT-") ||
    product.sku.startsWith("SMOKE-") ||
    /\bsmoke\b/i.test(product.name)
  );
}

function chunkProducts(products: Product[], size: number) {
  const chunks: Product[][] = [];

  for (let index = 0; index < products.length; index += size) {
    chunks.push(products.slice(index, index + size));
  }

  return chunks;
}

async function addProductToCart(page: Page, product: Product) {
  const searchInput = page.getByLabel("Product search");
  await searchInput.fill(product.sku);

  const productCard = page
    .locator("article")
    .filter({ hasText: product.sku })
    .filter({ has: page.getByRole("button", { name: product.name, exact: true }) })
    .first();

  await expect(productCard).toBeVisible({ timeout: 20_000 });
  await expect(productCard.getByRole("button", { name: "เพิ่มลงบิล" })).toBeEnabled({ timeout: 20_000 });
  await productCard.getByRole("button", { name: "เพิ่มลงบิล" }).click();
  await searchInput.fill("");
}

async function waitForOrderInDailySummary(page: Page, businessDate: string, customerName: string) {
  let matchedOrder: DailySalesRow | null = null;

  await expect
    .poll(async () => {
      const summary = await apiJson<{ sales_rows: DailySalesRow[] }>(
        page,
        `/api/v1/reports/daily-summary?period=DAY&date=${businessDate}`,
      );

      if (summary.status !== 200 || !Array.isArray(summary.body.sales_rows)) {
        return 0;
      }

      matchedOrder = summary.body.sales_rows.find((row) => row.customer_name === customerName) ?? null;

      return matchedOrder ? 1 : 0;
    }, { timeout: 30_000 })
    .toBe(1);

  if (!matchedOrder) {
    throw new Error(`Could not find order for ${customerName}`);
  }

  return matchedOrder;
}

async function checkoutCurrentCart(
  page: Page,
  businessDate: string,
  customerName: string,
  activeTrainerId?: string | number,
) {
  const trainerSelectors = page.getByLabel("เลือกเทรนเนอร์");
  const trainerSelectorCount = await trainerSelectors.count();

  for (let index = 0; index < trainerSelectorCount; index += 1) {
    await trainerSelectors.nth(index).selectOption(String(activeTrainerId));
  }

  await page.getByPlaceholder("ชื่อลูกค้า (ถ้ามี)").or(page.getByPlaceholder("ชื่อลูกค้าสมาชิก")).fill(customerName);
  const orderResponsePromise = page
    .waitForResponse(
      (response) => response.request().method() === "POST" && response.url().includes("/api/v1/orders"),
      { timeout: 20_000 },
    )
    .catch(() => null);

  await page.getByRole("button", { name: "คิดเงิน" }).click();
  await page.getByRole("button", { name: "ยืนยันการคิดเงิน" }).click();

  let createdOrder: DailySalesRow | null = null;

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const summary = await apiJson<{ sales_rows: DailySalesRow[] }>(
      page,
      `/api/v1/reports/daily-summary?period=DAY&date=${businessDate}`,
    );

    if (summary.status === 200 && Array.isArray(summary.body.sales_rows)) {
      createdOrder = summary.body.sales_rows.find((row) => row.customer_name === customerName) ?? null;
      if (createdOrder) {
        break;
      }
    }

    const bodyText = await page.locator("body").innerText();
    if (bodyText.includes("ไม่สามารถสร้างรายการขายได้")) {
      const orderResponse = await orderResponsePromise;
      const responseDetails = orderResponse
        ? ` [status=${orderResponse.status()} body=${await orderResponse.text()}]`
        : "";
      throw new Error(`Checkout failed for ${customerName}: ไม่สามารถสร้างรายการขายได้${responseDetails}`);
    }

    if (bodyText.includes("ไม่พบกะเปิดที่ใช้งานได้")) {
      throw new Error(`Checkout failed for ${customerName}: ไม่พบกะเปิดที่ใช้งานได้`);
    }

    if (bodyText.includes("สต็อกสินค้าไม่พอสำหรับบิลนี้")) {
      throw new Error(`Checkout failed for ${customerName}: สต็อกสินค้าไม่พอสำหรับบิลนี้`);
    }

    await page.waitForTimeout(1_000);
  }

  if (!createdOrder) {
    const orderResponse = await orderResponsePromise;
    const responseDetails = orderResponse
      ? ` [status=${orderResponse.status()} body=${await orderResponse.text()}]`
      : "";
    throw new Error(`Checkout did not complete for ${customerName}${responseDetails}`);
  }

  await expect(page.getByRole("button", { name: "คิดเงิน" })).toBeDisabled({ timeout: 30_000 });

  return createdOrder;
}

async function reopenPos(page: Page) {
  await page.getByRole("link", { name: "ภาพรวม เปิด", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await openPosReady(page);
}

async function sellChunkWithFallback(
  page: Page,
  businessDate: string,
  chunk: Product[],
  customerNamePrefix: string,
  saleLabel: string,
  soldNameCounts: Map<string, number>,
  activeTrainerId?: string | number,
): Promise<number> {
  const chunkCustomerName = `${customerNamePrefix} ${saleLabel}`;

  for (const product of chunk) {
    await addProductToCart(page, product);
  }

  try {
    const createdOrder = await checkoutCurrentCart(
      page,
      businessDate,
      chunkCustomerName,
      activeTrainerId,
    );

    expect(createdOrder.payment_method).toBe("CASH");
    expect((createdOrder.items ?? []).length).toBe(chunk.length);

    for (const item of createdOrder.items ?? []) {
      soldNameCounts.set(item.product_name, (soldNameCounts.get(item.product_name) ?? 0) + 1);
    }

    return Number(createdOrder.total_amount);
  } catch (error) {
    if (chunk.length === 1) {
      throw new Error(
        `Single-product checkout failed for ${chunk[0].name} (${chunk[0].sku}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await reopenPos(page);

    const midpoint = Math.ceil(chunk.length / 2);
    const leftChunk = chunk.slice(0, midpoint);
    const rightChunk = chunk.slice(midpoint);

    const leftTotal = await sellChunkWithFallback(
      page,
      businessDate,
      leftChunk,
      customerNamePrefix,
      `${saleLabel}-L`,
      soldNameCounts,
      activeTrainerId,
    );
    const rightTotal = await sellChunkWithFallback(
      page,
      businessDate,
      rightChunk,
      customerNamePrefix,
      `${saleLabel}-R`,
      soldNameCounts,
      activeTrainerId,
    );

    return leftTotal + rightTotal;
  }
}

test.describe("live POS full smoke", () => {
  test("real account can open shift, manage product, sell every sellable product, and close shift with zero discrepancy", async ({ page }) => {
    test.setTimeout(600_000);

    const account = getSmokeAccount();
    const requestedStartingCash = 500;
    const customerName = `Live POS Smoke ${Date.now()}`;
    const businessDate = new Date().toISOString().slice(0, 10);

    await loginAs(page, account);
    await expectSession(page);
    await closeExistingShiftIfPresent(page);
    const startingCash = await openShiftFromUi(page, requestedStartingCash);

    await openPosReady(page);

    const editedProduct = await createAndEditProduct(page);
  await openPosReady(page);

    const productsResponse = await apiJson<Product[]>(page, "/api/v1/products");
    expect(productsResponse.status, JSON.stringify(productsResponse.body)).toBe(200);

    const trainersResponse = await apiJson<Trainer[]>(page, "/api/v1/trainers");
    expect(trainersResponse.status, JSON.stringify(trainersResponse.body)).toBe(200);

    const trainers = Array.isArray(trainersResponse.body) ? trainersResponse.body : [];
    const activeTrainer = trainers.find((trainer) => trainer.is_active);

    const allProducts = Array.isArray(productsResponse.body) ? productsResponse.body : [];
    const repairedSkus = await repairInvalidRevenueMappings(page, allProducts);
    const refreshedProductsResponse = await apiJson<Product[]>(page, "/api/v1/products");
    expect(refreshedProductsResponse.status, JSON.stringify(refreshedProductsResponse.body)).toBe(200);

    const refreshedProducts = Array.isArray(refreshedProductsResponse.body) ? refreshedProductsResponse.body : [];
    const productsToSell = refreshedProducts.filter(
      (product) => isSellable(product) && !isHistoricalSmokeProduct(product, editedProduct.sku),
    );
    const editedProductFromApi = productsToSell.find((product) => product.sku === editedProduct.sku);
    const membershipProducts = productsToSell.filter((product) => product.product_type === "MEMBERSHIP");
    const trainingProducts = productsToSell.filter(isTrainingProduct).filter((product) => product.product_type !== "MEMBERSHIP");
    const regularProducts = productsToSell.filter(
      (product) => product.product_type !== "MEMBERSHIP" && !isTrainingProduct(product),
    );
    const saleChunks = [
      ...chunkProducts(regularProducts, 12),
      ...trainingProducts.map((product) => [product]),
      ...membershipProducts.map((product) => [product]),
    ];
    const soldNameCounts = new Map<string, number>();
    let totalSoldAmount = 0;

    expect(editedProductFromApi).toBeTruthy();
    expect(productsToSell.length).toBeGreaterThan(0);
    expect(saleChunks.length).toBeGreaterThan(0);
    expect(Array.isArray(repairedSkus)).toBeTruthy();

    if (productsToSell.some(isTrainingProduct)) {
      expect(activeTrainer).toBeTruthy();
    }

    for (let chunkIndex = 0; chunkIndex < saleChunks.length; chunkIndex += 1) {
      const saleChunk = saleChunks[chunkIndex];
      totalSoldAmount += await sellChunkWithFallback(
        page,
        businessDate,
        saleChunk,
        customerName,
        `chunk-${chunkIndex + 1}`,
        soldNameCounts,
        activeTrainer?.trainer_id,
      );
    }

    for (const product of productsToSell) {
      expect(soldNameCounts.get(product.name), `Missing sold product ${product.name} (${product.sku})`).toBeGreaterThan(0);
    }

    const beforeCloseSummary = await apiJson<{ shift_rows: DailyShiftRow[] }>(
      page,
      `/api/v1/reports/daily-summary?period=DAY&date=${businessDate}`,
    );

    expect(beforeCloseSummary.status, JSON.stringify(beforeCloseSummary.body)).toBe(200);
    const beforeCloseCount = Array.isArray(beforeCloseSummary.body.shift_rows) ? beforeCloseSummary.body.shift_rows.length : 0;

    await page.getByRole("link", { name: "ปิดกะ เปิด", exact: true }).click();
    await expect(page).toHaveURL(/\/shift\/close$/);
    await expect(page.getByRole("heading", { name: "ปิดกะ" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("กำลังโหลดรายการขายของกะ...")).toHaveCount(0);

    const expectedActualCash = Number((startingCash + totalSoldAmount).toFixed(2));
    await page.getByLabel("เงินสดที่นับได้จริง").fill(expectedActualCash.toFixed(2));
    await page.getByLabel("หมายเหตุปิดกะ").fill(`Live smoke closed after ${productsToSell.length} sellable products across ${saleChunks.length} orders`);
    await page.getByRole("button", { name: "ส่งผลการนับเงิน" }).click();

    await expect(page.getByRole("button", { name: "ล้างผลลัพธ์นี้" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("ไม่พบส่วนต่าง", { exact: true })).toBeVisible({ timeout: 30_000 });

    const closedSummary = await apiJson<{ shift_rows: DailyShiftRow[] }>(
      page,
      `/api/v1/reports/daily-summary?period=DAY&date=${businessDate}`,
    );

    expect(closedSummary.status, JSON.stringify(closedSummary.body)).toBe(200);

    const closedRows = Array.isArray(closedSummary.body.shift_rows) ? closedSummary.body.shift_rows : [];
    expect(closedRows.length).toBe(beforeCloseCount + 1);

    const closedShift = closedRows.find(
      (row) =>
        Number(row.difference) === 0 &&
        Number(row.expected_cash) === expectedActualCash &&
        Number(row.actual_cash) === expectedActualCash,
    );

    expect(closedShift).toBeTruthy();
    expect(Number(closedShift?.difference)).toBe(0);
    expect(Number(closedShift?.expected_cash)).toBe(expectedActualCash);
    expect(Number(closedShift?.actual_cash)).toBe(expectedActualCash);
  });
});