import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type HonoAppType from "../types/honoAppType";
import { badRequest, forbidden, noContent, notFound, ok } from "../lib/http/response";
import { parseBody, parseParams } from "../lib/validation/request";
import type { AppDependencies } from "../lib/services/dependencies";
import { requireActor, requirePermission } from "../lib/http/authz";
import { recordAuditLog, readChangedFields, withUpdatedByActor } from "../lib/audit";
import { runNonCriticalTask } from "../lib/http/non-critical";
import { sendMarketPushNotifications } from "../lib/notifications/market-push";
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
  ApiCreateMarketCommentSchema,
  ApiCreateMarketItemSchema,
  ApiListMarketItemsQuerySchema,
  ApiMarketCommentIdParamSchema,
  ApiMarketCommentSchema,
  ApiMarketItemIdParamSchema,
  ApiMarketItemSchema,
  ApiMarketPushSubscriptionSchema,
  ApiUpdateMarketCommentSchema,
  ApiUpdateMarketItemSchema,
  ApiUpdateMarketItemStatusSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const isMarketAdmin = (role: string): boolean => {
  return role === "president" || role === "vice_president" || role === "manager";
};

const NON_CRITICAL_AUDIT_OPTIONS = {
  fallback: "await" as const,
  timeoutMs: 1500,
};

const runMarketAuditTask = async (
  c: Parameters<typeof runNonCriticalTask>[0],
  label: string,
  task: () => Promise<void>,
): Promise<void> => {
  await runNonCriticalTask(c, label, task, NON_CRITICAL_AUDIT_OPTIONS);
};

const canManageOwnedResource = (input: {
  ownerId: string;
  actorId: string;
  actorRole: string;
}): boolean => {
  return input.ownerId === input.actorId || isMarketAdmin(input.actorRole);
};

const ensurePatchPayloadNotEmpty = (
  payload: Record<string, unknown>,
  message: string,
): string | null => {
  if (Object.keys(payload).length === 0) {
    return message;
  }
  return null;
};

const normalizeMarketDescription = (
  description: string | null | undefined,
): string | null | undefined => {
  if (description === undefined) {
    return undefined;
  }

  if (description === null) {
    return null;
  }

  const sanitized = sanitizeRichTextHtml(description);
  return hasMeaningfulRichTextHtml(sanitized) ? sanitized : null;
};

