import { expect, test } from "@playwright/test";

const password = process.env.FITNESSLA_SEED_PASSWORD ?? "ChangeMe123!";

async function loginAs(page: Parameters<typeof test>[0]["page"], username: string) {
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
      const bodyText = await page.locator("body").innerText();
      if (attempt === 3 || !bodyText.includes("Failed to fetch")) {
        throw new Error(`Login failed for ${username}: ${bodyText.slice(0, 400)}`);
      }
      await page.waitForTimeout(2_000);
    }
  }
}

test.describe("real-mode owner/admin login smoke", () => {
  test("owner sees members and trainers actions on real pages", async ({ page }) => {
    await loginAs(page, "owner");

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

  test("admin sees read-only members and trainers pages", async ({ page }) => {
    await loginAs(page, "admin");

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