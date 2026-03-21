import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
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
import { requireActor } from "../lib/http/authz";
import {
  recordAuditLog,
  readChangedFields,
  withUpdatedByActor,
} from "../lib/audit";
import {
  can,
  canAssignRole,
  isMemberLikeRole,
  normalizeRole,
} from "../lib/authorization/policy";
import {
  dataResponse,
  errorResponses,
  jsonBody,
  noContentResponse,
} from "../lib/openapi/responses";
import {
  ApiAdminUpdateUserSchema,
  ApiBulkUpdateUserRoleSchema,
  ApiUserResourceHistoryQuerySchema,
  ApiUserResourceHistorySchema,
  ApiUserIdParamSchema,
  ApiUserSchema,
  ApiMemberProfileUpdateSchema,
} from "../lib/openapi/schemas";
import type { Role } from "../lib/authorization/types";

type App = OpenAPIHono<HonoAppType>;

const updateUserRequestSchema = z
  .union([ApiAdminUpdateUserSchema, ApiMemberProfileUpdateSchema])
  .openapi("ApiUpdateUserRequest");

const canReadAllUsers = (role: string): boolean =>
  role === "president" || role === "vice_president";

const canManageTargetUser = (
  actor: {
    id: string;
    role: Role;
  },
  targetUser: {
    id: string;
    role: string | null;
  },
): boolean => {
  if (actor.id === targetUser.id) {
    return true;
  }

  return (
    canAssignRole(actor.role, targetUser.role) &&
    normalizeRole(actor.role) !== normalizeRole(targetUser.role)
  );
};

const listUsersRoute = createRoute({
  method: "get",
  path: "/api/users",
  tags: ["Users"],
  operationId: "listUsers",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiUserSchema.array(), "사용자 목록/본인 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const getCurrentUserRoute = createRoute({
  method: "get",
  path: "/api/users/me",
  tags: ["Users"],
  operationId: "getCurrentUser",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiUserSchema, "현재 로그인 사용자 조회 성공"),
    401: errorResponses[401],
    404: errorResponses[404],
  },
});

