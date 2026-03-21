import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import HonoAppType from "../types/honoAppType";
import {
  badRequest,
  conflict,
  forbidden,
  internalError,
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
  createdResponse,
  dataResponse,
  errorResponses,
  jsonBody,
  noContentResponse,
} from "../lib/openapi/responses";
import {
  ApiCreateGenerationSchema,
  ApiGenerationMemberSummarySchema,
  ApiGenerationSchema,
  ApiIdParamSchema,
  ApiUpdateGenerationSchema,
} from "../lib/openapi/schemas";

type App = OpenAPIHono<HonoAppType>;

const listGenerationsRoute = createRoute({
  method: "get",
  path: "/api/generations",
  tags: ["Generations"],
  operationId: "listGenerations",
  security: [{ cookieAuth: [] }],
  responses: {
    200: dataResponse(ApiGenerationSchema.array(), "기수 목록 조회 성공"),
    401: errorResponses[401],
    403: errorResponses[403],
  },
});

const createGenerationRoute = createRoute({
  method: "post",
  path: "/api/generations",
  tags: ["Generations"],
  operationId: "createGeneration",
  security: [{ cookieAuth: [] }],
  request: {
    body: jsonBody(ApiCreateGenerationSchema, "기수 생성 요청"),
  },
  responses: {
    201: createdResponse(ApiGenerationSchema, "기수 생성 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    409: errorResponses[409],
    500: errorResponses[500],
  },
});

const getGenerationByIdRoute = createRoute({
  method: "get",
  path: "/api/generations/{id}",
  tags: ["Generations"],
  operationId: "getGenerationById",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(ApiGenerationSchema, "기수 상세 조회 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const listGenerationMembersRoute = createRoute({
  method: "get",
  path: "/api/generations/{id}/members",
  tags: ["Generations"],
  operationId: "listGenerationMembers",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
  },
  responses: {
    200: dataResponse(
      ApiGenerationMemberSummarySchema.array(),
      "기수 멤버 목록 조회 성공",
    ),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
  },
});

const updateGenerationRoute = createRoute({
  method: "patch",
  path: "/api/generations/{id}",
  tags: ["Generations"],
  operationId: "updateGeneration",
  security: [{ cookieAuth: [] }],
  request: {
    params: ApiIdParamSchema,
    body: jsonBody(ApiUpdateGenerationSchema, "기수 수정 요청"),
  },
  responses: {
    200: dataResponse(ApiGenerationSchema, "기수 수정 성공"),
    400: errorResponses[400],
    401: errorResponses[401],
    403: errorResponses[403],
    404: errorResponses[404],
    409: errorResponses[409],
    500: errorResponses[500],
  },
});

const deleteGenerationRoute = createRoute({
  method: "delete",
  path: "/api/generations/{id}",
  tags: ["Generations"],
  operationId: "deleteGeneration",
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

/**
 * isUniqueError 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param error 에러 상황을 나타내는 객체입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const isUniqueError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    (error.message.includes("UNIQUE") || error.message.includes("unique"))
  );
};

const readUniqueConflictMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "중복된 값이 이미 존재합니다.";
  }

  if (error.message.includes("generations.name")) {
    return "name 값이 이미 존재합니다.";
  }

  if (error.message.includes("generations.sort_order")) {
    return "sortOrder 값이 이미 존재합니다.";
  }

  return "중복된 값이 이미 존재합니다.";
};

const isGlobalGenerationMemberReader = (role: string): boolean =>
  role === "president" || role === "vice_president";

const readGenerationIdSet = (input: {
  generationId: string | null;
  generationIds?: string[];
}): Set<string> => {
  const ids = new Set<string>();
  for (const generationId of input.generationIds ?? []) {
    if (typeof generationId === "string" && generationId.length > 0) {
      ids.add(generationId);
    }
  }

  if (typeof input.generationId === "string" && input.generationId.length > 0) {
    ids.add(input.generationId);
  }

  return ids;
};

const readMemberSortName = (member: {
  familyName: string | null;
  givenName: string | null;
  name: string;
}): string => {
  const familyName = member.familyName?.trim() ?? "";
  const givenName = member.givenName?.trim() ?? "";
  if (familyName.length > 0 && givenName.length > 0) {
    return `${familyName}${givenName}`;
  }

  return member.name.trim();
};

/**
 * registerGenerationRoutes 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param app 함수 로직에서 사용하는 입력값입니다.
 * @param dependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const registerGenerationRoutes = (
  app: App,
  dependencies: AppDependencies,
) => {
  app.openapi(listGenerationsRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "read");
    if (denied) {
      return denied;
    }

    const data = await dependencies.getDataService(c).listGenerations();
    return ok(c, data);
  });

  app.openapi(createGenerationRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "create");
    if (denied) {
      return denied;
    }

    const body = await parseBody(c, ApiCreateGenerationSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    try {
      const dataService = dependencies.getDataService(c);
      const data = await dataService.createGeneration(body.data);
      await recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "generation",
        resourceId: data.id,
        action: "create",
        changedFields: readChangedFields(body.data, [
          "name",
          "sortOrder",
          "startDate",
          "endDate",
        ]),
      });
      return ok(c, withUpdatedByActor(data, actorResult.actor), 201);
    } catch (error) {
      if (isUniqueError(error)) {
        return conflict(c, readUniqueConflictMessage(error));
      }
      return internalError(c);
    }
  });

  app.openapi(getGenerationByIdRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const data = await dependencies
      .getDataService(c)
      .getGenerationById(params.data.id);
    if (!data) {
      return notFound(c);
    }
    return ok(c, data);
  });

  app.openapi(listGenerationMembersRoute, async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "read");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const generation = await dataService.getGenerationById(params.data.id);
    if (!generation) {
      return notFound(c);
    }

    if (!isGlobalGenerationMemberReader(actorResult.actor.role)) {
      const actorGenerationIdSet = readGenerationIdSet(actorResult.actor);
      if (!actorGenerationIdSet.has(generation.id)) {
        return forbidden(c);
      }
    }

    const members = (await dataService.listUsersByGenerationIds([generation.id]))
      .map((candidate) => ({
        id: candidate.id,
        generationId: generation.id,
        name: candidate.name,
        image: candidate.image,
        familyName: candidate.familyName,
        givenName: candidate.givenName,
        department: candidate.department,
        collaborationAvailable: candidate.collaborationAvailable,
        personalLink: candidate.personalLink,
        role: candidate.role,
      }))
      .sort((left, right) =>
        readMemberSortName(left).localeCompare(readMemberSortName(right), "ko"),
      );

    return ok(c, members);
  });

  app.openapi(updateGenerationRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "update");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const body = await parseBody(c, ApiUpdateGenerationSchema);
    if (!body.success) {
      return badRequest(c, body.message);
    }

    if (Object.keys(body.data).length === 0) {
      return badRequest(c, "수정할 필드를 하나 이상 전달해야 합니다.");
    }

    try {
      const dataService = dependencies.getDataService(c);
      const data = await dataService.updateGeneration(params.data.id, body.data);
      if (!data) {
        return notFound(c);
      }
      await recordAuditLog({
        dataService,
        actor: actorResult.actor,
        resourceType: "generation",
        resourceId: data.id,
        action: "update",
        changedFields: readChangedFields(body.data, ["updatedAt"]),
      });
      return ok(c, withUpdatedByActor(data, actorResult.actor));
    } catch (error) {
      if (isUniqueError(error)) {
        return conflict(c, readUniqueConflictMessage(error));
      }
      return internalError(c);
    }
  });

  app.openapi(deleteGenerationRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (c): Promise<any> => {
    const actorResult = await requireActor(c, dependencies);
    if ("response" in actorResult) {
      return actorResult.response;
    }

    const denied = requirePermission(c, actorResult.actor, "generation", "delete");
    if (denied) {
      return denied;
    }

    const params = parseParams(c, ApiIdParamSchema);
    if (!params.success) {
      return badRequest(c, params.message);
    }

    const dataService = dependencies.getDataService(c);
    const deleted = await dataService.deleteGeneration(params.data.id);
    if (!deleted) {
      return notFound(c);
    }
    await recordAuditLog({
      dataService,
      actor: actorResult.actor,
      resourceType: "generation",
      resourceId: params.data.id,
      action: "delete",
      changedFields: ["deletedAt"],
    });
    return noContent(c);
  });
};
