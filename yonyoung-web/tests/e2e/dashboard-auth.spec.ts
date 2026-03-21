import { expect, test } from "@playwright/test";

test("unauthenticated dashboard access is redirected or forbidden", async ({ page }) => {
  const response = await page.goto("/dashboard");

  if (page.url().includes("/auth/sign-in")) {
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    return;
  }

  expect(response?.status()).toBe(403);
  await expect(page.getByTestId("dashboard-forbidden-page")).toBeVisible();
});
