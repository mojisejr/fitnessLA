import { expect, test } from "@playwright/test";

const ownerPassword = process.env.FITNESSLA_SEED_PASSWORD ?? "ChangeMe123!";

function buildFutureTime(offsetMinutes: number) {
  const date = new Date(Date.now() + offsetMinutes * 60_000);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

async function loginAs(page: Parameters<typeof test>[0]["page"], username: string, password: string) {
  let lastBodyText = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
    await page.getByLabel("ชื่อผู้ใช้").fill(username);
    await page.getByLabel("รหัสผ่าน").fill(password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    try {
      await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });
      await expect(page.getByText(`@${username}`)).toBeVisible({ timeout: 10_000 });
      return;
    } catch {
      lastBodyText = await page.locator("body").innerText();

      if (attempt === 3) {
        throw new Error(`Login failed for ${username}: ${lastBodyText.slice(0, 400)}`);
      }

      await page.waitForTimeout(2_000);
    }
  }
}

async function apiJson<T>(page: Parameters<typeof test>[0]["page"], url: string, init?: RequestInit) {
  return page.evaluate(
    async ({ targetUrl, requestInit }) => {
      const response = await fetch(targetUrl, {
        ...requestInit,
        credentials: "include",
        headers: requestInit?.headers,
      });
      const body = await response.json().catch(() => null);

      return { status: response.status, body };
    },
    { targetUrl: url, requestInit: init },
  ) as Promise<{ status: number; body: T }>;
}

async function ensureNoOpenShift(page: Parameters<typeof test>[0]["page"]) {
  const activeShift = await apiJson<{ shift_id: string; opened_at: string; starting_cash: number } | { code: string }>(
    page,
    "/api/v1/shifts/active",
  );

  if (activeShift.status !== 200 || !activeShift.body || "code" in activeShift.body) {
    return;
  }

  const businessDate = activeShift.body.opened_at.slice(0, 10);
  const dailySummary = await apiJson<{ sales_rows: Array<{ shift_id?: string; payment_method: string; total_amount: number }> }>(
    page,
    `/api/v1/reports/daily-summary?period=DAY&date=${businessDate}`,
  );
  const cashSales = Array.isArray(dailySummary.body?.sales_rows)
    ? dailySummary.body.sales_rows
        .filter((row) => String(row.shift_id) === String(activeShift.body.shift_id) && row.payment_method === "CASH")
        .reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
    : 0;

  const closeResponse = await apiJson(page, "/api/v1/shifts/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actual_cash: Number((Number(activeShift.body.starting_cash) + cashSales).toFixed(2)),
      closing_note: "Playwright cleanup before attendance smoke",
    }),
  });

  expect(closeResponse.status).toBe(200);
}

test.describe("attendance and machine flow smoke", () => {
  test("owner assigns machine and cashier completes attendance around a shift", async ({ page }) => {
    const suffix = `${Date.now()}`.slice(-8);
    const username = `smoke.attend.${suffix}`;
    const password = `SmokePass!${suffix}`;
    const fullName = `Smoke Attend ${suffix}`;
    const phone = `08${suffix}`;
    const scheduledStart = buildFutureTime(30);
    const scheduledEnd = buildFutureTime(180);

    await loginAs(page, "owner", ownerPassword);
    await ensureNoOpenShift(page);

    await page.getByRole("link", { name: /สร้างผู้ใช้ เปิด/i }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "จัดการผู้ใช้และเวลาเข้างาน" })).toBeVisible();

    await page.getByPlaceholder("ชื่อเครื่อง เช่น Front Desk Counter").fill(`Attendance Device ${suffix}`);
    await page.getByRole("button", { name: "อนุมัติเครื่องนี้สำหรับลงเวลา" }).click();
    await expect(page.getByText(`อนุมัติเครื่องนี้สำหรับลงเวลาแล้ว: Attendance Device ${suffix}`)).toBeVisible();

    await page.getByRole("textbox", { name: "ชื่อ", exact: true }).fill(fullName);
    await page.getByPlaceholder("เบอร์โทร").fill(phone);
    await page.getByPlaceholder("username").fill(username);
    await page.getByPlaceholder("password").fill(password);
    await page.getByLabel("บทบาท").selectOption("CASHIER");
    await page.locator('input[type="time"]').nth(0).fill(scheduledStart);
    await page.locator('input[type="time"]').nth(1).fill(scheduledEnd);
    await page.getByRole("button", { name: "สร้างผู้ใช้" }).click();

    await expect(page.getByText(`สร้าง user ${username} เรียบร้อยแล้ว สามารถนำ username/password นี้ไป login และลงชื่อเข้างานได้ทันที`)).toBeVisible();
    await expect(page.getByText(`@${username}`)).toBeVisible();
    await expect(page.getByText(`ใช้เครื่องลงเวลา: Attendance Device ${suffix}`).first()).toBeVisible();

    await page.getByRole("button", { name: "ออกจากระบบ" }).click();

    await loginAs(page, username, password);
    await expect(page.getByRole("heading", { name: `สวัสดี ${fullName}` })).toBeVisible();

    await page.getByRole("button", { name: "ลงชื่อเข้างาน" }).click();
    await expect
      .poll(async () => {
        const attendanceStatus = await apiJson<{ today?: { checked_in_at?: string | null } }>(page, "/api/v1/attendance/status");
        return attendanceStatus.body?.today?.checked_in_at ?? null;
      }, { timeout: 10_000 })
      .not.toBeNull();

    await page.getByRole("link", { name: "เปิดกะ เปิด", exact: true }).click();
    await expect(page).toHaveURL(/\/shift\/open$/);
    await expect(page.getByRole("heading", { name: "เปิดกะ" })).toBeVisible();
    await page.getByLabel("เงินทอนตั้งต้น").fill("500");
    await page.getByRole("button", { name: "ยืนยันเปิดกะ" }).click();
    await expect(page.getByText("ตอนนี้มีกะที่เปิดอยู่แล้ว")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: "ปิดกะ เปิด", exact: true }).click();
    await expect(page).toHaveURL(/\/shift\/close$/);
    await expect(page.getByRole("heading", { name: "ปิดกะ" })).toBeVisible();
    await page.getByPlaceholder("กรอกจำนวนเงินที่นับได้").fill("500");
    await page.getByRole("button", { name: "ส่งผลการนับเงิน" }).click();
    await expect(page.getByText("ยอดที่นับได้")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: "ภาพรวม เปิด", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: "ลงชื่อออกงาน" }).click();
    await expect(page.getByText("ลงชื่อออกงานเรียบร้อยแล้ว")).toBeVisible({ timeout: 10_000 });
  });
});