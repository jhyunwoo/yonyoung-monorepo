import { describe, expect, it } from "vitest";
import { runInfrastructureHealthChecks } from "../lib/health/check";
import type { AppBindings } from "../types/honoAppType";

const createRpcLikeFetcher = (): Fetcher => {
  return new Proxy(
    {
      fetch: async () => new Response(null, { status: 404 }),
    },
    {
      get: (target, property, receiver) => {
        if (Reflect.has(target, property)) {
          return Reflect.get(target, property, receiver);
        }

        return () => {
          throw new Error(
            `The RPC receiver does not implement the method "${String(property)}".`,
          );
        };
      },
    },
  ) as unknown as Fetcher;
};

const createHealthyEnv = (): Partial<AppBindings> & Record<string, unknown> => {
  const objects = new Map<string, Uint8Array>();

  return {
    db: {
      prepare: () => ({
        first: async () => ({ result: 1 }),
      }),
      batch: async () => [],
    } as unknown as D1Database,
    r2: {
      put: async (
        key: string,
        value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
      ) => {
        if (typeof value === "string") {
          objects.set(key, new TextEncoder().encode(value));
        } else if (value instanceof Uint8Array) {
          objects.set(key, value);
        } else if (value instanceof ArrayBuffer) {
          objects.set(key, new Uint8Array(value));
        } else {
          objects.set(key, new Uint8Array([1]));
        }
        return { key } as R2Object;
      },
      head: async (key: string) => {
        if (!objects.has(key)) {
          return null;
        }
        return { key } as R2Object;
      },
      delete: async (key: string) => {
        objects.delete(key);
      },
    } as unknown as R2Bucket,
    CHAT_ROOM_DO: {
      idFromName: () => ({}) as DurableObjectId,
      get: () =>
        ({
          fetch: async () => new Response(null, { status: 404 }),
        }) as unknown as DurableObjectStub,
    } as unknown as DurableObjectNamespace,
    ASSETS: createRpcLikeFetcher(),
    NOTIFIER_SERVICE: {
      fetch: async () => new Response(null, { status: 204 }),
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

describe("runInfrastructureHealthChecks", () => {
  it("모든 의존성 점검이 성공하면 healthy를 반환한다", async () => {
    const report = await runInfrastructureHealthChecks(createHealthyEnv());

    expect(report.status).toBe("healthy");
    expect(report.summary.unhealthy).toBe(0);
    expect(report.summary.healthy).toBeGreaterThan(0);
    expect(
      report.checks.some(
        (check) => check.service === "d1" && check.status === "healthy",
      ),
    ).toBe(true);
    expect(
      report.checks.some(
        (check) => check.service === "r2" && check.status === "healthy",
      ),
    ).toBe(true);
    expect(
      report.checks.some(
        (check) =>
          check.service === "durable_object" && check.status === "healthy",
      ),
    ).toBe(true);
    expect(
      report.checks.some(
        (check) =>
          check.binding === "ASSETS" &&
          ["d1", "r2", "durable_object"].includes(check.service),
      ),
    ).toBe(false);
  });

  it("필수 의존성이 누락되면 unhealthy를 반환한다", async () => {
    const report = await runInfrastructureHealthChecks({
      ASSETS: {
        fetch: async () => new Response(null, { status: 404 }),
      } as unknown as Fetcher,
    });

    expect(report.status).toBe("unhealthy");
    expect(report.summary.unhealthy).toBeGreaterThan(0);
    expect(
      report.checks.some(
        (check) => check.service === "d1" && check.status === "unhealthy",
      ),
    ).toBe(true);
    expect(
      report.checks.some(
        (check) => check.service === "r2" && check.status === "unhealthy",
      ),
    ).toBe(true);
    expect(
      report.checks.some(
        (check) =>
          check.service === "r2_presign" && check.status === "unhealthy",
      ),
    ).toBe(true);
  });
});
