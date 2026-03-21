import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import { badRequest, noContent, notFound, ok } from "../lib/http/response";
import { parseBody, parseParams } from "../lib/validation/request";
import { AppDependencies } from "../lib/services/dependencies";
import { requireActor, requirePermission } from "../lib/http/authz";
import {
  recordAuditLog,
  readChangedFields,
  withUpdatedByActor,
} from "../lib/audit";
import {
  hasMeaningfulRichTextHtml,
  sanitizeRichTextHtml,
} from "../lib/content/rich-text";
import {
  createdResponse,
  dataResponse,
  errorResponses,
  jsonBody,
  noContentResponse,
} from "../lib/openapi/responses";
import {
  ApiActivityImageSchema,
  ApiListActivitiesQuerySchema,
  ApiActivitySchema,
  ApiCreateActivityImageBatchSchema,
  ApiCreateActivityImageSchema,
  ApiCreateActivitySchema,
  ApiIdParamSchema,
  ApiImageIdParamSchema,
  ApiUpdateActivityImageBatchSchema,
  ApiUpdateActivityImageSchema,
  ApiUpdateActivitySchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const sanitizeActivityDescriptionField = <T extends { description: string }>(
  activity: T,
): T => ({
  ...activity,
  description: sanitizeRichTextHtml(activity.description),
});

const listActivitiesRoute = createRoute({
  method: "get",
  path: "/api/activities",
  tags: ["Activities"],
  operationId: "listActivities",
  security: [{ cookieAuth: [] }],
  request: {
    query: ApiListActivitiesQuerySchema,
  },
  responses: {
    200: dataResponse(ApiActivitySchema.array(), "활동 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createActivityRoute = createRoute({
  method: "post",
  path: "/api/activities",
  tags: ["Activities"],
  operationId: "createActivity",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateActivitySchema, "활동 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiActivitySchema, "활동 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const getActivityByIdRoute = createRoute({
  method: "get",
  path: "/api/activities/{id}",
  tags: ["Activities"],
  operationId: "getActivityById",
  security: [{ cookieAuth: [] }],
  request: { params: ApiIdParamSchema },
  responses: {
    200: dataResponse(ApiActivitySchema, "활동 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateActivityRoute = createRoute({
  method: "patch",
  path: "/api/activities/{id}",
  tags: ["Activities"],
  operationId: "updateActivity",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateActivitySchema, "활동 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiActivitySchema, "활동 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteActivityRoute = createRoute({
  method: "delete",
  path: "/api/activities/{id}",
  tags: ["Activities"],
  operationId: "deleteActivity",
  security: [{ cookieAuth: [] }],
  request: { params: ApiIdParamSchema },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const addActivityImageRoute = createRoute({
  method: "post",
  path: "/api/activities/{id}/images",
  tags: ["Activities"],
  operationId: "addActivityImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateActivityImageSchema, "활동 이미지 추가 요청"),
  },
  responses: {
    201: createdResponse(ApiActivityImageSchema, "활동 이미지 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateActivityImageRoute = createRoute({
  method: "patch",
  path: "/api/activities/{id}/images/{imageId}",
  tags: ["Activities"],
  operationId: "updateActivityImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiImageIdParamSchema,
    body: jsonBody(ApiUpdateActivityImageSchema, "활동 이미지 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiActivityImageSchema, "활동 이미지 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const addActivityImagesBatchRoute = createRoute({
  method: "post",
  path: "/api/activities/{id}/images/batch",
  tags: ["Activities"],
  operationId: "addActivityImagesBatch",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateActivityImageBatchSchema, "활동 이미지 일괄 추가 요청"),
  },
  responses: {
    201: createdResponse(ApiActivityImageSchema.array(), "활동 이미지 일괄 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateActivityImagesBatchRoute = createRoute({
  method: "patch",
  path: "/api/activities/{id}/images/batch",
  tags: ["Activities"],
  operationId: "updateActivityImagesBatch",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateActivityImageBatchSchema, "활동 이미지 일괄 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiActivityImageSchema.array(), "활동 이미지 일괄 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteActivityImageRoute = createRoute({
  method: "delete",
  path: "/api/activities/{id}/images/{imageId}",
  tags: ["Activities"],
  operationId: "deleteActivityImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiImageIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

export const registerActivityRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listActivitiesRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "read");
    if (denied) {
      return denied;
    }

    const query = ApiListActivitiesQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      return badRequest(c, query.error.issues.map((issue) => issue.message).join(", "));
    }

    const data = await dependencies.getDataService(c).listActivities(query.data.generationId);
    return ok(c, data.map(sanitizeActivityDescriptionField));
  });

  app.openapi(createActivityRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateActivitySchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const sanitizedDescription = sanitizeRichTextHtml(body.data.description);
    if (!hasMeaningfulRichTextHtml(sanitizedDescription)) {
      return badRequest(c, "활동 설명은 비워둘 수 없습니다.");
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.createActivity({
      ...body.data,
      description: sanitizedDescription,
    });

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "activity",
      resourceId: data.id,
      action: "create",
      changedFields: readChangedFields(body.data, [
        "title",
        "description",
        "startDate",
        "endDate",
        "coverImageUrl",
        "generationId",
      ]),
    });

    return ok(
      c,
      withUpdatedByActor(sanitizeActivityDescriptionField(data), actorResult.actor),
      201,
    );
  });

  app.openapi(getActivityByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies.getDataService(c).getActivityById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, sanitizeActivityDescriptionField(data));
  });

  app.openapi(updateActivityRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateActivitySchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    const nextBody = { ...body.data };
    if (nextBody.description !== undefined) {
      const sanitizedDescription = sanitizeRichTextHtml(nextBody.description);
      if (!hasMeaningfulRichTextHtml(sanitizedDescription)) {
        return badRequest(c, "활동 설명은 비워둘 수 없습니다.");
      }
      nextBody.description = sanitizedDescription;
    }

    if (Object.keys(nextBody).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.updateActivity(params.data.id, nextBody);
    if (!data) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "activity",
      resourceId: data.id,
      action: "update",
      changedFields: readChangedFields(nextBody, ["updatedAt"]),
    });

    return ok(
      c,
      withUpdatedByActor(sanitizeActivityDescriptionField(data), actorResult.actor),
    );
  });

  app.openapi(deleteActivityRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const deleted = await dataService.deleteActivity(params.data.id);
    if (!deleted) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "activity",
      resourceId: params.data.id,
      action: "delete",
      changedFields: ["deletedAt"],
    });

    return noContent(c);
  });

  // 세부 이미지는 활동 본문 수정과 동일 권한으로 분리 관리한다.
  app.openapi(addActivityImageRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiCreateActivityImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.addActivityImage(params.data.id, body.data);
    if (!data) {
      return notFound(c, "활동을 찾을 수 없습니다.");
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "activity",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return ok(c, data, 201);
  });

  app.openapi(addActivityImagesBatchRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiCreateActivityImageBatchSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.addActivityImages(params.data.id, body.data);
    if (!data) {
      return notFound(c, "활동을 찾을 수 없습니다.");
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "activity",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return ok(c, data, 201);
  });

  app.openapi(updateActivityImagesBatchRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiUpdateActivityImageBatchSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.updateActivityImages(params.data.id, body.data);
    if (!data) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "activity",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return ok(c, data);
  });

  app.openapi(updateActivityImageRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiImageIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiUpdateActivityImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.updateActivityImage(
      params.data.id,
      params.data.imageId,
      body.data,
    );
    if (!data) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "activity",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return ok(c, data);
  });

  app.openapi(deleteActivityImageRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "activity", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiImageIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const deleted = await dataService.deleteActivityImage(
      params.data.id,
      params.data.imageId,
    );
    if (!deleted) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "activity",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return noContent(c);
  });
};
