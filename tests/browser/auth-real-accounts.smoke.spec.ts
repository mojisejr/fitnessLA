import { expect, test, type Page } from "@playwright/test";

type RealAccountRole = "owner" | "admin";

type RealSmokeAccount = {
  label: RealAccountRole;
  username: string;
  password: string;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env ${name}. Set it in .env or the shell before running the real-account smoke.`);
  }

  return value;
}

function getRealAccount(label: RealAccountRole): RealSmokeAccount {
  const prefix = label.toUpperCase();

  return {
    label,
    username: requireEnv(`PLAYWRIGHT_REAL_${prefix}_USERNAME`),
    password: requireEnv(`PLAYWRIGHT_REAL_${prefix}_PASSWORD`),
  };
}

async function loginAs(page: Page, account: RealSmokeAccount) {
  let lastBodyText = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();

    await page.getByLabel("ชื่อผู้ใช้").fill(account.username);
    await page.getByLabel("รหัสผ่าน").fill(account.password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    try {
      await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
      return;
    } catch {
      lastBodyText = await page.locator("body").innerText();

      if (attempt === 3) {
        throw new Error(`Login failed for ${account.label} (${account.username}): ${lastBodyText.slice(0, 400)}`);
      }

      await page.waitForTimeout(2_000);
    }
  }
}

async function expectRealSession(page: Page) {
  await expect
    .poll(async () => {
      return page.evaluate(async () => {
        const response = await fetch("/api/auth/session");
        return response.status;
      });
    })
    .toBe(200);
}

test.describe("real-account auth rerun smoke", () => {
  test("owner real account sees editable members and trainers pages", async ({ page }) => {
    const ownerAccount = getRealAccount("owner");

    await loginAs(page, ownerAccount);
    await expectRealSession(page);

    await page.getByRole("link", { name: "สมาชิก เปิด" }).click();
    await expect(page).toHaveURL(/\/members$/);
    const membersText = await page.locator("body").innerText();
    expect(membersText).toContain("สมาชิกและวันหมดอายุ");
    expect(membersText).not.toContain("บัญชีนี้ดูข้อมูลสมาชิกได้อย่างเดียว");

    await page.getByRole("link", { name: "เทรนเนอร์ เปิด" }).click();
    await expect(page).toHaveURL(/\/trainers$/);
    const trainersText = await page.locator("body").innerText();
    expect(trainersText).toContain("เทรนเนอร์");
    await expect(page.getByRole("button", { name: "เพิ่มเทรนเนอร์" })).toBeVisible();
  });

  test("admin real account sees read-only members and trainers pages", async ({ page }) => {
    const adminAccount = getRealAccount("admin");

    await loginAs(page, adminAccount);
    await expectRealSession(page);

    await page.getByRole("link", { name: "สมาชิก เปิด" }).click();
    await expect(page).toHaveURL(/\/members$/);
    const membersText = await page.locator("body").innerText();
    expect(membersText).toContain("บัญชีนี้ดูข้อมูลสมาชิกได้อย่างเดียว การต่ออายุและเริ่มรอบใหม่สงวนสิทธิ์ไว้สำหรับ owner เท่านั้น");
    await expect(page.getByRole("button", { name: "ต่ออายุ" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "เริ่มใหม่" })).toHaveCount(0);

    await page.getByRole("link", { name: "เทรนเนอร์ เปิด" }).click();
    await expect(page).toHaveURL(/\/trainers$/);
    const trainersText = await page.locator("body").innerText();
    expect(trainersText).toContain("บัญชีนี้ดูข้อมูลเทรนเนอร์ได้อย่างเดียว การเพิ่มเทรนเนอร์และแก้ไขลูกเทรนสงวนสิทธิ์ไว้สำหรับ owner เท่านั้น");
    await expect(page.getByRole("button", { name: "เพิ่มเทรนเนอร์" })).toHaveCount(0);
  });
});