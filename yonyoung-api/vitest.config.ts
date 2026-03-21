import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts", "tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "src/app.ts",
        "src/lib/auth.ts",
        "src/lib/auth/session.ts",
        "src/lib/db/schema.ts",
        "src/lib/openapi/descriptions.ts",
        "src/lib/openapi/enrich.ts",
        "src/lib/openapi/merge.ts",
        "src/lib/services/dependencies.ts",
        "src/lib/services/db-service.ts",
        "src/lib/validation/request.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
