import path from "node:path";
import { defineConfig } from "vitest/config";

const vitestInlineConfig = {
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [
      ["tests/unit/**/*.test.tsx", "node"],
      ["tests/unit/**/*.test.ts", "node"],
      ["features/**/*.test.ts", "node"],
    ],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    setupFiles: ["tests/setup/vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: [
        "shared/http/http.ts",
        "server/http/fetch-with-timeout.ts",
        "server/http/hono-client.ts",
        "shared/contracts/auth-profile.ts",
        "shared/contracts/auth-roles.ts",
        "shared/utils/date-formatters.ts",
        "features/media/rich-text/rich-text.ts",
        "features/media/upload/image-upload-state.ts",
        "features/media/upload/showcase-images.ts",
        "features/auth/model/auth-shared.ts",
        "app/(dashboard)/dashboard/market/market-shared.ts",
      ],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "next/cache": path.resolve(__dirname, "tests/unit/stubs/next-cache.ts"),
      "server-only": path.resolve(__dirname, "tests/unit/stubs/server-only.ts"),
    },
  },
} as const;

export default defineConfig(vitestInlineConfig as never);
