import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type HonoAppType from "../types/honoAppType";
import { badRequest, forbidden, ok } from "../lib/http/response";
import type { AppDependencies } from "../lib/services/dependencies";
import { requireActor } from "../lib/http/authz";
import { parseBody } from "../lib/validation/request";
import {
  hasMeaningfulRichTextHtml,
  sanitizeRichTextHtml,
} from "../lib/content/rich-text";
import { dataResponse, errorResponses, jsonBody } from "../lib/openapi/responses";
import {
  ApiRecruitingPlanSchema,
  ApiUpsertCurrentRecruitingPlanSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const isPrivilegedActor = (role: string): boolean =>
  role === "president" || role === "vice_president";

const getCurrentRecruitingPlanRoute = createRoute({
  method: "get",
  path: "/api/recruiting-plan/current",
  tags: ["RecruitingPlan"],
  operationId: "getCurrentRecruitingPlan",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(
      ApiRecruitingPlanSchema.nullable(),
      "현재 연도 모집 계획 조회 성공",
    ),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const upsertCurrentRecruitingPlanRoute = createRoute({
  method: "patch",
  path: "/api/recruiting-plan/current",
  tags: ["RecruitingPlan"],
  operationId: "upsertCurrentRecruitingPlan",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(
      ApiUpsertCurrentRecruitingPlanSchema,
      "현재 연도 모집 계획 수정 요청",
    ),
  },
  responses: {
    200: dataResponse(ApiRecruitingPlanSchema, "현재 연도 모집 계획 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

export const registerRecruitingPlanRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(getCurrentRecruitingPlanRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!isPrivilegedActor(actorResult.actor.role)) {
      return forbidden(c);
    }

    const data = await dependencies.getDataService(c).getCurrentRecruitingPlan();
    return ok(c, data);
  });

  app.openapi(upsertCurrentRecruitingPlanRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!isPrivilegedActor(actorResult.actor.role)) {
      return forbidden(c);
    }

    const body = await parseBody(c, ApiUpsertCurrentRecruitingPlanSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const sanitizedContent = sanitizeRichTextHtml(body.data.content);
    if (!hasMeaningfulRichTextHtml(sanitizedContent)) {
      return badRequest(c, "세부 내용은 비워둘 수 없습니다.");
    }

    if (body.data.recruitmentStartAt > body.data.recruitmentEndAt) {
      return badRequest(c, "모집 시작 일시는 모집 종료 일시보다 늦을 수 없습니다.");
    }

    const data = await dependencies.getDataService(c).upsertCurrentRecruitingPlan({
      title: body.data.title.trim(),
      content: sanitizedContent,
      promotionImageUrls: body.data.promotionImageUrls,
      recruitmentStartAt: new Date(body.data.recruitmentStartAt),
      recruitmentEndAt: new Date(body.data.recruitmentEndAt),
    });
    return ok(c, data);
  });
};
