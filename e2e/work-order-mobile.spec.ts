import { test, expect, Page, devices } from "@playwright/test";

const hasCredentials = !!(process.env.TEST_EMAIL && process.env.TEST_PASSWORD);

async function ensureLoggedIn(page: Page) {
  await page.goto("/");

  const loginButton = page.locator('button:has-text("Đăng nhập")');
  if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    if (!hasCredentials) {
      return false;
    }

    await page.fill('input[type="email"]', process.env.TEST_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD!);
    await loginButton.click();
    await page.waitForTimeout(3000);
  }

  return true;
}

test.use({ ...devices["Pixel 5"] });

test.describe("Work Order Mobile Flow", () => {
  test.skip(!hasCredentials, "Skipping: TEST_EMAIL and TEST_PASSWORD not set");

  test.beforeEach(async ({ page }) => {
    const loggedIn = await ensureLoggedIn(page);
    test.skip(!loggedIn, "Could not login - skipping test");
  });

  test("should open create work order modal on mobile", async ({ page }) => {
    await page.goto("/#/service");

    const createButton = page.locator('button[aria-label="Tạo phiếu mới"]').first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    await expect(page.getByText("THÔNG TIN").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("PHỤ TÙNG").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("T.TOÁN").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should open mobile edit modal from history tab when a work order exists", async ({
    page,
  }) => {
    await page.goto("/#/service");

    const historyTab = page.getByText("Lịch sử").first();
    await expect(historyTab).toBeVisible({ timeout: 10000 });
    await historyTab.click();

    const historyEditButton = page.getByRole("button", { name: "Sửa" }).first();
    const hasHistoryOrder = await historyEditButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    test.skip(!hasHistoryOrder, "No service history work order available to edit");

    await historyEditButton.click();

    await expect(page.getByText("THÔNG TIN").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("LƯU").first()).toBeVisible({
      timeout: 5000,
    });
  });
});
