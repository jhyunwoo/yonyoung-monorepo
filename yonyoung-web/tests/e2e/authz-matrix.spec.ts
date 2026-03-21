import { expect, test } from "@playwright/test";

import { setMockSession } from "./support/session";
import { resetMockState } from "./support/state-assert";

const namespace = (
  testName: string,
  projectName: string,
  parallelIndex: number,
): string => `${projectName}-w${parallelIndex}-${testName}`;

test.describe("authz matrix", () => {
  test("guest dashboard access is blocked", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const ns = namespace(
      "guest-dashboard",
      testInfo.project.name,
      testInfo.parallelIndex,
    );
    await resetMockState(request, ns);
    await setMockSession(context, { role: "guest", namespace: ns });

    const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();

    if (page.url().includes("/auth/sign-in")) {
      await expect(page).toHaveURL(/\/auth\/sign-in/);
      return;
    }

    expect(response?.status()).toBe(403);
    await expect(page.getByTestId("dashboard-forbidden-page")).toBeVisible();
  });

  test("unverified user is routed to profile and pending approval paths", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const ns = namespace("unverified", testInfo.project.name, testInfo.parallelIndex);
    await resetMockState(request, ns);

    await setMockSession(context, {
      role: "unverified",
      profileMode: "incomplete",
      namespace: ns,
    });
    await page.goto("/auth/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("auth-profile-submit")).toBeVisible();

    await setMockSession(context, {
      role: "unverified",
      profileMode: "complete",
      namespace: ns,
    });
    await page.goto("/auth/pending-approval", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("auth-pending-approval-page")).toBeVisible();
  });

  test("member can access dashboard, but manager cannot access president-only settings", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const ns = namespace("member-manager", testInfo.project.name, testInfo.parallelIndex);
    await resetMockState(request, ns);

    await setMockSession(context, { role: "member", namespace: ns });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("연영회에 오신 것을 환영합니다.")).toBeVisible();

    await setMockSession(context, { role: "manager", namespace: ns });
    const response = await page.goto("/dashboard/settings/site", {
      waitUntil: "domcontentloaded",
    });
    expect(response).not.toBeNull();

    if (response!.status() === 403) {
      await expect(page.getByTestId("dashboard-forbidden-page")).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("연영회에 오신 것을 환영합니다.")).toBeVisible();
  });

  test("president can access president-only settings", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const ns = namespace("president", testInfo.project.name, testInfo.parallelIndex);
    await resetMockState(request, ns);
    await setMockSession(context, { role: "president", namespace: ns });

    await page.goto("/dashboard/settings/site", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("site-settings-submit")).toBeVisible();
  });
});
