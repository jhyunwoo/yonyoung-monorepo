import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { OpenAPIDocument } from "../lib/openapi/merge";
import { REQUIRED_DESCRIPTION_SECTIONS } from "../lib/openapi/descriptions";

const authOpenApiFixtureWithUnknownPath: OpenAPIDocument = {
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
          200: { description: "ok" },
        },
      },
    },
    "/unknown-runtime-auth-endpoint": {
      post: {
        operationId: "unknownAuthOperation",
        responses: {
          200: { description: "ok" },
          400: { description: "bad request" },
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
  },
};

describe("OpenAPI docs quality", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("모든 operation에 summary/description과 필수 섹션이 존재해야 한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createApp({
            /**
       * resolveActor 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      resolveActor: async () => null,
            /**
       * getAuthOpenApiSchema 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      getAuthOpenApiSchema: async () => authOpenApiFixtureWithUnknownPath,
      isDocsEnabled: () => true,
    });

    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(200);

    const body = (await response.json()) as OpenAPIDocument;
    const paths = body.paths ?? {};

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== "object") {
        continue;
      }

      for (const [method, operation] of Object.entries(pathItem)) {
        const lowerMethod = method.toLowerCase();
        if (
          lowerMethod !== "get" &&
          lowerMethod !== "post" &&
          lowerMethod !== "put" &&
          lowerMethod !== "patch" &&
          lowerMethod !== "delete" &&
          lowerMethod !== "options" &&
          lowerMethod !== "head" &&
          lowerMethod !== "trace"
        ) {
          continue;
        }

        expect(
          typeof (operation as { summary?: unknown }).summary,
          `${path}#${method} summary`,
        ).toBe("string");
        expect(
          typeof (operation as { description?: unknown }).description,
          `${path}#${method} description`,
        ).toBe("string");

        const description = (operation as { description?: string }).description ?? "";
        for (const section of REQUIRED_DESCRIPTION_SECTIONS) {
          expect(description, `${path}#${method} missing ${section}`).toContain(
            section,
          );
        }
      }
    }
  });

  it("보호 라우트 security와 주요 스키마 description/example가 유지되어야 한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createApp({
            /**
       * resolveActor 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      resolveActor: async () => null,
            /**
       * getAuthOpenApiSchema 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      getAuthOpenApiSchema: async () => authOpenApiFixtureWithUnknownPath,
      isDocsEnabled: () => true,
    });

    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(200);

    const body = (await response.json()) as OpenAPIDocument;
    const activityPost = body.paths?.["/api/activities"]?.post;
    expect(activityPost?.security).toEqual([{ cookieAuth: [] }]);

    const schemas = body.components?.schemas ?? {};
    const apiActivity = schemas.ApiActivity as
      | { properties?: Record<string, { description?: string; example?: unknown }> }
      | undefined;
    const apiExhibition = schemas.ApiExhibition as
      | { properties?: Record<string, { description?: string; example?: unknown }> }
      | undefined;
    const apiUser = schemas.ApiUser as
      | { properties?: Record<string, { description?: string; example?: unknown }> }
      | undefined;

    expect(apiActivity?.properties?.title?.description).toContain("활동 제목");
    expect(apiActivity?.properties?.startDate?.description).toContain(
      "Unix timestamp(ms)",
    );
    expect(apiActivity?.properties?.endDate?.description).toContain(
      "Unix timestamp(ms)",
    );
    expect(apiExhibition?.properties?.title?.description).toContain("전시 제목");
    expect(apiUser?.properties?.email?.description).toContain("사용자 이메일");
    expect(apiUser?.properties?.email?.example).toBe(
      "regular_member@yonyoung.example",
    );
  });

  it("알 수 없는 auth endpoint도 fallback 설명이 자동 생성되어야 한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createApp({
            /**
       * resolveActor 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      resolveActor: async () => null,
            /**
       * getAuthOpenApiSchema 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
       * @returns 조회/계산된 결과 값을 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      getAuthOpenApiSchema: async () => authOpenApiFixtureWithUnknownPath,
      isDocsEnabled: () => true,
    });

    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(200);
    const body = (await response.json()) as OpenAPIDocument;

    const unknownAuthOperation =
      body.paths?.["/api/auth/unknown-runtime-auth-endpoint"]?.post;
    expect(typeof unknownAuthOperation?.summary).toBe("string");
    expect(unknownAuthOperation?.summary?.length ?? 0).toBeGreaterThan(0);
    expect(unknownAuthOperation?.description).toContain("## 기본 설명");
    expect(unknownAuthOperation?.description).toContain("## 오류 응답 가이드");
  });
});
