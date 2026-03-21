import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import { badRequest, forbidden, ok } from "../lib/http/response";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor } from "../lib/http/authz";
import { can } from "../lib/authorization/policy";
import { dataResponse, errorResponses } from "../lib/openapi/responses";
import {
  ApiAdminDashboardStatsQuerySchema,
  ApiAdminDashboardStatsSchema,
} from "../lib/openapi/schemas";
import {
  readR2TotalUsageBytes,
  R2_STORAGE_LIMIT_BYTES,
} from "../lib/storage/usage";
import { resolveR2Bucket } from "../infra/r2/client";

type App = OpenAPIHono<HonoAppType>;

const getAdminDashboardStatsRoute = createRoute({
  method: "get",
  path: "/api/admin/dashboard",
  tags: ["Dashboard"],
  operationId: "getAdminDashboardStats",
  security: [{ cookieAuth: [] }],
  request: {
    query: ApiAdminDashboardStatsQuerySchema,
  },
  responses: {
    200: dataResponse(ApiAdminDashboardStatsSchema, "관리자 대시보드 집계 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

/**
 * registerDashboardRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
export const registerDashboardRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(getAdminDashboardStatsRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!can(actorResult.actor.role, "user", "read")) {
      return forbidden(c);
    }

    const query = ApiAdminDashboardStatsQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      return badRequest(c, query.error.issues[0]?.message ?? "잘못된 요청입니다.");
    }

    const stats = await dependencies
      .getDataService(c)
      .getAdminDashboardStats(query.data.generationSortOrder ?? null);

    try {
      const r2StorageUsedBytes = await readR2TotalUsageBytes(
        resolveR2Bucket(c.env),
      );
      return ok(c, {
        ...stats,
        r2StorageUsedBytes,
        r2StorageLimitBytes: R2_STORAGE_LIMIT_BYTES,
        r2StorageUsageAvailable: true,
      });
    } catch {
      return ok(c, {
        ...stats,
        r2StorageUsedBytes: 0,
        r2StorageLimitBytes: R2_STORAGE_LIMIT_BYTES,
        r2StorageUsageAvailable: false,
      });
    }
  });
};
