import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import type { Context } from "hono";
import { OPENAPI_BASE_DOCUMENT, OPENAPI_JSON_PATHS, OPENAPI_UI_PATHS } from "../app/openapi";
import { runInBackground } from "../lib/http/background-task";
import { internalError, notFound } from "../lib/http/response";
import { enrichOpenApiDocument } from "../lib/openapi/enrich";
import { mergeOpenApiDocuments, type OpenAPIDocument } from "../lib/openapi/merge";
import { errorResponses } from "../lib/openapi/responses";
import { ApiOpenApiDocumentSchema } from "../lib/openapi/schemas";
import type { AppDependencies } from "../lib/services/dependencies";
import HonoAppType from "../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

const OPENAPI_CACHE_TTL_MS = 120_000;
const OPENAPI_CACHE_STALE_MS = 300_000;
const DOCS_CACHE_CONTROL =
  "public, max-age=30, s-maxage=120, stale-while-revalidate=300";

type OpenApiCacheEntry = {
  document: OpenAPIDocument;
  expiresAt: number;
  staleUntil: number;
};

const openApiDocumentCache = new Map<string, OpenApiCacheEntry>();
const openApiDocumentRefreshTasks = new Map<string, Promise<void>>();

const createOpenApiJsonRoute = (path: string, operationId: string) =>
  createRoute({
    method: "get",
    path,
    tags: ["Docs"],
    operationId,
    responses: {
      200: {
        description: "통합 OpenAPI 문서 조회 성공",
        content: {
          "application/json": {
            schema: ApiOpenApiDocumentSchema,
          },
        },
      },
      404: errorResponses[404],
      500: errorResponses[500],
    },
  });

const createDocsUiRoute = (path: string, operationId: string) =>
  createRoute({
    method: "get",
    path,
    tags: ["Docs"],
    operationId,
    responses: {
      200: {
        description: "Scalar API Reference 페이지",
        content: {
          "text/html": {
            schema: z.string(),
          },
        },
      },
      404: errorResponses[404],
      500: errorResponses[500],
    },
  });

const buildOpenApiDocument = async (
  c: Context<HonoAppType>,
  app: App,
  dependencies: AppDependencies,
) => {
  const internalDoc = app.getOpenAPI31Document({
    ...OPENAPI_BASE_DOCUMENT,
    servers: [{ url: new URL(c.req.url).origin }],
  });
  const authDoc = await dependencies.getAuthOpenApiSchema(c);
  const merged = mergeOpenApiDocuments(internalDoc, authDoc);
  return enrichOpenApiDocument(merged);
};

const readAuthSchemaCacheSignature = (c: Context<HonoAppType>): string => {
  const env = c.env;
  return [
    env?.BETTER_AUTH_URL ?? "",
    env?.BETTER_AUTH_TRUSTED_ORIGINS ?? "",
    env?.BETTER_AUTH_EMAIL_AND_PASSWORD_ENABLED ?? "",
    env?.GOOGLE_CLIENT_ID ?? "",
    env?.GOOGLE_CLIENT_SECRET ?? "",
  ].join("|");
};

const readOpenApiDocumentCacheKey = (c: Context<HonoAppType>): string => {
  return `${new URL(c.req.url).origin}|${readAuthSchemaCacheSignature(c)}`;
};

const cacheOpenApiDocument = (cacheKey: string, document: OpenAPIDocument): void => {
  const now = Date.now();
  openApiDocumentCache.set(cacheKey, {
    document,
    expiresAt: now + OPENAPI_CACHE_TTL_MS,
    staleUntil: now + OPENAPI_CACHE_TTL_MS + OPENAPI_CACHE_STALE_MS,
  });
};

const setDocsCacheHeaders = (c: Context<HonoAppType>): void => {
  c.header("Cache-Control", DOCS_CACHE_CONTROL);
};

const ensureDocsEnabled = (
  c: Context<HonoAppType>,
  dependencies: AppDependencies,
): Response | null => {
  if (dependencies.isDocsEnabled(c)) {
    return null;
  }

  return notFound(c, "개발 환경에서만 OpenAPI 문서를 제공합니다.");
};

/**
 * registerDocsRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 네트워크 실패/타임아웃 상황을 고려해 예외 처리와 기본값 규약을 유지해야 합니다.
 */
export const registerDocsRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  const openApiJsonRoutes = OPENAPI_JSON_PATHS.map((path, index) =>
    createOpenApiJsonRoute(path, index === 0 ? "getOpenApiDocument" : "getOpenApiDocumentAlias"),
  );

  for (const route of openApiJsonRoutes) {
    app.openapi(route, async (c): Promise<any> => {
      const denied = ensureDocsEnabled(c, dependencies);
      if (denied) {
        return denied;
      }

      const cacheKey = readOpenApiDocumentCacheKey(c);
      const now = Date.now();
      const cached = openApiDocumentCache.get(cacheKey);

      if (cached && now <= cached.expiresAt) {
        setDocsCacheHeaders(c);
        return c.json(cached.document, 200);
      }

      if (cached && now <= cached.staleUntil) {
        if (!openApiDocumentRefreshTasks.has(cacheKey)) {
          const refreshTask = (async () => {
            try {
              const refreshedDocument = await buildOpenApiDocument(
                c,
                app,
                dependencies,
              );
              cacheOpenApiDocument(cacheKey, refreshedDocument);
            } finally {
              openApiDocumentRefreshTasks.delete(cacheKey);
            }
          })();
          openApiDocumentRefreshTasks.set(cacheKey, refreshTask);
          await runInBackground(c, refreshTask, {
            fallback: "fire-and-forget",
          });
        }

        setDocsCacheHeaders(c);
        return c.json(cached.document, 200);
      }

      try {
        const document = await buildOpenApiDocument(c, app, dependencies);
        cacheOpenApiDocument(cacheKey, document);
        setDocsCacheHeaders(c);
        return c.json(document, 200);
      } catch {
        return internalError(c, "OpenAPI 문서를 생성하지 못했습니다.");
      }
    });
  }

  const scalarReference = Scalar<HonoAppType>({
    url: "/api/openapi.json",
    pageTitle: "Yonyoung API Docs",
    theme: "saturn",
  });

  const docsUiRoutes = OPENAPI_UI_PATHS.map((path, index) =>
    createDocsUiRoute(path, index === 0 ? "getScalarApiReference" : "getScalarApiReferenceAlias"),
  );

  for (const route of docsUiRoutes) {
    app.openapi(route, async (c): Promise<any> => {
      const denied = ensureDocsEnabled(c, dependencies);
      if (denied) {
        return denied;
      }

      try {
        setDocsCacheHeaders(c);
        return scalarReference(c, async () => {});
      } catch {
        return internalError(c, "OpenAPI 문서 UI를 렌더링하지 못했습니다.");
      }
    });
  }
};
