import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const THEME_STABILIZER_STYLE_ID = "e2e-theme-stabilizer";

const installThemeStabilizer = async (page: Page): Promise<void> => {
  await page.evaluate((styleId) => {
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
      html {
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(style);
  }, THEME_STABILIZER_STYLE_ID);
};

export const setTheme = async (page: Page, theme: "light" | "dark"): Promise<void> => {
  await installThemeStabilizer(page);

  const toggleId = theme === "dark" ? "public-theme-mode-dark" : "public-theme-mode-light";
  const toggle = page.getByTestId(toggleId).first();
  if (await toggle.isVisible().catch(() => false)) {
    try {
      await toggle.click();
    } catch {
      // Fallback below keeps the theme deterministic for the test matrix.
    }
  }

  await page.evaluate((targetTheme) => {
    const root = document.documentElement;
    try {
      window.localStorage.setItem("theme", targetTheme);
    } catch {
      // ignore storage errors in test runtime
    }

    root.classList.toggle("dark", targetTheme === "dark");
    root.dataset.theme = targetTheme;
    root.dataset.themeMode = targetTheme;
  }, theme);

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

  await expect
    .poll(() =>
      page.evaluate(() => ({
        isDark: document.documentElement.classList.contains("dark"),
        mode: document.documentElement.dataset.themeMode,
      })),
    )
    .toEqual({
      isDark: theme === "dark",
      mode: theme,
    });
};

export const assertReadable = async (page: Page): Promise<void> => {
  const results = await new AxeBuilder({ page })
    .withRules(["color-contrast", "button-name", "link-name", "aria-valid-attr"])
    .analyze();

  expect(results.violations).toEqual([]);
};
