import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { API_PROXY_ALLOWED_PREFIXES } from "@/server/security/api-proxy-prefixes";

const API_CLIENT_SOURCE_FILES = [
  "features/dashboard/actions/admin-write-actions.ts",
  "features/dashboard/api/admin-api/resources.ts",
  "features/dashboard/api/admin-api/upload.ts",
  "features/dashboard/generation/generation-fetcher.ts",
  "features/public/services/public-read-service.ts",
] as const;

const API_PATH_LITERAL_PATTERN = /["'`](\/(?:api\/)?[A-Za-z0-9-]+(?:\/[^"'`\n]*)?)["'`]/g;

const extractTopLevelPrefixes = (sourceCode: string): string[] => {
  const prefixes = new Set<string>();

  for (const match of sourceCode.matchAll(API_PATH_LITERAL_PATTERN)) {
    const rawPath = match[1];
    if (!rawPath) {
      continue;
    }

    const normalizedPath = rawPath.startsWith("/api/") ? rawPath.slice(5) : rawPath.slice(1);
    if (normalizedPath === "api") {
      continue;
    }

    const [prefix] = normalizedPath.split(/[/?]/, 1);
    if (!prefix) {
      continue;
    }

    prefixes.add(prefix);
  }

  return [...prefixes];
};

describe("server/security/api-proxy-prefixes", () => {
  it("allowlists every top-level prefix used by the web API clients", () => {
    const discoveredPrefixes = new Set<string>();

    for (const relativePath of API_CLIENT_SOURCE_FILES) {
      const absolutePath = path.join(process.cwd(), relativePath);
      const sourceCode = fs.readFileSync(absolutePath, "utf8");
      for (const prefix of extractTopLevelPrefixes(sourceCode)) {
        discoveredPrefixes.add(prefix);
      }
    }

    const missingPrefixes = [...discoveredPrefixes]
      .filter(
        (prefix) =>
          !API_PROXY_ALLOWED_PREFIXES.includes(
            prefix as (typeof API_PROXY_ALLOWED_PREFIXES)[number],
          ),
      )
      .sort();

    expect(missingPrefixes).toEqual([]);
  });

  it("keeps known high-risk dashboard prefixes reachable through the proxy", () => {
    expect(API_PROXY_ALLOWED_PREFIXES).toEqual(
      expect.arrayContaining(["audit", "notices", "recruiting"]),
    );
  });
});