const getUserByIdRoute = createRoute({
  method: "get",
  path: "/api/users/{id}",
  tags: ["Users"],
  operationId: "getUserById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiUserIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiUserSchema, "사용자 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const getUserResourceHistoryRoute = createRoute({
  method: "get",
  path: "/api/users/{id}/resource-history",
  tags: ["Users"],
  operationId: "getUserResourceHistory",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiUserIdParamSchema,
    query: ApiUserResourceHistoryQuerySchema,
  },
  responses: {
    200: dataResponse(ApiUserResourceHistorySchema, "사용자 리소스 이력 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateUserRoute = createRoute({
  method: "patch",
  path: "/api/users/{id}",
  tags: ["Users"],
  operationId: "updateUser",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiUserIdParamSchema,
    body: jsonBody(updateUserRequestSchema, "사용자 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiUserSchema, "사용자 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const deleteUserRoute = createRoute({
  method: "delete",
  path: "/api/users/{id}",
  tags: ["Users"],
  operationId: "deleteUser",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiUserIdParamSchema,
  },
  responses: {
    204: noContentResponse,
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const bulkUpdateUserRoleRoute = createRoute({
  method: "patch",
  path: "/api/users/bulk-role",
  tags: ["Users"],
  operationId: "bulkUpdateUserRole",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiBulkUpdateUserRoleSchema, "사용자 권한 일괄 변경 요청"),
  },
  responses: {
    200: dataResponse(ApiUserSchema.array(), "사용자 권한 일괄 변경 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

/**
 * registerUserRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
export const registerUserRoutes = (app: App, dependencies: AppDependencies) => {
  app.openapi(listUsersRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (canReadAllUsers(actorResult.actor.role)) {
      const data = await dependencies.getDataService(c).listUsers();
      return ok(c, data);
    }

    if (actorResult.actor.role === "manager") {
      const actorGenerationIdSet = new Set(actorResult.actor.generationIds ?? []);
      if (actorResult.actor.generationId) {
        actorGenerationIdSet.add(actorResult.actor.generationId);
      }

      if (actorGenerationIdSet.size === 0) {
        return ok(c, []);
      }

      const data = await dependencies
        .getDataService(c)
        .listUsersByGenerationIds(Array.from(actorGenerationIdSet));
      return ok(c, data);
    }

    if (isMemberLikeRole(actorResult.actor.role)) {
      const me = await dependencies.getDataService(c).getUserById(actorResult.actor.id);
      if (!me) {
        return notFound(c);
      }
      return ok(c, [me]);
    }

    return forbidden(c);
  });

  app.openapi(getCurrentUserRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const data = await dependencies
      .getDataService(c)
      .getUserById(actorResult.actor.id);
    if (!data) {
      return notFound(c);
    }

    return ok(c, data);
  });

  app.openapi(getUserByIdRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const params = parseParams(c, ApiUserIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const isSelf = actorResult.actor.id === params.data.id;
    if (
      !canReadAllUsers(actorResult.actor.role) &&
      actorResult.actor.role !== "manager" &&
      !isSelf
    ) {
      return forbidden(c);
    }

    const data = await dependencies.getDataService(c).getUserById(params.data.id);
    if (!data) {
      return notFound(c);
    }

    if (
      actorResult.actor.role === "manager" &&
      !isSelf &&
      (() => {
        const actorGenerationIdSet = new Set(actorResult.actor.generationIds ?? []);
        if (actorResult.actor.generationId) {
          actorGenerationIdSet.add(actorResult.actor.generationId);
        }
        if (actorGenerationIdSet.size === 0) {
          return true;
        }
        const targetGenerationIds =
          (data.generationIds?.length ?? 0) > 0
            ? data.generationIds ?? []
            : data.generationId
              ? [data.generationId]
              : [];
        return !targetGenerationIds.some((id) => actorGenerationIdSet.has(id));
      })()
    ) {
      return forbidden(c);
    }

    return ok(c, data);
  });

  app.openapi(getUserResourceHistoryRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!canReadAllUsers(actorResult.actor.role)) {
      return forbidden(c);
    }

    const params = parseParams(c, ApiUserIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const query = ApiUserResourceHistoryQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      return badRequest(c, query.error.issues[0]?.message ?? "잘못된 요청입니다.");
    }

    const dataService = dependencies.getDataService(c);
    const targetUser = await dataService.getUserById(params.data.id);
    if (!targetUser) {
      return notFound(c);
    }

    const history = await dataService.listUserResourceHistory({
      userId: params.data.id,
      page: query.data.page,
      pageSize: query.data.pageSize,
      action: query.data.action,
    });
    return ok(c, history);
  });

  app.openapi(bulkUpdateUserRoleRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    if (!can(actorResult.actor.role, "user", "update")) {
      return forbidden(c);
    }

    const body = await parseBody(c, ApiBulkUpdateUserRoleSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    if (!canAssignRole(actorResult.actor.role, body.data.role)) {
      return forbidden(c, "본인보다 높은 등급으로 권한을 변경할 수 없습니다.");
    }

    const dataService = dependencies.getDataService(c);
    const targetUserIds = Array.from(new Set(body.data.userIds));
    const users = await dataService.listUsersByIds(targetUserIds);
    const userById = new Map(users.map((candidate) => [candidate.id, candidate]));
    const targetUsers = body.data.userIds.map((userId) => userById.get(userId) ?? null);
    if (targetUsers.some((user) => user === null)) {
      return badRequest(c, "일부 대상 사용자를 찾을 수 없습니다.");
    }

    const unauthorizedTargetExists = targetUsers.some(
      (candidate) =>
        candidate !== null &&
        !canManageTargetUser(actorResult.actor, {
          id: candidate.id,
          role: candidate.role,
        }),
    );
    if (unauthorizedTargetExists) {
      return forbidden(c, "본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.");
    }

    const normalizedNextRole = normalizeRole(body.data.role);
    const presidentCount = await dataService.countUsersByRole("president");
    const demotedPresidentCount = targetUsers.filter(
      (candidate) =>
        candidate !== null &&
        normalizeRole(candidate.role) === "president" &&
        normalizedNextRole !== "president",
    ).length;
    if (presidentCount - demotedPresidentCount <= 0) {
      return badRequest(c, "회장 권한은 최소 1명 이상 유지되어야 합니다.");
    }

    const updatedUsers = await dataService.bulkUpdateUsersRole({
      userIds: body.data.userIds,
      role: normalizedNextRole,
    });
    await Promise.all(
      updatedUsers.map((updatedUser) =>
        recordAuditLog({
          dataService,
          actor: actorResult.actor,
          resourceType: "user",
          resourceId: updatedUser.id,
          action: "update",
          changedFields: ["role", "updatedAt"],
        }),
      ),
    );
    return ok(c, updatedUsers.map((updatedUser) => withUpdatedByActor(updatedUser, actorResult.actor)));
  });

  app.openapi(updateUserRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const params = parseParams(c, ApiUserIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const isSelf = actorResult.actor.id === params.data.id;
    const isAdminLike = can(actorResult.actor.role, "user", "update");
    const dataService = dependencies.getDataService(c);

    if (isAdminLike) {
      const body = await parseBody(c, ApiAdminUpdateUserSchema);
      if (!body.success) {
        return badRequest(c, body.message);
      }
      if (Object.keys(body.data).length === 0) {
        return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
      }

      const currentUser = await dataService.getUserById(params.data.id);
      if (!currentUser) {
        return notFound(c);
      }

      if (
        !canManageTargetUser(actorResult.actor, {
          id: currentUser.id,
          role: currentUser.role,
        })
      ) {
        return forbidden(c, "본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.");
      }

      const updateInput = { ...body.data };
      if (updateInput.role !== undefined) {
        if (!canAssignRole(actorResult.actor.role, updateInput.role)) {
          return forbidden(c, "본인보다 높은 등급으로 권한을 변경할 수 없습니다.");
        }

        const currentNormalizedRole = normalizeRole(currentUser.role);
        const nextNormalizedRole = normalizeRole(updateInput.role);
        if (
          currentNormalizedRole === "president" &&
          nextNormalizedRole !== "president"
        ) {
          const presidentCount = await dataService.countUsersByRole("president");
          if (presidentCount <= 1) {
            return badRequest(c, "회장 권한은 최소 1명 이상 유지되어야 합니다.");
          }
        }

        updateInput.role = nextNormalizedRole;
      }

      const data = await dataService.updateUser(params.data.id, updateInput);
      if (!data) {
        return notFound(c);
      }
      await recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "user",
        resourceId: data.id,
        action: "update",
        changedFields: readChangedFields(updateInput, ["updatedAt"]),
      });
      return ok(c, withUpdatedByActor(data, actorResult.actor));
    }

    // member 계열 role 및 unverified는 본인 프로필 필드만 수정 가능하다.
    if (
      (isMemberLikeRole(actorResult.actor.role) ||
        actorResult.actor.role === "unverified") &&
      isSelf
    ) {
      const body = await parseBody(c, ApiMemberProfileUpdateSchema);
      if (!body.success) {
        return badRequest(c, body.message);
      }
      if (Object.keys(body.data).length === 0) {
        return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
      }
      const data = await dataService.updateUser(params.data.id, body.data);
      if (!data) {
        return notFound(c);
      }
      await recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "user",
        resourceId: data.id,
        action: "update",
        changedFields: readChangedFields(body.data, ["updatedAt"]),
      });
      return ok(c, withUpdatedByActor(data, actorResult.actor));
    }

    return forbidden(c);
  });

  app.openapi(deleteUserRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const params = parseParams(c, ApiUserIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const isSelf = actorResult.actor.id === params.data.id;
    if (!can(actorResult.actor.role, "user", "delete")) {
      if (!(isMemberLikeRole(actorResult.actor.role) && isSelf)) {
        return forbidden(c);
      }
    }

    const dataService = dependencies.getDataService(c);
    const targetUser = await dataService.getUserById(params.data.id);
    if (!targetUser) {
      return notFound(c);
    }

    if (
      can(actorResult.actor.role, "user", "delete") &&
      !canManageTargetUser(actorResult.actor, {
        id: targetUser.id,
        role: targetUser.role,
      })
    ) {
      return forbidden(c, "본인보다 높거나 같은 등급의 사용자는 삭제할 수 없습니다.");
    }

    if (normalizeRole(targetUser.role) === "president") {
      const presidentCount = await dataService.countUsersByRole("president");
      if (presidentCount <= 1) {
        return badRequest(c, "회장 권한은 최소 1명 이상 유지되어야 합니다.");
      }
    }

    const deleted = await dataService.deleteUser(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "user",
      resourceId: params.data.id,
      action: "delete",
      changedFields: ["deletedAt"],
    });
    return noContent(c);
  });
};
