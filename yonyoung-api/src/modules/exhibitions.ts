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
  createdResponse,
  dataResponse,
  errorResponses,
  jsonBody,
  noContentResponse,
} from "../lib/openapi/responses";
import {
  ApiCreateExhibitionImageBatchSchema,
  ApiCreateExhibitionImageSchema,
  ApiCreateExhibitionSchema,
  ApiExhibitionImageSchema,
  ApiListExhibitionsQuerySchema,
  ApiExhibitionSchema,
  ApiIdParamSchema,
  ApiImageIdParamSchema,
  ApiUpdateExhibitionImageBatchSchema,
  ApiUpdateExhibitionImageSchema,
  ApiUpdateExhibitionSchema,
} from "../lib/openapi/schemas";
import {
  hasMeaningfulExhibitionRichText,
  sanitizeExhibitionRichText,
} from "../lib/content/exhibition-rich-text";

type App = OpenAPIHono<HonoAppType>;

const sanitizeExhibitionDescriptionField = <T extends { description: string }>(
  exhibition: T,
): T => ({
  ...exhibition,
  description: sanitizeExhibitionRichText(exhibition.description),
});

const listExhibitionsRoute = createRoute({
  method: "get",
  path: "/api/exhibitions",
  tags: ["Exhibitions"],
  operationId: "listExhibitions",
  security: [{ cookieAuth: [] }],
  request: {
    query: ApiListExhibitionsQuerySchema,
  },
  responses: {
    200: dataResponse(ApiExhibitionSchema.array(), "전시 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createExhibitionRoute = createRoute({
  method: "post",
  path: "/api/exhibitions",
  tags: ["Exhibitions"],
  operationId: "createExhibition",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateExhibitionSchema, "전시 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiExhibitionSchema, "전시 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const getExhibitionByIdRoute = createRoute({
  method: "get",
  path: "/api/exhibitions/{id}",
  tags: ["Exhibitions"],
  operationId: "getExhibitionById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiExhibitionSchema, "전시 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateExhibitionRoute = createRoute({
  method: "patch",
  path: "/api/exhibitions/{id}",
  tags: ["Exhibitions"],
  operationId: "updateExhibition",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateExhibitionSchema, "전시 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiExhibitionSchema, "전시 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteExhibitionRoute = createRoute({
  method: "delete",
  path: "/api/exhibitions/{id}",
  tags: ["Exhibitions"],
  operationId: "deleteExhibition",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const addExhibitionImageRoute = createRoute({
  method: "post",
  path: "/api/exhibitions/{id}/images",
  tags: ["Exhibitions"],
  operationId: "addExhibitionImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateExhibitionImageSchema, "전시 이미지 추가 요청"),
  },
  responses: {
    201: createdResponse(ApiExhibitionImageSchema, "전시 이미지 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateExhibitionImageRoute = createRoute({
  method: "patch",
  path: "/api/exhibitions/{id}/images/{imageId}",
  tags: ["Exhibitions"],
  operationId: "updateExhibitionImage",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiImageIdParamSchema,
    body: jsonBody(ApiUpdateExhibitionImageSchema, "전시 이미지 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiExhibitionImageSchema, "전시 이미지 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const addExhibitionImagesBatchRoute = createRoute({
  method: "post",
  path: "/api/exhibitions/{id}/images/batch",
  tags: ["Exhibitions"],
  operationId: "addExhibitionImagesBatch",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateExhibitionImageBatchSchema, "전시 이미지 일괄 추가 요청"),
  },
  responses: {
    201: createdResponse(ApiExhibitionImageSchema.array(), "전시 이미지 일괄 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateExhibitionImagesBatchRoute = createRoute({
  method: "patch",
  path: "/api/exhibitions/{id}/images/batch",
  tags: ["Exhibitions"],
  operationId: "updateExhibitionImagesBatch",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateExhibitionImageBatchSchema, "전시 이미지 일괄 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiExhibitionImageSchema.array(), "전시 이미지 일괄 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteExhibitionImageRoute = createRoute({
  method: "delete",
  path: "/api/exhibitions/{id}/images/{imageId}",
  tags: ["Exhibitions"],
  operationId: "deleteExhibitionImage",
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

export const registerExhibitionRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listExhibitionsRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "read");
    if (denied) {
      return denied;
    }

    const query = ApiListExhibitionsQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      return badRequest(c, query.error.issues.map((issue) => issue.message).join(", "));
    }

    const data = await dependencies
      .getDataService(c)
      .listExhibitions(query.data.generationId);
    return ok(c, data.map(sanitizeExhibitionDescriptionField));
  });

  app.openapi(createExhibitionRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateExhibitionSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const sanitizedDescription = sanitizeExhibitionRichText(body.data.description);
    if (!hasMeaningfulExhibitionRichText(sanitizedDescription)) {
      return badRequest(c, "전시 설명은 비워둘 수 없습니다.");
    }

    const data = await dependencies.getDataService(c).createExhibition({
      ...body.data,
      description: sanitizedDescription,
    });

    const dataService = dependencies.getDataService(c);
    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "exhibition",
      resourceId: data.id,
      action: "create",
      changedFields: readChangedFields(body.data, [
        "title",
        "startDate",
        "endDate",
        "generationId",
        "place",
        "coverImageUrl",
        "description",
      ]),
    });

    return ok(
      c,
      withUpdatedByActor(sanitizeExhibitionDescriptionField(data), actorResult.actor),
      201,
    );
  });

  app.openapi(getExhibitionByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getExhibitionById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, sanitizeExhibitionDescriptionField(data));
  });

  app.openapi(updateExhibitionRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateExhibitionSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    const nextBody = { ...body.data };
    if (nextBody.description !== undefined) {
      const sanitizedDescription = sanitizeExhibitionRichText(nextBody.description);
      if (!hasMeaningfulExhibitionRichText(sanitizedDescription)) {
        return badRequest(c, "전시 설명은 비워둘 수 없습니다.");
      }
      nextBody.description = sanitizedDescription;
    }

    if (Object.keys(nextBody).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.updateExhibition(params.data.id, nextBody);
    if (!data) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "exhibition",
      resourceId: data.id,
      action: "update",
      changedFields: readChangedFields(nextBody, ["updatedAt"]),
    });

    return ok(
      c,
      withUpdatedByActor(sanitizeExhibitionDescriptionField(data), actorResult.actor),
    );
  });

  app.openapi(deleteExhibitionRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const deleted = await dataService.deleteExhibition(params.data.id);
    if (!deleted) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "exhibition",
      resourceId: params.data.id,
      action: "delete",
      changedFields: ["deletedAt"],
    });

    return noContent(c);
  });

  // 전시 세부 이미지도 별도 엔드포인트로 분리해 부분 수정이 가능하도록 한다.
  app.openapi(addExhibitionImageRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiCreateExhibitionImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.addExhibitionImage(params.data.id, body.data);
    if (!data) {
      return notFound(c, "전시를 찾을 수 없습니다.");
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "exhibition",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return ok(c, data, 201);
  });

  app.openapi(addExhibitionImagesBatchRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiCreateExhibitionImageBatchSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.addExhibitionImages(params.data.id, body.data);
    if (!data) {
      return notFound(c, "전시를 찾을 수 없습니다.");
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "exhibition",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return ok(c, data, 201);
  });

  app.openapi(updateExhibitionImagesBatchRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiUpdateExhibitionImageBatchSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.updateExhibitionImages(params.data.id, body.data);
    if (!data) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "exhibition",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return ok(c, data);
  });

  app.openapi(updateExhibitionImageRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiImageIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }
    const body = await parseBody(c, ApiUpdateExhibitionImageSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.updateExhibitionImage(
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
      resourceType: "exhibition",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return ok(c, data);
  });

  app.openapi(deleteExhibitionImageRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }
    const denied = requirePermission(c, actorResult.actor, "exhibition", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiImageIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const deleted = await dataService.deleteExhibitionImage(
      params.data.id,
      params.data.imageId,
    );
    if (!deleted) {
      return notFound(c, "세부 이미지를 찾을 수 없습니다.");
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "exhibition",
      resourceId: params.data.id,
      action: "update",
      changedFields: ["detailImages"],
    });

    return noContent(c);
  });
};
