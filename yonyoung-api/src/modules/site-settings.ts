import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type HonoAppType from "../types/honoAppType";
import { badRequest, forbidden, ok } from "../lib/http/response";
import { parseBody } from "../lib/validation/request";
import type { AppDependencies } from "../lib/services/dependencies";
import { requireActor } from "../lib/http/authz";
import { dataResponse, errorResponses, jsonBody } from "../lib/openapi/responses";
import {
  ApiSiteSettingsSchema,
  ApiUpdateSiteSettingsSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const isPrivilegedActor = (role: string): boolean =>
  role === "president" || role === "vice_president";

const normalizeInstagramId = (value: string): string => {
  return value.trim().replace(/^@+/, "");
};

const getSiteSettingsRoute = createRoute({
  method: "get",
  path: "/api/site-settings",
  tags: ["SiteSettings"],
  operationId: "getSiteSettings",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiSiteSettingsSchema, "웹사이트 기본 설정 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const updateSiteSettingsRoute = createRoute({
  method: "patch",
  path: "/api/site-settings",
  tags: ["SiteSettings"],
  operationId: "updateSiteSettings",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiUpdateSiteSettingsSchema, "웹사이트 기본 설정 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiSiteSettingsSchema, "웹사이트 기본 설정 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

export const registerSiteSettingsRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(getSiteSettingsRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!isPrivilegedActor(actorResult.actor.role)) {
      return forbidden(c);
    }

    const data = await dependencies.getDataService(c).getSiteSettings();
    return ok(c, data);
  });

  app.openapi(updateSiteSettingsRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!isPrivilegedActor(actorResult.actor.role)) {
      return forbidden(c);
    }

    const body = await parseBody(c, ApiUpdateSiteSettingsSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const normalized = {
      ...body.data,
      ...(body.data.footerInstagramId !== undefined
        ? { footerInstagramId: normalizeInstagramId(body.data.footerInstagramId) }
        : {}),
    };

    const data = await dependencies.getDataService(c).updateSiteSettings(normalized);
    return ok(c, data);
  });
};
