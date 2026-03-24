import { expect, test, type Page } from "@playwright/test";

type RealAccount = {
  username: string;
  password: string;
};

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim() ?? fallback;

  if (!value) {
    throw new Error(`Missing required env ${name}.`);
  }

  return value;
}

function getOwnerAccount(): RealAccount {
  return {
    username: requireEnv("PLAYWRIGHT_REAL_OWNER_USERNAME", "owner"),
    password: requireEnv("PLAYWRIGHT_REAL_OWNER_PASSWORD", process.env.FITNESSLA_SEED_PASSWORD ?? "ChangeMe123!"),
  };
}

function getTrainerAccount(): RealAccount {
  return {
    username: requireEnv("PLAYWRIGHT_REAL_TRAINER_USERNAME", "oooo"),
    password: requireEnv("PLAYWRIGHT_REAL_TRAINER_PASSWORD"),
  };
}

async function loginAs(page: Page, account: RealAccount) {
  let lastBodyText = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.context().clearCookies();
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();

    await page.getByLabel("ชื่อผู้ใช้").fill(account.username);
    await page.getByLabel("รหัสผ่าน").fill(account.password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    try {
      await expect(page).toHaveURL(/\/(dashboard|trainers)$/i, { timeout: 15_000 });
      return;
    } catch {
      lastBodyText = await page.locator("body").innerText();

      if (attempt === 3) {
        throw new Error(`Login failed for ${account.username}: ${lastBodyText.slice(0, 500)}`);
      }

      await page.waitForTimeout(2_000);
    }
  }
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
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

async function gotoTrainersPage(page: Page) {
  const trainersLink = page.getByRole("link", { name: "เทรนเนอร์ เปิด" });

  if (await trainersLink.count()) {
    await trainersLink.click();
  } else {
    await page.goto("/trainers");
  }

  await expect(page).toHaveURL(/\/trainers$/);
  await expect(page.getByRole("heading", { name: "เทรนเนอร์" })).toBeVisible();
}

async function openTrainerDetails(page: Page, trainerIdentity: string) {
  const trainerSection = page.locator("section", { hasText: trainerIdentity }).first();
  await expect(trainerSection).toBeVisible();

  const toggleButton = trainerSection.getByRole("button", { name: /จัดการลูกเทรน|ซ่อนรายละเอียด/ });
  await toggleButton.click();
  await expect(trainerSection.getByRole("heading", { name: "ลูกเทรนปัจจุบัน" })).toBeVisible();

  return trainerSection;
}

function getEnrollmentRow(trainerSection: ReturnType<Page["locator"]>, customerName: string) {
  return trainerSection.getByRole("row").filter({ hasText: customerName }).last();
}

test.describe("trainer schedule real smoke", () => {
  test("owner and trainer can save and read weekly client schedule via UI", async ({ page }) => {
    const owner = getOwnerAccount();
    const trainer = getTrainerAccount();
    const suffix = `${Date.now()}`.slice(-6);
    const ownerNote = `Owner smoke ${suffix}`;
    const trainerNote = `Trainer smoke ${suffix}`;

    await loginAs(page, owner);
    await expectRealSession(page);
    await gotoTrainersPage(page);

    const ownerTrainerSection = await openTrainerDetails(page, `@${trainer.username}`);
    const ownerEnrollmentRow = getEnrollmentRow(ownerTrainerSection, "klklklkl");
    await expect(ownerTrainerSection.getByRole("heading", { name: "สรุปตารางรายสัปดาห์" })).toBeVisible();

    const ownerExistingScheduleCount = await ownerEnrollmentRow
      .getByPlaceholder("หมายเหตุ เช่น โซนเวท / หลังเลิกงาน")
      .count();

    await ownerEnrollmentRow.getByRole("button", { name: "เพิ่มวันเวลา" }).click();
    await expect(ownerEnrollmentRow.getByPlaceholder("หมายเหตุ เช่น โซนเวท / หลังเลิกงาน")).toHaveCount(ownerExistingScheduleCount + 1);
    await ownerEnrollmentRow.getByRole("combobox").nth(ownerExistingScheduleCount + 1).selectOption("TUESDAY");
    await ownerEnrollmentRow.locator('input[type="time"]').nth(ownerExistingScheduleCount * 2).fill("10:00");
    await ownerEnrollmentRow.locator('input[type="time"]').nth(ownerExistingScheduleCount * 2 + 1).fill("11:00");
    await ownerEnrollmentRow.getByPlaceholder("หมายเหตุ เช่น โซนเวท / หลังเลิกงาน").nth(ownerExistingScheduleCount).fill(ownerNote);
    await ownerEnrollmentRow.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByText("อัปเดตข้อมูลลูกเทรนเรียบร้อยแล้ว")).toBeVisible();
    await expect(ownerTrainerSection.getByRole("heading", { name: "อังคาร" })).toBeVisible();
    await expect(ownerTrainerSection.getByText("10:00 - 11:00").first()).toBeVisible();
    await expect(ownerTrainerSection.getByText(ownerNote)).toBeVisible();

    await logout(page);

    await loginAs(page, trainer);
    await expectRealSession(page);
    await gotoTrainersPage(page);
    await expect(page.getByRole("button", { name: "เพิ่มเทรนเนอร์" })).toHaveCount(0);

    const trainerSection = await openTrainerDetails(page, `@${trainer.username}`);
    const trainerEnrollmentRow = getEnrollmentRow(trainerSection, "klklklkl");
    await expect(trainerSection.getByRole("heading", { name: "อังคาร" })).toBeVisible();
    await expect(trainerSection.getByText("10:00 - 11:00").first()).toBeVisible();
    await expect(trainerSection.getByText(ownerNote)).toBeVisible();
    await expect(trainerSection.getByRole("button", { name: "ลบเทรนเนอร์" })).toHaveCount(0);

    await trainerEnrollmentRow.getByPlaceholder("หมายเหตุ เช่น โซนเวท / หลังเลิกงาน").last().fill(trainerNote);
    await trainerEnrollmentRow.getByRole("button", { name: "บันทึกสเกดูล" }).click();

    await expect(page.getByText("บันทึกสเกดูลลูกเทรนเรียบร้อยแล้ว")).toBeVisible();
    await expect(trainerSection.getByText(trainerNote)).toBeVisible();

    await logout(page);

    await loginAs(page, owner);
    await expectRealSession(page);
    await gotoTrainersPage(page);

    const verifySection = await openTrainerDetails(page, `@${trainer.username}`);
    await expect(verifySection.getByRole("heading", { name: "อังคาร" })).toBeVisible();
    await expect(verifySection.getByText("10:00 - 11:00").first()).toBeVisible();
    await expect(verifySection.getByText(trainerNote)).toBeVisible();
  });
});