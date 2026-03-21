import { expect, test } from "@playwright/test";

test("home renders and contains main text", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("연영회", { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId("home-activities-grid")).toBeVisible();
});

test("home recent activity card navigates to the record detail page", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const firstActivityCard = page.locator("[data-testid^='home-activity-card-']").first();
  await expect(firstActivityCard).toHaveAttribute("href", /\/archive\/records\/[^/]+$/);

  await firstActivityCard.click();

  await expect(page).toHaveURL(/\/archive\/records\/[^/]+$/);
  await expect(page.getByTestId("record-detail-gallery")).toBeVisible();
});
