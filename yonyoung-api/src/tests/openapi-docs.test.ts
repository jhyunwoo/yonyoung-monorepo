import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { REQUIRED_DESCRIPTION_SECTIONS } from "../lib/openapi/descriptions";
import { OpenAPIDocument } from "../lib/openapi/merge";
import { expectErrorCode } from "./test-helpers";

const authOpenApiFixture: OpenAPIDocument = {
  openapi: "3.1.1",
  info: {
    title: "Better Auth",
    version: "1.0.0",
  },
  paths: {
    "/get-session": {
      get: {
        operationId: "getSession",
        responses: {
          200: {
            description: "ok",
          },
        },
      },
    },
    "/sign-in/social": {
      post: {
        operationId: "signInSocial",
        responses: {
          200: {
            description: "ok",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      AuthSession: {
        type: "object",
      },
    },
    securitySchemes: {
      apiKeyCookie: {
        type: "apiKey",
        in: "cookie",
        name: "apiKeyCookie",
      },
    },
  },
  tags: [{ name: "Default", description: "Auth default endpoints" }],
};

type CreateDocsAppInput = {
  isDocsEnabled?: boolean;
  getAuthOpenApiSchema?: () => Promise<OpenAPIDocument>;
};

const createDocsApp = (input: CreateDocsAppInput = {}) => {
  const {
    isDocsEnabled = true,
    getAuthOpenApiSchema = async () => authOpenApiFixture,
  } = input;

  return createApp({
    resolveActor: async () => null,
    getAuthOpenApiSchema,
    isDocsEnabled: () => isDocsEnabled,
  });
};

describe("OpenAPI docs routes", () => {
  it("docs 비활성화 상태에서는 /api/docs에서 404를 반환한다", async () => {
    const app = createDocsApp({ isDocsEnabled: false });

    const response = await app.request("/api/docs");
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("docs 비활성화 상태에서는 /api/openapi.json에서 404를 반환한다", async () => {
    const app = createDocsApp({ isDocsEnabled: false });

    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("docs 비활성화 상태에서는 /ui와 /doc alias도 함께 숨긴다", async () => {
    const app = createDocsApp({ isDocsEnabled: false });

    const uiResponse = await app.request("/ui");
    expect(uiResponse.status).toBe(404);
    await expectErrorCode(uiResponse, "NOT_FOUND");

    const docResponse = await app.request("/doc");
    expect(docResponse.status).toBe(404);
    await expectErrorCode(docResponse, "NOT_FOUND");
  });

  it("docs 활성화 상태에서 통합 OpenAPI 문서를 반환한다", async () => {
    const app = createDocsApp({ isDocsEnabled: true });

    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(200);

    const body = (await response.json()) as OpenAPIDocument;
    expect(body.openapi).toBe("3.1.1");

    expect(body.paths?.["/api/activities"]).toBeDefined();
    expect(body.paths?.["/api/users/{id}"]).toBeDefined();

    expect(body.paths?.["/api/auth/get-session"]).toBeDefined();
    expect(body.paths?.["/api/auth/sign-in/social"]).toBeDefined();

    const activityPost = body.paths?.["/api/activities"]?.post;
    expect(activityPost?.security).toEqual([{ cookieAuth: [] }]);

    expect(activityPost?.requestBody).toBeDefined();
    expect(activityPost?.responses?.["201"]).toBeDefined();

    expect(body.components?.schemas?.ApiErrorResponse).toBeDefined();
    expect(body.components?.schemas?.AuthSession).toBeDefined();

    expect(typeof activityPost?.summary).toBe("string");
    expect(activityPost?.summary?.length ?? 0).toBeGreaterThan(0);
    for (const section of REQUIRED_DESCRIPTION_SECTIONS) {
      expect(activityPost?.description).toContain(section);
    }

    const getSession = body.paths?.["/api/auth/get-session"]?.get;
    expect(typeof getSession?.summary).toBe("string");
    for (const section of REQUIRED_DESCRIPTION_SECTIONS) {
      expect(getSession?.description).toContain(section);
    }

    expect(activityPost?.responses?.["403"]?.description).toContain(
      "역할 기반 권한 정책",
    );
  });

  it("docs 활성화 상태에서 /api/docs 페이지를 반환한다", async () => {
    const app = createDocsApp({ isDocsEnabled: true });

    const response = await app.request("/api/docs");
    expect(response.status).toBe(200);
    const csp = response.headers.get("content-security-policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://cdn.jsdelivr.net");
    expect(response.headers.get("content-security-policy-report-only")).toBeNull();
    const html = await response.text();
    expect(html.length).toBeGreaterThan(0);
    expect(html.toLowerCase()).toContain("scalar");
  });

  it("동일 origin 요청에서는 OpenAPI 문서 캐시를 재사용해 재생성을 피한다", async () => {
    const getAuthOpenApiSchema = vi.fn(async () => authOpenApiFixture);
    const app = createDocsApp({
      isDocsEnabled: true,
      getAuthOpenApiSchema,
    });
    const origin = `https://docs-cache-${Date.now()}.example.com`;

    const first = await app.request(new Request(`${origin}/api/openapi.json`));
    expect(first.status).toBe(200);

    const second = await app.request(new Request(`${origin}/api/openapi.json`));
    expect(second.status).toBe(200);
    expect(second.headers.get("cache-control")).toBe(
      "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
    );
    expect(getAuthOpenApiSchema).toHaveBeenCalledTimes(1);
  });

  it("stale 구간에서는 캐시를 즉시 반환하고 백그라운드 갱신을 수행한다", async () => {
    const baseNow = Date.now();
    const nowSpy = vi.spyOn(Date, "now");
    let authSchemaRevision = 0;
    const getAuthOpenApiSchema = vi.fn(async () => {
      authSchemaRevision += 1;
      return {
        openapi: "3.1.1",
        info: {
          title: "Better Auth",
          version: String(authSchemaRevision),
        },
        paths: {
          [`/session-rev-${authSchemaRevision}`]: {
            get: {
              operationId: `getSessionRev${authSchemaRevision}`,
              responses: {
                200: {
                  description: "ok",
                },
              },
            },
          },
        },
      } satisfies OpenAPIDocument;
    });
    const app = createDocsApp({
      isDocsEnabled: true,
      getAuthOpenApiSchema,
    });
    const origin = `https://docs-stale-${Date.now()}.example.com`;

    nowSpy.mockReturnValue(baseNow);
    const first = await app.request(new Request(`${origin}/api/openapi.json`));
    expect(first.status).toBe(200);
    const firstBody = await first.text();

    nowSpy.mockReturnValue(baseNow + 130_000);
    const second = await app.request(new Request(`${origin}/api/openapi.json`));
    expect(second.status).toBe(200);
    const secondBody = await second.text();

    expect(secondBody).toBe(firstBody);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(getAuthOpenApiSchema).toHaveBeenCalledTimes(2);
  });

  it("기본 의존성 사용 시 DOCS_ENABLED=true 환경 변수에서 docs를 공개한다", async () => {
    const app = createApp({
      resolveActor: async () => null,
      getAuthOpenApiSchema: async () => authOpenApiFixture,
    });

    const response = await app.request(
      "/api/openapi.json",
      undefined,
      { DOCS_ENABLED: "true" } as any,
    );

    expect(response.status).toBe(200);
  });

  it("기본 의존성 사용 시 DOCS_ENABLED=false 환경 변수에서 docs를 숨긴다", async () => {
    const app = createApp({
      resolveActor: async () => null,
      getAuthOpenApiSchema: async () => authOpenApiFixture,
    });

    const response = await app.request(
      "/api/openapi.json",
      undefined,
      { DOCS_ENABLED: "false" } as any,
    );

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("레거시 DOCS_AUTH_IN_PROD=true 환경 변수도 docs 비노출로 해석한다", async () => {
    const app = createApp({
      resolveActor: async () => null,
      getAuthOpenApiSchema: async () => authOpenApiFixture,
    });

    const response = await app.request(
      "/api/openapi.json",
      undefined,
      { DOCS_AUTH_IN_PROD: "true" } as any,
    );

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });
});
