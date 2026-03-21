import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { createTestApp, expectErrorCode, readJson } from "./test-helpers";

describe("docs and system routes", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  const createHealthBindings = () => {
    const storage = new Map<string, Uint8Array>();

    return {
      db: {
        prepare: () => ({
          first: async () => ({ result: 1 }),
        }),
        batch: async () => [],
      } as unknown as D1Database,
      r2: {
        put: async (key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob) => {
          if (typeof value === "string") {
            storage.set(key, new TextEncoder().encode(value));
          } else if (value instanceof Uint8Array) {
            storage.set(key, value);
          } else if (value instanceof ArrayBuffer) {
            storage.set(key, new Uint8Array(value));
          } else {
            storage.set(key, new Uint8Array([1]));
          }
          return { key } as R2Object;
        },
        head: async (key: string) => {
          if (!storage.has(key)) {
            return null;
          }
          return { key } as R2Object;
        },
        delete: async (key: string) => {
          storage.delete(key);
        },
      } as unknown as R2Bucket,
      ASSETS: {
        fetch: async () => new Response("not found", { status: 404 }),
      } as unknown as Fetcher,
      R2_S3_ENDPOINT: "https://example-account.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "yonyoung-storage",
      R2_PUBLIC_URL_SIGNING_SECRET:
        "test-public-url-signing-secret-at-least-32-chars",
      BETTER_AUTH_URL: "https://app.example.com",
      BETTER_AUTH_SECRET: "test-better-auth-secret-with-at-least-32-chars",
    };
  };

  it("/api/openapi.json 생성 중 예외가 발생하면 500을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: null,
      isDocsEnabled: true,
            /**
       * getAuthOpenApiSchema 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      getAuthOpenApiSchema: async () => {
        throw new Error("auth openapi unavailable");
      },
    });

    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(500);
    await expectErrorCode(response, "INTERNAL_ERROR");
  });

  it("/health는 종합 헬스 체크 결과를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: null, isDocsEnabled: true });

    const response = await app.request(
      "/health",
      undefined,
      createHealthBindings(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("server-timing")).toContain("total;dur=");
    expect(response.headers.get("x-response-time")).toMatch(/ms$/);
    const body = await readJson<{
      status: string;
      checks: Array<{ service: string; status: string }>;
      summary: {
        total: number;
      };
    }>(response);
    expect(body.status).toBe("healthy");
    expect(body.summary.total).toBeGreaterThan(0);
    expect(
      body.checks.some(
        (check) => check.service === "d1" && check.status === "healthy",
      ),
    ).toBe(true);
    expect(
      body.checks.some(
        (check) => check.service === "r2" && check.status === "healthy",
      ),
    ).toBe(true);
  });

  it("/는 API 메타 정보를 JSON으로 반환한다", async () => {
    const app = createTestApp({ actor: null, isDocsEnabled: true });

    const response = await app.request("/");
    expect(response.status).toBe(200);

    const body = await readJson<{
      status: string;
      api: string;
      version: string;
      serverTime: string;
    }>(response);

    expect(body.status).toBe("ok");
    expect(body.api).toBe("yonyoung-api");
    expect(body.version).toBe(packageJson.version);
    expect(Number.isNaN(Date.parse(body.serverTime))).toBe(false);
  });
});
