import { expect, test } from "@playwright/test";

import { routeManifest } from "./support/route-manifest";
import { clearMockSession, setMockSession } from "./support/session";
import { getMockState, resetMockState } from "./support/state-assert";
import { assertReadable, setTheme } from "./support/theme-check";
import { readDomButtonTestIds, verifyButtonSpec, waitForRouteReady } from "./support/route-helpers";

const getDeviceSetForProject = (projectName: string): "desktop" | "mobile" =>
  projectName.includes("mobile") ? "mobile" : "desktop";

const createNamespace = (input: {
  projectName: string;
  parallelIndex: number;
  routeId: string;
}): string =>
  [input.projectName, `w${input.parallelIndex}`, input.routeId].join("-");

test.describe.configure({ mode: "parallel" });

test.beforeEach(async ({ context }) => {
  await clearMockSession(context);
});

for (const route of routeManifest) {
  test(`route matrix: ${route.id}`, async ({ page, context, request }, testInfo) => {
    const deviceSet = getDeviceSetForProject(testInfo.project.name);
    test.skip(!route.deviceSet.includes(deviceSet));

    const namespace = createNamespace({
      projectName: testInfo.project.name,
      parallelIndex: testInfo.parallelIndex,
      routeId: route.id,
    });

    await resetMockState(request, namespace);
    await setMockSession(context, {
      role: route.requiredRole,
      profileMode: route.profileMode,
      namespace,
    });

    const response = await page.goto(route.path, {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    await waitForRouteReady(page, route);

    for (const mode of route.modeSet) {
      await setTheme(page, mode);
      await assertReadable(page);
      await waitForRouteReady(page, route);
    }

    const domButtons = await readDomButtonTestIds(page);
    const expectedButtonIds = [...new Set(route.buttonSpecs.map((spec) => spec.testId))].sort();

    if (expectedButtonIds.length > 0) {
      expect(domButtons).toEqual(expectedButtonIds);

      for (const spec of route.buttonSpecs) {
        await verifyButtonSpec(page, spec);
      }
    }

    const state = await getMockState(request, namespace);
    expect(state.users.length).toBeGreaterThan(0);

    await resetMockState(request, namespace);
  });
}
