import { expect, type Locator, type Page } from "@playwright/test";
import type { ButtonSpec, RouteCase } from "./route-manifest";

const BUTTON_SELECTOR = [
  "button[data-testid]",
  "[role='button'][data-testid]",
  "input[type='submit'][data-testid]",
  "input[type='button'][data-testid]",
  "input[type='reset'][data-testid]",
].join(",");

export const waitForRouteReady = async (page: Page, route: RouteCase): Promise<void> => {
  if (route.readyLocator.kind === "testid") {
    await expect(page.getByTestId(route.readyLocator.value).first()).toBeVisible({
      timeout: 20_000,
    });
    return;
  }

  if (route.readyLocator.kind === "text") {
    await expect(page.getByText(route.readyLocator.value).first()).toBeVisible({
      timeout: 20_000,
    });
    return;
  }

  await expect(page.locator(route.readyLocator.value).first()).toBeVisible({
    timeout: 20_000,
  });
};

export const readDomButtonTestIds = async (page: Page): Promise<string[]> => {
  const testIds = await page.locator(BUTTON_SELECTOR).evaluateAll((nodes) => {
    const ids = new Set<string>();
    for (const node of nodes) {
      const id = node.getAttribute("data-testid");
      if (id) {
        ids.add(id);
      }
    }
    return [...ids].sort();
  });

  return testIds;
};

const expectUrlIncludes = async (page: Page, urlIncludes: string): Promise<void> => {
  await expect
    .poll(() => page.url(), {
      timeout: 10_000,
    })
    .toContain(urlIncludes);
};

const readTargetButton = (page: Page, testId: string): Locator => {
  return page.getByTestId(testId).first();
};

export const verifyButtonSpec = async (
  page: Page,
  spec: ButtonSpec,
): Promise<void> => {
  const button = readTargetButton(page, spec.testId);
  await expect(button).toBeVisible();

  if (spec.action === "navigate") {
    await button.click();
    if (spec.expected.urlIncludes) {
      await expectUrlIncludes(page, spec.expected.urlIncludes);
    }
    return;
  }

  if (spec.action === "modal-open") {
    await button.click();
    if (spec.expected.appearsTestId) {
      await expect(page.getByTestId(spec.expected.appearsTestId)).toBeVisible();
    }
    return;
  }

  if (spec.action === "modal-close") {
    await button.click();
    if (spec.expected.disappearsTestId) {
      await expect(page.getByTestId(spec.expected.disappearsTestId)).toBeHidden();
    }
    return;
  }

  if (spec.action === "external") {
    const href = await button.getAttribute("href");
    expect(href).toBeTruthy();
    if (spec.expected.urlIncludes) {
      expect(href).toContain(spec.expected.urlIncludes);
    }
    return;
  }

  await button.click();
  if (spec.expected.appearsTestId) {
    await expect(page.getByTestId(spec.expected.appearsTestId)).toBeVisible();
  }
  if (spec.expected.disappearsTestId) {
    await expect(page.getByTestId(spec.expected.disappearsTestId)).toBeHidden();
  }
  if (spec.expected.urlIncludes) {
    await expectUrlIncludes(page, spec.expected.urlIncludes);
  }
};
