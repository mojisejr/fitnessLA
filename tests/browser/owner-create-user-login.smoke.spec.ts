import { expect, test } from "@playwright/test";

const ownerPassword = process.env.FITNESSLA_SEED_PASSWORD ?? "ChangeMe123!";

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

test.describe("owner creates user and login smoke", () => {
  test("owner creates a new cashier and the new user can login immediately", async ({ page }) => {
    const suffix = `${Date.now()}`.slice(-8);
    const username = `smoke.cashier.${suffix}`;
    const password = `SmokePass!${suffix}`;
    const fullName = `Smoke Cashier ${suffix}`;
    const phone = `08${suffix}`;

    await loginAs(page, "owner", ownerPassword);

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "สร้างผู้ใช้" })).toBeVisible();

    await page.getByPlaceholder("ชื่อ").fill(fullName);
    await page.getByPlaceholder("เบอร์โทร").fill(phone);
    await page.getByPlaceholder("username").fill(username);
    await page.getByPlaceholder("password").fill(password);
    await page.getByLabel("บทบาท").selectOption("CASHIER");
    await page.getByRole("button", { name: "สร้างผู้ใช้" }).click();

    await expect(page.getByText(`สร้าง user ${username} เรียบร้อยแล้ว สามารถนำ username/password นี้ไป login ได้ทันที`)).toBeVisible();
    await expect(page.getByText(`@${username}`)).toBeVisible();
    await expect(page.getByText(phone)).toBeVisible();

    await page.getByRole("button", { name: "ออกจากระบบ" }).click();

    await loginAs(page, username, password);
    await expect(page.getByRole("heading", { name: `สวัสดี ${fullName}` })).toBeVisible();
    await expect(page.getByRole("link", { name: "สร้างผู้ใช้ เปิด" })).toHaveCount(0);
  });
});