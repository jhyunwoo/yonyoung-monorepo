import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import {
  badRequest,
  forbidden,
  noContent,
  notFound,
  ok,
} from "../lib/http/response";
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
  ApiCreateGenerationNoticeSchema,
  ApiCreateGlobalNoticeSchema,
  ApiGenerationNoticeSchema,
  ApiGlobalNoticeSchema,
  ApiIdParamSchema,
  ApiNoticeIdParamSchema,
  ApiUpdateGenerationNoticeSchema,
  ApiUpdateGlobalNoticeSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;
const isPresidentActor = (role: string): boolean => role === "president";
const isPrivilegedActor = (role: string): boolean =>
  role === "president" || role === "vice_president";

const sanitizeNoticeContentField = <T extends { content: string }>(notice: T): T => ({
  ...notice,
  content: sanitizeRichTextHtml(notice.content),
});

const listGenerationNoticesRoute = createRoute({
  method: "get",
  path: "/api/generations/{id}/notices",
  tags: ["Notices"],
  operationId: "listGenerationNotices",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiGenerationNoticeSchema.array(), "기수 공지 목록 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createGenerationNoticeRoute = createRoute({
  method: "post",
  path: "/api/generations/{id}/notices",
  tags: ["Notices"],
  operationId: "createGenerationNotice",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiCreateGenerationNoticeSchema, "기수 공지 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiGenerationNoticeSchema, "기수 공지 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const getGenerationNoticeByIdRoute = createRoute({
  method: "get",
  path: "/api/generations/{id}/notices/{noticeId}",
  tags: ["Notices"],
  operationId: "getGenerationNoticeById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiNoticeIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiGenerationNoticeSchema, "기수 공지 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateGenerationNoticeRoute = createRoute({
  method: "patch",
  path: "/api/generations/{id}/notices/{noticeId}",
  tags: ["Notices"],
  operationId: "updateGenerationNotice",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiNoticeIdParamSchema,
    body: jsonBody(ApiUpdateGenerationNoticeSchema, "기수 공지 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiGenerationNoticeSchema, "기수 공지 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteGenerationNoticeRoute = createRoute({
  method: "delete",
  path: "/api/generations/{id}/notices/{noticeId}",
  tags: ["Notices"],
  operationId: "deleteGenerationNotice",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiNoticeIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const listGlobalNoticesRoute = createRoute({
  method: "get",
  path: "/api/global-notices",
  tags: ["Notices"],
  operationId: "listGlobalNotices",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiGlobalNoticeSchema.array(), "전체 공지 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createGlobalNoticeRoute = createRoute({
  method: "post",
  path: "/api/global-notices",
  tags: ["Notices"],
  operationId: "createGlobalNotice",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateGlobalNoticeSchema, "전체 공지 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiGlobalNoticeSchema, "전체 공지 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const getGlobalNoticeByIdRoute = createRoute({
  method: "get",
  path: "/api/global-notices/{id}",
  tags: ["Notices"],
  operationId: "getGlobalNoticeById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiGlobalNoticeSchema, "전체 공지 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateGlobalNoticeRoute = createRoute({
  method: "patch",
  path: "/api/global-notices/{id}",
  tags: ["Notices"],
  operationId: "updateGlobalNotice",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateGlobalNoticeSchema, "전체 공지 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiGlobalNoticeSchema, "전체 공지 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteGlobalNoticeRoute = createRoute({
  method: "delete",
  path: "/api/global-notices/{id}",
  tags: ["Notices"],
  operationId: "deleteGlobalNotice",
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

export const registerNoticeRoutes = (app: App, dependencies: AppDependencies) => {
  app.openapi(listGenerationNoticesRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .listGenerationNotices(params.data.id);

    return ok(c, data.map(sanitizeNoticeContentField));
  });

  app.openapi(createGenerationNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "create");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiCreateGenerationNoticeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const sanitizedContent = sanitizeRichTextHtml(body.data.content);
    if (!hasMeaningfulRichTextHtml(sanitizedContent)) {
      return badRequest(c, "공지 본문은 비워둘 수 없습니다.");
    }

    const dataService = dependencies.getDataService(c);

    const data = await dataService.createGenerationNotice(params.data.id, {
      ...body.data,
      content: sanitizedContent,
      imageUrls: body.data.imageUrls ?? [],
      authorId: actorResult.actor.id,
    });

    if (!data) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "generation_notice",
      resourceId: data.id,
      action: "create",
      changedFields: readChangedFields(body.data, ["title", "content", "imageUrls"]),
    });

    return ok(c, withUpdatedByActor(sanitizeNoticeContentField(data), actorResult.actor), 201);
  });

  app.openapi(getGenerationNoticeByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiNoticeIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getGenerationNoticeById(params.data.id, params.data.noticeId);

    if (!data) {
      return notFound(c);
    }

    return ok(c, sanitizeNoticeContentField(data));
  });

  app.openapi(updateGenerationNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiNoticeIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateGenerationNoticeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const nextBody = { ...body.data };
    if (nextBody.content !== undefined) {
      const sanitizedContent = sanitizeRichTextHtml(nextBody.content);
      if (!hasMeaningfulRichTextHtml(sanitizedContent)) {
        return badRequest(c, "공지 본문은 비워둘 수 없습니다.");
      }
      nextBody.content = sanitizedContent;
    }

    if (Object.keys(nextBody).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.updateGenerationNotice(
      params.data.id,
      params.data.noticeId,
      nextBody,
    );

    if (!data) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "generation_notice",
      resourceId: data.id,
      action: "update",
      changedFields: readChangedFields(nextBody, ["updatedAt"]),
    });

    return ok(c, withUpdatedByActor(sanitizeNoticeContentField(data), actorResult.actor));
  });

  app.openapi(deleteGenerationNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiNoticeIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const deleted = await dataService.deleteGenerationNotice(
      params.data.id,
      params.data.noticeId,
    );

    if (!deleted) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "generation_notice",
      resourceId: params.data.noticeId,
      action: "delete",
      changedFields: ["deletedAt"],
    });

    return noContent(c);
  });

  app.openapi(listGlobalNoticesRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listGlobalNotices();
    return ok(c, data.map(sanitizeNoticeContentField));
  });

  app.openapi(createGlobalNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!isPrivilegedActor(actorResult.actor.role)) {
      return forbidden(c);
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateGlobalNoticeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const sanitizedContent = sanitizeRichTextHtml(body.data.content);
    if (!hasMeaningfulRichTextHtml(sanitizedContent)) {
      return badRequest(c, "공지 본문은 비워둘 수 없습니다.");
    }

    const dataService = dependencies.getDataService(c);

    const data = await dataService.createGlobalNotice({
      ...body.data,
      content: sanitizedContent,
      imageUrls: body.data.imageUrls ?? [],
      authorId: actorResult.actor.id,
    });

    if (!data) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "global_notice",
      resourceId: data.id,
      action: "create",
      changedFields: readChangedFields(body.data, ["title", "content", "imageUrls"]),
    });

    return ok(c, withUpdatedByActor(sanitizeNoticeContentField(data), actorResult.actor), 201);
  });

  app.openapi(getGlobalNoticeByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getGlobalNoticeById(params.data.id);

    if (!data) {
      return notFound(c);
    }

    return ok(c, sanitizeNoticeContentField(data));
  });

  app.openapi(updateGlobalNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!isPrivilegedActor(actorResult.actor.role)) {
      return forbidden(c);
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateGlobalNoticeSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const nextBody = { ...body.data };
    if (nextBody.content !== undefined) {
      const sanitizedContent = sanitizeRichTextHtml(nextBody.content);
      if (!hasMeaningfulRichTextHtml(sanitizedContent)) {
        return badRequest(c, "공지 본문은 비워둘 수 없습니다.");
      }
      nextBody.content = sanitizedContent;
    }

    if (Object.keys(nextBody).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    const dataService = dependencies.getDataService(c);
    const data = await dataService.updateGlobalNotice(params.data.id, nextBody);

    if (!data) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "global_notice",
      resourceId: data.id,
      action: "update",
      changedFields: readChangedFields(nextBody, ["updatedAt"]),
    });

    return ok(c, withUpdatedByActor(sanitizeNoticeContentField(data), actorResult.actor));
  });

  app.openapi(deleteGlobalNoticeRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!isPresidentActor(actorResult.actor.role)) {
      return forbidden(c);
    }

    const denied = requirePermission(c, actorResult.actor, "notice", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const deleted = await dataService.deleteGlobalNotice(params.data.id);

    if (!deleted) {
      return notFound(c);
    }

    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "global_notice",
      resourceId: params.data.id,
      action: "delete",
      changedFields: ["deletedAt"],
    });

    return noContent(c);
  });
};
