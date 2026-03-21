import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev } from "wrangler";

let worker:
  | Awaited<ReturnType<typeof unstable_dev>>
  | null = null;

describe("worker runtime integration", () => {
  beforeAll(async () => {
    worker = await unstable_dev("src/index.ts", {
      config: "wrangler.jsonc",
      localProtocol: "http",
      vars: {
        BETTER_AUTH_URL: "http://localhost:8787",
        BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
        BETTER_AUTH_SECRET:
          "test-only-better-auth-secret-at-least-32-characters",
        GOOGLE_CLIENT_ID: "test-google-client-id",
        GOOGLE_CLIENT_SECRET: "test-google-client-secret",
        R2_S3_ENDPOINT: "https://example-account.r2.cloudflarestorage.com",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "yonyoung-storage",
        R2_PUBLIC_URL_SIGNING_SECRET:
          "test-public-url-signing-secret-at-least-32-characters",
      },
    });
  }, 120_000);

  afterAll(async () => {
    if (worker) {
      await worker.stop();
      worker = null;
    }
  });

  it(
    "/health responds in Workers runtime with request tracking headers",
    async () => {
      const response = await worker!.fetch("/health");

      expect([200, 503]).toContain(response.status);
      const body = (await response.json()) as {
        status: string;
        checks: Array<{ service: string; status: string }>;
      };
      if (response.status === 200) {
        expect(body.status).toBe("healthy");
      } else {
        expect(body.status).toBe("unhealthy");
      }
      expect(body.checks.length).toBeGreaterThan(0);
      expect(response.headers.get("x-request-id")).toBeTruthy();
      expect(response.headers.get("server-timing")).toContain("total;dur=");
    },
    15_000,
  );

  it(
    "/api/* not-found responses still include edge security headers",
    async () => {
      const response = await worker!.fetch("/api/unknown-endpoint");

      expect(response.status).toBe(404);
      expect(response.headers.get("content-security-policy")).toContain(
        "default-src 'none'",
      );
      expect(response.headers.get("content-security-policy-report-only")).toBeNull();
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    },
    15_000,
  );

  it(
    "/ responds with HTML page containing status hooks",
    async () => {
      const response = await worker!.fetch("/");

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");

      const html = await response.text();
      expect(html).toContain('id="error-banner"');
      expect(html).toContain('id="health-refresh-btn"');
      expect(html).toContain('data-health-endpoint="/health"');
      expect(html).toContain("fetch(healthEndpoint");
    },
    15_000,
  );
});
