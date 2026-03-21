import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DB_SERVICE_PATH = join(process.cwd(), "src/lib/services/db-service.ts");

describe("d1 query safety", () => {
  it("database.prepare 쿼리는 문자열 보간 없이 bind를 사용한다", () => {
    const source = readFileSync(DB_SERVICE_PATH, "utf8");

    const preparedStatements = [
      ...source.matchAll(
        /database\s*\.\s*prepare\(\s*`([^`]*?)`\s*,?\s*\)\s*\.\s*bind\(/g,
      ),
    ];
    const interpolatedPreparedCount = preparedStatements.filter((match) =>
      match[1]?.includes("${"),
    ).length;

    expect(preparedStatements.length).toBeGreaterThan(0);
    expect(interpolatedPreparedCount).toBe(0);
  });
});