const listMarketItemsRoute = createRoute({
  method: "get",
  path: "/api/market/items",
  tags: ["Market"],
  operationId: "listMarketItems",
  security: [{ cookieAuth: [] }],
  request: {
    query: ApiListMarketItemsQuerySchema,
  },
  responses: {
    200: dataResponse(ApiMarketItemSchema.array(), "장터 게시물 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createMarketItemRoute = createRoute({
  method: "post",
  path: "/api/market/items",
  tags: ["Market"],
  operationId: "createMarketItem",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateMarketItemSchema, "장터 게시물 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiMarketItemSchema, "장터 게시물 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const getMarketItemByIdRoute = createRoute({
  method: "get",
  path: "/api/market/items/{id}",
  tags: ["Market"],
  operationId: "getMarketItemById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiMarketItemIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiMarketItemSchema, "장터 게시물 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateMarketItemRoute = createRoute({
  method: "patch",
  path: "/api/market/items/{id}",
  tags: ["Market"],
  operationId: "updateMarketItem",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiMarketItemIdParamSchema,
    body: jsonBody(ApiUpdateMarketItemSchema, "장터 게시물 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiMarketItemSchema, "장터 게시물 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateMarketItemStatusRoute = createRoute({
  method: "patch",
  path: "/api/market/items/{id}/status",
  tags: ["Market"],
  operationId: "updateMarketItemStatus",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiMarketItemIdParamSchema,
    body: jsonBody(ApiUpdateMarketItemStatusSchema, "장터 판매 상태 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiMarketItemSchema, "장터 판매 상태 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteMarketItemRoute = createRoute({
  method: "delete",
  path: "/api/market/items/{id}",
  tags: ["Market"],
  operationId: "deleteMarketItem",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiMarketItemIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const listMarketCommentsRoute = createRoute({
  method: "get",
  path: "/api/market/items/{id}/comments",
  tags: ["Market"],
  operationId: "listMarketCommentsByItemId",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiMarketItemIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiMarketCommentSchema.array(), "장터 댓글 목록 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const createMarketCommentRoute = createRoute({
  method: "post",
  path: "/api/market/items/{id}/comments",
  tags: ["Market"],
  operationId: "createMarketComment",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiMarketItemIdParamSchema,
    body: jsonBody(ApiCreateMarketCommentSchema, "장터 댓글 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiMarketCommentSchema, "장터 댓글 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateMarketCommentRoute = createRoute({
  method: "patch",
  path: "/api/market/comments/{id}",
  tags: ["Market"],
  operationId: "updateMarketComment",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiMarketCommentIdParamSchema,
    body: jsonBody(ApiUpdateMarketCommentSchema, "장터 댓글 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiMarketCommentSchema, "장터 댓글 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteMarketCommentRoute = createRoute({
  method: "delete",
  path: "/api/market/comments/{id}",
  tags: ["Market"],
  operationId: "deleteMarketComment",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiMarketCommentIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const upsertMarketPushSubscriptionRoute = createRoute({
  method: "post",
  path: "/api/market/push-subscriptions",
  tags: ["Market"],
  operationId: "upsertMarketPushSubscription",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiMarketPushSubscriptionSchema, "장터 웹푸시 구독 등록/갱신 요청"),
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteMarketPushSubscriptionRoute = createRoute({
  method: "delete",
  path: "/api/market/push-subscriptions",
  tags: ["Market"],
  operationId: "deleteMarketPushSubscription",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiMarketPushSubscriptionSchema, "장터 웹푸시 구독 해제 요청"),
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

export const registerMarketRoutes = (app: App, dependencies: AppDependencies) => {
  app.openapi(listMarketItemsRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "read");
    if (denied) {
      return denied;
    }

    const query = ApiListMarketItemsQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      return badRequest(c, query.error.issues.map((issue) => issue.message).join(", "));
    }

    const data = await dependencies.getDataService(c).listMarketItems(query.data);
    return ok(c, data);
  });

  app.openapi(createMarketItemRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateMarketItemSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const normalizedDescription = normalizeMarketDescription(body.data.description);
    const dataService = dependencies.getDataService(c);
    const data = await dataService.createMarketItem({
      sellerId: actorResult.actor.id,
      name: body.data.name,
      imageUrls: body.data.imageUrls,
      manufacturer: body.data.manufacturer ?? null,
      productCode: body.data.productCode ?? null,
      conditionGrade: body.data.conditionGrade ?? null,
      description: normalizedDescription ?? null,
      price: body.data.price,
    });

    if (!data) {
      return notFound(c);
    }

    await runMarketAuditTask(c, "market.audit.item.create", () =>
      recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "market_item",
        resourceId: data.id,
        action: "create",
        changedFields: readChangedFields(body.data, [
          "name",
          "imageUrls",
          "manufacturer",
          "productCode",
          "conditionGrade",
          "description",
          "price",
          "status",
        ]),
      }),
    );

    return ok(c, withUpdatedByActor(data, actorResult.actor), 201);
  });

  app.openapi(getMarketItemByIdRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiMarketItemIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies.getDataService(c).getMarketItemById(params.data.id);
    if (!data) {
      return notFound(c);
    }

    return ok(c, data);
  });

  app.openapi(updateMarketItemRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiMarketItemIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateMarketItemSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    const payloadErrorMessage = ensurePatchPayloadNotEmpty(
      body.data,
      "수정할 필드를 하나 이상 전달해야 합니다.",
    );
    if (payloadErrorMessage) {
      return badRequest(c, payloadErrorMessage);
    }

    const nextBody = {
      ...body.data,
      ...(body.data.description !== undefined
        ? { description: normalizeMarketDescription(body.data.description) }
        : {}),
    };

    const dataService = dependencies.getDataService(c);
    const existing = await dataService.getMarketItemById(params.data.id);
    if (!existing) {
      return notFound(c);
    }

    if (
      !canManageOwnedResource({
        ownerId: existing.sellerId,
        actorId: actorResult.actor.id,
        actorRole: actorResult.actor.role,
      })
    ) {
      return forbidden(c, "작성자 또는 운영진만 게시물을 수정할 수 있습니다.");
    }

    const data = await dataService.updateMarketItem(params.data.id, nextBody);
    if (!data) {
      return notFound(c);
    }

    await runMarketAuditTask(c, "market.audit.item.update", () =>
      recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "market_item",
        resourceId: data.id,
        action: "update",
        changedFields: readChangedFields(nextBody, ["updatedAt"]),
      }),
    );

    return ok(c, withUpdatedByActor(data, actorResult.actor));
  });

  app.openapi(updateMarketItemStatusRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiMarketItemIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateMarketItemStatusSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const dataService = dependencies.getDataService(c);
    const existing = await dataService.getMarketItemById(params.data.id);
    if (!existing) {
      return notFound(c);
    }

    if (
      !canManageOwnedResource({
        ownerId: existing.sellerId,
        actorId: actorResult.actor.id,
        actorRole: actorResult.actor.role,
      })
    ) {
      return forbidden(c, "작성자 또는 운영진만 판매 상태를 변경할 수 있습니다.");
    }

    const data = await dataService.updateMarketItemStatus(params.data.id, body.data.status);
    if (!data) {
      return notFound(c);
    }

    await runMarketAuditTask(c, "market.audit.item.status", () =>
      recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "market_item",
        resourceId: data.id,
        action: "update",
        changedFields: ["status", "updatedAt"],
      }),
    );

    return ok(c, withUpdatedByActor(data, actorResult.actor));
  });

  app.openapi(deleteMarketItemRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiMarketItemIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const existing = await dataService.getMarketItemById(params.data.id);
    if (!existing) {
      return notFound(c);
    }

    if (
      !canManageOwnedResource({
        ownerId: existing.sellerId,
        actorId: actorResult.actor.id,
        actorRole: actorResult.actor.role,
      })
    ) {
      return forbidden(c, "작성자 또는 운영진만 게시물을 삭제할 수 있습니다.");
    }

    const deleted = await dataService.deleteMarketItem(params.data.id);
    if (!deleted) {
      return notFound(c);
    }

    await runMarketAuditTask(c, "market.audit.item.delete", () =>
      recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "market_item",
        resourceId: params.data.id,
        action: "delete",
        changedFields: ["deletedAt"],
      }),
    );

    return noContent(c);
  });

  app.openapi(listMarketCommentsRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiMarketItemIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const item = await dataService.getMarketItemById(params.data.id);
    if (!item) {
      return notFound(c);
    }

    const data = await dataService.listMarketCommentsByItemId(params.data.id);
    return ok(c, data);
  });

  app.openapi(createMarketCommentRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "create");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiMarketItemIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiCreateMarketCommentSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const dataService = dependencies.getDataService(c);
    const item = await dataService.getMarketItemById(params.data.id);
    if (!item) {
      return notFound(c);
    }

    const data = await dataService.createMarketComment({
      itemId: params.data.id,
      authorId: actorResult.actor.id,
      content: body.data.content,
    });
    if (!data) {
      return notFound(c);
    }

    await runMarketAuditTask(c, "market.audit.comment.create", () =>
      recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "market_comment",
        resourceId: data.id,
        action: "create",
        changedFields: readChangedFields(body.data, ["content"]),
      }),
    );

    if (item.sellerId !== actorResult.actor.id) {
      await runNonCriticalTask(
        c,
        "market.push.comment.created",
        async () => {
          const subscriptions = await dataService.listMarketPushSubscriptionsByUserId(
            item.sellerId,
          );
          if (subscriptions.length === 0) {
            return;
          }

          const pushResult = await sendMarketPushNotifications({
            env: c.env,
            subscriptions,
            payload: {
              title: "연영장터 새 댓글",
              body: `${actorResult.actor.name}님이 "${item.name}" 글에 댓글을 남겼습니다.`,
              url: "/dashboard/market",
            },
          });

          if (pushResult.expiredEndpoints.length === 0) {
            return;
          }

          await Promise.all(
            pushResult.expiredEndpoints.map((endpoint) =>
              dataService.deleteMarketPushSubscription({
                userId: item.sellerId,
                endpoint,
              }),
            ),
          );
        },
        {
          timeoutMs: 5000,
        },
      );
    }

    return ok(c, withUpdatedByActor(data, actorResult.actor), 201);
  });

  app.openapi(updateMarketCommentRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiMarketCommentIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateMarketCommentSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }
    const payloadErrorMessage = ensurePatchPayloadNotEmpty(
      body.data,
      "수정할 필드를 하나 이상 전달해야 합니다.",
    );
    if (payloadErrorMessage) {
      return badRequest(c, payloadErrorMessage);
    }

    const dataService = dependencies.getDataService(c);
    const existing = await dataService.getMarketCommentById(params.data.id);
    if (!existing) {
      return notFound(c);
    }

    if (
      !canManageOwnedResource({
        ownerId: existing.author.id,
        actorId: actorResult.actor.id,
        actorRole: actorResult.actor.role,
      })
    ) {
      return forbidden(c, "작성자 또는 운영진만 댓글을 수정할 수 있습니다.");
    }

    const data = await dataService.updateMarketComment(params.data.id, body.data);
    if (!data) {
      return notFound(c);
    }

    await runMarketAuditTask(c, "market.audit.comment.update", () =>
      recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "market_comment",
        resourceId: data.id,
        action: "update",
        changedFields: readChangedFields(body.data, ["updatedAt"]),
      }),
    );

    return ok(c, withUpdatedByActor(data, actorResult.actor));
  });

  app.openapi(deleteMarketCommentRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiMarketCommentIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const existing = await dataService.getMarketCommentById(params.data.id);
    if (!existing) {
      return notFound(c);
    }

    if (
      !canManageOwnedResource({
        ownerId: existing.author.id,
        actorId: actorResult.actor.id,
        actorRole: actorResult.actor.role,
      })
    ) {
      return forbidden(c, "작성자 또는 운영진만 댓글을 삭제할 수 있습니다.");
    }

    const deleted = await dataService.deleteMarketComment(params.data.id);
    if (!deleted) {
      return notFound(c);
    }

    await runMarketAuditTask(c, "market.audit.comment.delete", () =>
      recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "market_comment",
        resourceId: params.data.id,
        action: "delete",
        changedFields: ["deletedAt"],
      }),
    );

    return noContent(c);
  });

  app.openapi(upsertMarketPushSubscriptionRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiMarketPushSubscriptionSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    const data = await dependencies.getDataService(c).upsertMarketPushSubscription({
      userId: actorResult.actor.id,
      endpoint: body.data.endpoint,
      p256dh: body.data.p256dh,
      auth: body.data.auth,
    });

    if (!data) {
      return notFound(c);
    }

    return noContent(c);
  });

  app.openapi(deleteMarketPushSubscriptionRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "market", "delete");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiMarketPushSubscriptionSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    await dependencies.getDataService(c).deleteMarketPushSubscription({
      userId: actorResult.actor.id,
      endpoint: body.data.endpoint,
    });

    return noContent(c);
  });
};
