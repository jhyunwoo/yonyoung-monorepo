import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import type {
  ApiActivity,
  ApiActivityImage,
  ApiAuditAction,
  ApiAuditLog,
  ApiExhibition,
  ApiExhibitionImage,
  ApiGeneration,
  ApiGenerationMemberSummary,
  ApiGenerationNotice,
  ApiGlobalNotice,
  ApiLinktree,
  ApiLinktreeItem,
  ApiMarketComment,
  ApiMarketItem,
  ApiMarketItemStatus,
  ApiRecruitingPlan,
  ApiUser,
  ApiUserResourceHistory,
} from "../../../shared/contracts/api-contracts";
import type { MockRole, MockSessionUser, MockState } from "./contracts";
import { createMockState, defaultRoleUserId } from "./seed";

const HOST = "127.0.0.1";
const PORT = Number(process.env.MOCK_API_PORT ?? "4010");
const DEFAULT_NAMESPACE = "default";
const ROLE_COOKIE_KEY = "mock_role";
const PROFILE_COOKIE_KEY = "mock_profile";
const WORKER_COOKIE_KEY = "mock_worker";

type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const statesByNamespace = new Map<string, MockState>();

const now = (): number => Date.now();

const toApiRole = (role: MockRole): string | null => {
  switch (role) {
    case "guest":
      return null;
    case "member":
      return "regular_member";
    default:
      return role;
  }
};

const parseCookies = (request: IncomingMessage): Record<string, string> => {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [rawKey, ...rawValueParts] = pair.trim().split("=");
    if (!rawKey) {
      continue;
    }
    const rawValue = rawValueParts.join("=");
    cookies[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue ?? "");
  }
  return cookies;
};

const readRole = (request: IncomingMessage): MockRole => {
  const cookies = parseCookies(request);
  const headerRole = request.headers["x-mock-role"];
  const value = typeof headerRole === "string" ? headerRole : cookies[ROLE_COOKIE_KEY];

  switch (value) {
    case "guest":
    case "unverified":
    case "member":
    case "manager":
    case "vice_president":
    case "president":
      return value;
    default:
      return "guest";
  }
};

const readProfileMode = (request: IncomingMessage): "complete" | "incomplete" => {
  const cookies = parseCookies(request);
  return cookies[PROFILE_COOKIE_KEY] === "incomplete" ? "incomplete" : "complete";
};

const readNamespace = (request: IncomingMessage, requestUrl: URL): string => {
  const queryNamespace = requestUrl.searchParams.get("namespace");
  if (queryNamespace && queryNamespace.trim().length > 0) {
    return queryNamespace.trim();
  }

  const cookies = parseCookies(request);
  const cookieNamespace = cookies[WORKER_COOKIE_KEY];
  if (cookieNamespace && cookieNamespace.trim().length > 0) {
    return cookieNamespace.trim();
  }

  const headerNamespace = request.headers["x-mock-worker"];
  if (typeof headerNamespace === "string" && headerNamespace.trim().length > 0) {
    return headerNamespace.trim();
  }

  return DEFAULT_NAMESPACE;
};

const getState = (namespace: string): MockState => {
  const current = statesByNamespace.get(namespace);
  if (current) {
    return current;
  }

  const created = createMockState();
  statesByNamespace.set(namespace, created);
  return created;
};

const resetState = (namespace: string): MockState => {
  const reset = createMockState();
  statesByNamespace.set(namespace, reset);
  return reset;
};

const setJsonHeaders = (response: ServerResponse, status: number): void => {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
};

const applyCorsHeaders = (request: IncomingMessage, response: ServerResponse): void => {
  const originHeader = request.headers.origin;
  const allowOrigin = typeof originHeader === "string" ? originHeader : "*";
  response.setHeader("access-control-allow-origin", allowOrigin);
  response.setHeader("access-control-allow-methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "content-type,accept,x-request-id,x-trace-id,x-mock-role,x-mock-worker,cookie",
  );
  response.setHeader("access-control-max-age", "600");
  response.setHeader("vary", "origin");
};

const sendJson = (response: ServerResponse, status: number, payload: unknown): void => {
  setJsonHeaders(response, status);
  response.end(JSON.stringify(payload));
};

const sendData = <T>(response: ServerResponse, data: T, status = 200): void => {
  sendJson(response, status, { data });
};

const sendError = (
  response: ServerResponse,
  status: number,
  code: ApiErrorCode,
  message: string,
): void => {
  sendJson(response, status, {
    error: {
      code,
      message,
      requestId: crypto.randomUUID(),
    },
  });
};

const readRequestBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  const raw = Buffer.concat(chunks).toString("utf-8");
  if (raw.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const ensureArray = <T>(value: T[] | undefined | null): T[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value;
};

const findUserByRole = (state: MockState, role: MockRole): ApiUser | null => {
  if (role === "guest") {
    return null;
  }
  const userId = defaultRoleUserId[role];
  return state.users.find((user) => user.id === userId) ?? null;
};

const toSessionUser = (
  user: ApiUser,
  role: MockRole,
  profileMode: "complete" | "incomplete",
): MockSessionUser => {
  const sessionUser: MockSessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    familyName: user.familyName,
    givenName: user.givenName,
    college: user.college,
    department: user.department,
    studentNumber: user.studentNumber,
    phoneNumber: user.phoneNumber,
    collaborationAvailable: user.collaborationAvailable,
    personalLink: user.personalLink,
    role: toApiRole(role),
    generationId: user.generationId,
    generationIds: [...(user.generationIds ?? [])],
  };

  if (profileMode === "incomplete") {
    sessionUser.familyName = null;
    sessionUser.givenName = null;
    sessionUser.college = null;
    sessionUser.department = null;
    sessionUser.studentNumber = null;
    sessionUser.phoneNumber = null;
  }

  return sessionUser;
};

const requireAuthenticatedUser = (
  response: ServerResponse,
  state: MockState,
  role: MockRole,
): ApiUser | null => {
  const user = findUserByRole(state, role);
  if (!user) {
    sendError(response, 401, "UNAUTHORIZED", "Authentication required.");
    return null;
  }
  return user;
};

const requireWritableRole = (response: ServerResponse, role: MockRole): boolean => {
  if (role === "guest") {
    sendError(response, 401, "UNAUTHORIZED", "Authentication required.");
    return false;
  }

  if (role === "unverified") {
    sendError(response, 403, "FORBIDDEN", "Unverified users cannot mutate data.");
    return false;
  }

  return true;
};

const withIncompleteProfileFields = (user: ApiUser): ApiUser => ({
  ...user,
  familyName: null,
  givenName: null,
  college: null,
  department: null,
  studentNumber: null,
  phoneNumber: null,
});

const parseIdSegments = (pathname: string): string[] =>
  pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

const normalizeRole = (value: unknown): string | null => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return value.trim();
};

const buildMemberSummary = (
  user: ApiUser,
  generationId: string,
): ApiGenerationMemberSummary => ({
  id: user.id,
  generationId,
  name: user.name,
  image: user.image,
  familyName: user.familyName,
  givenName: user.givenName,
  department: user.department,
  collaborationAvailable: user.collaborationAvailable,
  personalLink: user.personalLink,
  role: user.role,
});

const buildAuditActor = (user: ApiUser): NonNullable<ApiAuditLog["actor"]> => ({
  id: user.id,
  name: user.name,
  familyName: user.familyName,
  givenName: user.givenName,
  role: user.role,
});

const buildUserDisplayProfile = (user: ApiUser): ApiMarketItem["seller"] => ({
  id: user.id,
  name: user.name,
  familyName: user.familyName,
  givenName: user.givenName,
  image: user.image,
  role: user.role,
});

const trackAudit = (
  state: MockState,
  input: {
    resourceType: ApiAuditLog["resourceType"];
    resourceId: string;
    action: ApiAuditAction;
    actor: ApiUser;
    changedFields: string[];
  },
): void => {
  state.auditLogs.unshift({
    id: `audit-${crypto.randomUUID()}`,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    action: input.action,
    actor: buildAuditActor(input.actor),
    changedFields: input.changedFields,
    createdAt: now(),
  });
};

const buildAdminDashboardStats = (
  state: MockState,
  generationSortOrder: number | null,
) => {
  const selectedGeneration =
    typeof generationSortOrder === "number"
      ? (state.generations.find((item) => item.sortOrder === generationSortOrder) ?? null)
      : (state.generations
          .slice()
          .sort((left, right) => right.sortOrder - left.sortOrder)[0] ?? null);

  const selectedGenerationId = selectedGeneration?.id ?? null;

  return {
    usersTotal: state.users.length,
    unverifiedUsersTotal: state.users.filter((user) => user.role === "unverified").length,
    generationsTotal: state.generations.length,
    selectedGenerationMembersTotal: selectedGenerationId
      ? state.users.filter((user) =>
          ensureArray(user.generationIds).includes(selectedGenerationId),
        ).length
      : 0,
    selectedGenerationActivitiesTotal: selectedGenerationId
      ? state.activities.filter(
          (activity) => activity.generationId === selectedGenerationId,
        ).length
      : 0,
    selectedGenerationExhibitionsTotal: selectedGenerationId
      ? state.exhibitions.filter(
          (exhibition) => exhibition.generationId === selectedGenerationId,
        ).length
      : 0,
    linktreeLinksTotal: state.linktrees.reduce(
      (total, linktree) => total + linktree.items.length,
      0,
    ),
    r2StorageUsedBytes: 1024 * 1024 * 127,
    r2StorageLimitBytes: 1024 * 1024 * 1024,
    r2StorageUsageAvailable: true,
  };
};

const buildUserHistory = (
  state: MockState,
  userId: string,
  input: {
    page: number;
    pageSize: number;
    action?: "create" | "update" | "delete";
  },
): ApiUserResourceHistory => {
  const filteredItems = state.auditLogs
    .filter((log) => log.actor?.id === userId)
    .filter((log) => (input.action ? log.action === input.action : true))
    .map((log) => ({
      id: log.id,
      resourceType:
        log.resourceType === "generation" ||
        log.resourceType === "market_item" ||
        log.resourceType === "market_comment"
          ? "activity"
          : (log.resourceType as ApiUserResourceHistory["items"][number]["resourceType"]),
      resourceId: log.resourceId,
      resourceTitle: null,
      action: log.action,
      changedFields: [...log.changedFields],
      isDeleted: log.action === "delete",
      generationId: null,
      linktreeId: null,
      createdAt: log.createdAt,
    }))
    .sort((left, right) => right.createdAt - left.createdAt);
  const total = filteredItems.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / input.pageSize);
  const startIndex = (input.page - 1) * input.pageSize;

  return {
    items: filteredItems.slice(startIndex, startIndex + input.pageSize),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages,
  };
};

const readNumberQuery = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapPublicPhotographers = (state: MockState) => {
  return state.generations
    .slice()
    .sort((left, right) => right.sortOrder - left.sortOrder)
    .map((generation) => ({
      id: generation.id,
      name: generation.name,
      sortOrder: generation.sortOrder,
      startDate: generation.startDate,
      endDate: generation.endDate,
      members: state.users
        .filter((user) => normalizeRole(user.role) !== "unverified")
        .filter((user) => ensureArray(user.generationIds).includes(generation.id))
        .map((user) => ({
          id: user.id,
          name: user.name,
          image: user.image,
          showcaseImageUrls: [...user.showcaseImageUrls],
          familyName: user.familyName,
          givenName: user.givenName,
          collaborationAvailable: user.collaborationAvailable,
          personalLink: user.personalLink,
          role: user.role,
          generationId: generation.id,
        })),
    }));
};

const createUploadPresign = (
  state: MockState,
  requestUrl: URL,
  body: Record<string, unknown> | null,
) => {
  const fileName = typeof body?.fileName === "string" ? body.fileName : "upload.bin";
  const contentType =
    typeof body?.contentType === "string" && body.contentType.length > 0
      ? body.contentType
      : "application/octet-stream";
  const fileSize = typeof body?.fileSize === "number" ? body.fileSize : 1;
  const prefix = requestUrl.pathname
    .replace(/^\/api\//, "")
    .replace(/\/presign\/.+$/, "")
    .replace(/\//g, "-");
  const objectKey = `${prefix}/${now()}-${crypto.randomUUID()}-${fileName}`;
  const uploadUrl = `http://${HOST}:${PORT}/__upload/${encodeURIComponent(objectKey)}`;
  const publicUrl = `https://cdn.mock.local/${objectKey}`;

  state.uploads[objectKey] = {
    objectKey,
    publicUrl,
    uploaded: false,
    contentType,
    fileSize,
  };

  return {
    uploadUrl,
    objectKey,
    publicUrl,
    requiredHeaders: {
      "Content-Type": contentType,
    },
  };
};

const upsertGeneration = (
  state: MockState,
  payload: Partial<ApiGeneration> & { id?: string },
  actorUser: ApiUser,
): ApiGeneration => {
  const id = payload.id ?? `gen-${crypto.randomUUID()}`;
  const existing = state.generations.find((generation) => generation.id === id);
  if (existing) {
    Object.assign(existing, {
      ...payload,
      id,
      updatedAt: now(),
      updatedBy: buildAuditActor(actorUser),
    });
    return existing;
  }

  const created: ApiGeneration = {
    id,
    name: payload.name ?? "신규 기수",
    sortOrder: typeof payload.sortOrder === "number" ? payload.sortOrder : 0,
    startDate: typeof payload.startDate === "number" ? payload.startDate : now(),
    endDate: typeof payload.endDate === "number" ? payload.endDate : now(),
    createdAt: now(),
    updatedAt: now(),
    updatedBy: buildAuditActor(actorUser),
  };
  state.generations.push(created);
  return created;
};

const server = createServer(async (request, response) => {
  try {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
    const pathname = requestUrl.pathname;
    const namespace = readNamespace(request, requestUrl);
    applyCorsHeaders(request, response);

    if (method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (pathname === "/__test/health") {
      sendJson(response, 200, { ok: true, namespace });
      return;
    }

    if (pathname === "/__test/reset" && method === "POST") {
      const state = resetState(namespace);
      sendJson(response, 200, {
        ok: true,
        namespace,
        users: state.users.length,
      });
      return;
    }

    if (pathname === "/__test/state" && method === "GET") {
      const state = getState(namespace);
      sendData(response, structuredClone(state));
      return;
    }

    if (pathname.startsWith("/__upload/") && method === "PUT") {
      const state = getState(namespace);
      const objectKey = decodeURIComponent(pathname.replace("/__upload/", ""));
      const target = state.uploads[objectKey];
      if (!target) {
        sendError(response, 404, "NOT_FOUND", "Upload key not found.");
        return;
      }

      await readRequestBody(request);
      target.uploaded = true;
      response.statusCode = 200;
      response.end();
      return;
    }

    const segments = parseIdSegments(pathname);
    if (segments[0] !== "api") {
      sendError(response, 404, "NOT_FOUND", "Route not found.");
      return;
    }

    const role = readRole(request);
    const profileMode = readProfileMode(request);
    const state = getState(namespace);
    const body = (await readRequestBody(request)) as Record<string, unknown> | null;

    if (pathname === "/api/auth/get-session" && method === "GET") {
      const user = findUserByRole(state, role);
      if (!user) {
        sendError(response, 401, "UNAUTHORIZED", "No active session.");
        return;
      }

      sendJson(response, 200, {
        session: {
          id: `session-${user.id}`,
          userId: user.id,
          token: `mock-token-${user.id}`,
          expiresAt: new Date(now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        },
        user: toSessionUser(user, role, profileMode),
      });
      return;
    }

    if (segments[1] === "public") {
      if (pathname === "/api/public/activities" && method === "GET") {
        sendData(response, state.activities);
        return;
      }
      if (segments[2] === "public") {
        sendError(response, 404, "NOT_FOUND", "Route not found.");
        return;
      }
      if (pathname.startsWith("/api/public/activities/") && method === "GET") {
        const activityId = decodeURIComponent(segments[3] ?? "");
        const activity = state.activities.find((item) => item.id === activityId);
        if (!activity) {
          sendError(response, 404, "NOT_FOUND", "Activity not found.");
          return;
        }
        sendData(response, activity);
        return;
      }
      if (pathname === "/api/public/exhibitions" && method === "GET") {
        sendData(response, state.exhibitions);
        return;
      }
      if (pathname.startsWith("/api/public/exhibitions/") && method === "GET") {
        const exhibitionId = decodeURIComponent(segments[3] ?? "");
        const exhibition = state.exhibitions.find((item) => item.id === exhibitionId);
        if (!exhibition) {
          sendError(response, 404, "NOT_FOUND", "Exhibition not found.");
          return;
        }
        sendData(response, exhibition);
        return;
      }
      if (pathname === "/api/public/generations" && method === "GET") {
        sendData(response, state.generations);
        return;
      }
      if (pathname === "/api/public/linktree" && method === "GET") {
        sendData(response, state.linktrees);
        return;
      }
      if (pathname === "/api/public/recruiting-plan/current" && method === "GET") {
        sendData(response, state.recruitingPlan);
        return;
      }
      if (pathname === "/api/public/site-settings" && method === "GET") {
        sendData(response, state.siteSettings);
        return;
      }
      if (pathname === "/api/public/photographers" && method === "GET") {
        sendData(response, mapPublicPhotographers(state));
        return;
      }

      sendError(response, 404, "NOT_FOUND", "Public route not found.");
      return;
    }

    if (pathname.includes("/presign/") && method === "POST") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      sendData(response, createUploadPresign(state, requestUrl, body));
      return;
    }

    const actorUser = requireAuthenticatedUser(response, state, role);
    if (!actorUser) {
      return;
    }

    // Users
    if (pathname === "/api/users/me" && method === "GET") {
      const shouldMaskProfile = profileMode === "incomplete";
      sendData(
        response,
        shouldMaskProfile ? withIncompleteProfileFields(actorUser) : actorUser,
      );
      return;
    }

    if (pathname === "/api/users" && method === "GET") {
      sendData(response, state.users);
      return;
    }

    if (pathname === "/api/users/bulk-role" && method === "PATCH") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const userIds = ensureArray(body?.userIds as string[]);
      const nextRole = normalizeRole(body?.role);
      if (!nextRole) {
        sendError(response, 400, "BAD_REQUEST", "Invalid role payload.");
        return;
      }

      const updatedUsers: ApiUser[] = [];
      for (const userId of userIds) {
        const user = state.users.find((item) => item.id === userId);
        if (!user) {
          continue;
        }
        user.role = nextRole;
        user.updatedAt = now();
        user.updatedBy = buildAuditActor(actorUser);
        updatedUsers.push(user);
      }
      trackAudit(state, {
        resourceType: "user",
        resourceId: userIds.join(","),
        action: "update",
        actor: actorUser,
        changedFields: ["role"],
      });
      sendData(response, updatedUsers);
      return;
    }

    if (segments[1] === "users" && segments[2]) {
      const userId = decodeURIComponent(segments[2]);
      const user = state.users.find((item) => item.id === userId);

      if (!user) {
        sendError(response, 404, "NOT_FOUND", "User not found.");
        return;
      }

      if (
        (segments[3] === "history" || segments[3] === "resource-history") &&
        method === "GET"
      ) {
        const page = Math.max(
          1,
          readNumberQuery(requestUrl.searchParams.get("page")) ?? 1,
        );
        const pageSize = Math.max(
          1,
          Math.min(100, readNumberQuery(requestUrl.searchParams.get("pageSize")) ?? 10),
        );
        const actionParam = requestUrl.searchParams.get("action");
        const action =
          actionParam === "create" || actionParam === "update" || actionParam === "delete"
            ? actionParam
            : undefined;
        sendData(response, buildUserHistory(state, userId, { page, pageSize, action }));
        return;
      }

      if (method === "GET") {
        const shouldMaskProfile =
          profileMode === "incomplete" && actorUser.id === user.id;
        sendData(response, shouldMaskProfile ? withIncompleteProfileFields(user) : user);
        return;
      }

      if (method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }

        const patch = body ?? {};
        Object.assign(user, patch, {
          updatedAt: now(),
          updatedBy: buildAuditActor(actorUser),
        });
        if (Array.isArray(patch.generationIds) && patch.generationIds.length > 0) {
          user.generationIds = [...patch.generationIds] as string[];
          user.generationId = (patch.generationIds[0] as string | undefined) ?? null;
        }
        trackAudit(state, {
          resourceType: "user",
          resourceId: user.id,
          action: "update",
          actor: actorUser,
          changedFields: Object.keys(patch),
        });
        sendData(response, user);
        return;
      }

      if (method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        state.users = state.users.filter((item) => item.id !== userId);
        trackAudit(state, {
          resourceType: "user",
          resourceId: userId,
          action: "delete",
          actor: actorUser,
          changedFields: ["deleted"],
        });
        sendData(response, null);
        return;
      }
    }

    // Generations
    if (pathname === "/api/generations" && method === "GET") {
      sendData(response, state.generations);
      return;
    }
    if (pathname === "/api/generations" && method === "POST") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const created = upsertGeneration(
        state,
        {
          name: typeof body?.name === "string" ? body.name : "신규 기수",
          sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
          startDate: typeof body?.startDate === "number" ? body.startDate : now(),
          endDate: typeof body?.endDate === "number" ? body.endDate : now(),
        },
        actorUser,
      );
      trackAudit(state, {
        resourceType: "generation",
        resourceId: created.id,
        action: "create",
        actor: actorUser,
        changedFields: ["name", "sortOrder", "startDate", "endDate"],
      });
      sendData(response, created);
      return;
    }

    if (segments[1] === "generations" && segments[2]) {
      const generationId = decodeURIComponent(segments[2]);
      const generation = state.generations.find((item) => item.id === generationId);

      if (!generation) {
        sendError(response, 404, "NOT_FOUND", "Generation not found.");
        return;
      }

      if (!segments[3] && method === "GET") {
        sendData(response, generation);
        return;
      }

      if (!segments[3] && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        Object.assign(generation, body ?? {}, {
          updatedAt: now(),
          updatedBy: buildAuditActor(actorUser),
        });
        trackAudit(state, {
          resourceType: "generation",
          resourceId: generation.id,
          action: "update",
          actor: actorUser,
          changedFields: Object.keys(body ?? {}),
        });
        sendData(response, generation);
        return;
      }

      if (!segments[3] && method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        state.generations = state.generations.filter((item) => item.id !== generationId);
        trackAudit(state, {
          resourceType: "generation",
          resourceId: generationId,
          action: "delete",
          actor: actorUser,
          changedFields: ["deleted"],
        });
        sendData(response, null);
        return;
      }

      if (segments[3] === "members" && method === "GET") {
        const members = state.users
          .filter((user) => ensureArray(user.generationIds).includes(generationId))
          .map((user) => buildMemberSummary(user, generationId));
        sendData(response, members);
        return;
      }

      if (segments[3] === "notices" && !segments[4] && method === "GET") {
        const notices = state.notices.generation.filter(
          (notice) => notice.generationId === generationId,
        );
        sendData(response, notices);
        return;
      }

      if (segments[3] === "notices" && !segments[4] && method === "POST") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const created: ApiGenerationNotice = {
          id: `gnotice-${crypto.randomUUID()}`,
          generationId,
          title: typeof body?.title === "string" ? body.title : "신규 공지",
          content: typeof body?.content === "string" ? body.content : "",
          imageUrls: ensureArray(body?.imageUrls as string[]),
          author: buildUserDisplayProfile(actorUser),
          createdAt: now(),
          updatedAt: now(),
          updatedBy: buildAuditActor(actorUser),
        };
        state.notices.generation.unshift(created);
        trackAudit(state, {
          resourceType: "generation_notice",
          resourceId: created.id,
          action: "create",
          actor: actorUser,
          changedFields: ["title", "content", "imageUrls"],
        });
        sendData(response, created);
        return;
      }

      if (segments[3] === "notices" && segments[4]) {
        const noticeId = decodeURIComponent(segments[4]);
        const notice = state.notices.generation.find((item) => item.id === noticeId);
        if (!notice) {
          sendError(response, 404, "NOT_FOUND", "Generation notice not found.");
          return;
        }

        if (method === "GET") {
          sendData(response, notice);
          return;
        }

        if (method === "PATCH") {
          if (!requireWritableRole(response, role)) {
            return;
          }
          Object.assign(notice, body ?? {}, {
            updatedAt: now(),
            updatedBy: buildAuditActor(actorUser),
          });
          trackAudit(state, {
            resourceType: "generation_notice",
            resourceId: notice.id,
            action: "update",
            actor: actorUser,
            changedFields: Object.keys(body ?? {}),
          });
          sendData(response, notice);
          return;
        }

        if (method === "DELETE") {
          if (!requireWritableRole(response, role)) {
            return;
          }
          state.notices.generation = state.notices.generation.filter(
            (item) => item.id !== noticeId,
          );
          trackAudit(state, {
            resourceType: "generation_notice",
            resourceId: noticeId,
            action: "delete",
            actor: actorUser,
            changedFields: ["deleted"],
          });
          sendData(response, null);
          return;
        }
      }
    }

    // Activities
    if (pathname === "/api/activities" && method === "GET") {
      const generationId = requestUrl.searchParams.get("generationId");
      const activities = generationId
        ? state.activities.filter((item) => item.generationId === generationId)
        : state.activities;
      sendData(response, activities);
      return;
    }
    if (pathname === "/api/activities" && method === "POST") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const created: ApiActivity = {
        id: `act-${crypto.randomUUID()}`,
        title: typeof body?.title === "string" ? body.title : "신규 활동",
        description: typeof body?.description === "string" ? body.description : "",
        startDate: typeof body?.startDate === "number" ? body.startDate : now(),
        endDate: typeof body?.endDate === "number" ? body.endDate : now(),
        coverImageUrl:
          typeof body?.coverImageUrl === "string"
            ? body.coverImageUrl
            : "https://images.mock.local/activities/new-cover.jpg",
        generationId:
          typeof body?.generationId === "string"
            ? body.generationId
            : (state.generations[0]?.id ?? "gen-59"),
        createdAt: now(),
        updatedAt: now(),
        updatedBy: buildAuditActor(actorUser),
        detailImages: [],
      };
      state.activities.unshift(created);
      trackAudit(state, {
        resourceType: "activity",
        resourceId: created.id,
        action: "create",
        actor: actorUser,
        changedFields: ["title", "description", "generationId"],
      });
      sendData(response, created);
      return;
    }

    if (segments[1] === "activities" && segments[2]) {
      const activityId = decodeURIComponent(segments[2]);
      const activity = state.activities.find((item) => item.id === activityId);
      if (!activity) {
        sendError(response, 404, "NOT_FOUND", "Activity not found.");
        return;
      }

      if (!segments[3] && method === "GET") {
        sendData(response, activity);
        return;
      }

      if (!segments[3] && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        Object.assign(activity, body ?? {}, {
          updatedAt: now(),
          updatedBy: buildAuditActor(actorUser),
        });
        trackAudit(state, {
          resourceType: "activity",
          resourceId: activity.id,
          action: "update",
          actor: actorUser,
          changedFields: Object.keys(body ?? {}),
        });
        sendData(response, activity);
        return;
      }

      if (!segments[3] && method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        state.activities = state.activities.filter((item) => item.id !== activityId);
        trackAudit(state, {
          resourceType: "activity",
          resourceId: activityId,
          action: "delete",
          actor: actorUser,
          changedFields: ["deleted"],
        });
        sendData(response, null);
        return;
      }

      if (segments[3] === "images" && !segments[4] && method === "POST") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const created: ApiActivityImage = {
          id: `act-image-${crypto.randomUUID()}`,
          activityId,
          imageUrl:
            typeof body?.imageUrl === "string"
              ? body.imageUrl
              : "https://images.mock.local/activities/new-detail.jpg",
          sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
          createdAt: now(),
          updatedAt: now(),
        };
        activity.detailImages.push(created);
        sendData(response, created);
        return;
      }

      if (segments[3] === "images" && segments[4] === "batch" && method === "POST") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const payload = ensureArray(body as Record<string, unknown>[]);
        const created = payload.map((entry, index) => {
          const image: ApiActivityImage = {
            id: `act-image-${crypto.randomUUID()}`,
            activityId,
            imageUrl:
              typeof entry.imageUrl === "string"
                ? entry.imageUrl
                : `https://images.mock.local/activities/new-batch-${index + 1}.jpg`,
            sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : index,
            createdAt: now(),
            updatedAt: now(),
          };
          activity.detailImages.push(image);
          return image;
        });
        sendData(response, created);
        return;
      }

      if (segments[3] === "images" && segments[4] === "batch" && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const payload = ensureArray(body as Record<string, unknown>[]);
        for (const entry of payload) {
          const imageId = typeof entry.imageId === "string" ? entry.imageId : "";
          const currentImage = activity.detailImages.find((item) => item.id === imageId);
          if (!currentImage) {
            continue;
          }
          if (typeof entry.imageUrl === "string") {
            currentImage.imageUrl = entry.imageUrl;
          }
          if (typeof entry.sortOrder === "number") {
            currentImage.sortOrder = entry.sortOrder;
          }
          currentImage.updatedAt = now();
        }
        activity.detailImages.sort((left, right) => left.sortOrder - right.sortOrder);
        sendData(response, activity.detailImages);
        return;
      }

      if (segments[3] === "images" && segments[4] && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const imageId = decodeURIComponent(segments[4]);
        const image = activity.detailImages.find((item) => item.id === imageId);
        if (!image) {
          sendError(response, 404, "NOT_FOUND", "Activity image not found.");
          return;
        }
        if (typeof body?.imageUrl === "string") {
          image.imageUrl = body.imageUrl;
        }
        if (typeof body?.sortOrder === "number") {
          image.sortOrder = body.sortOrder;
        }
        image.updatedAt = now();
        sendData(response, image);
        return;
      }

      if (segments[3] === "images" && segments[4] && method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const imageId = decodeURIComponent(segments[4]);
        activity.detailImages = activity.detailImages.filter(
          (item) => item.id !== imageId,
        );
        sendData(response, null);
        return;
      }
    }

    // Exhibitions
    if (pathname === "/api/exhibitions" && method === "GET") {
      const generationId = requestUrl.searchParams.get("generationId");
      const exhibitions = generationId
        ? state.exhibitions.filter((item) => item.generationId === generationId)
        : state.exhibitions;
      sendData(response, exhibitions);
      return;
    }

    if (pathname === "/api/exhibitions" && method === "POST") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const created: ApiExhibition = {
        id: `exh-${crypto.randomUUID()}`,
        title: typeof body?.title === "string" ? body.title : "신규 전시",
        startDate: typeof body?.startDate === "number" ? body.startDate : now(),
        endDate: typeof body?.endDate === "number" ? body.endDate : now(),
        generationId:
          typeof body?.generationId === "string"
            ? body.generationId
            : (state.generations[0]?.id ?? "gen-59"),
        place: typeof body?.place === "string" ? body.place : "장소 미정",
        coverImageUrl:
          typeof body?.coverImageUrl === "string"
            ? body.coverImageUrl
            : "https://images.mock.local/exhibitions/new-cover.jpg",
        description: typeof body?.description === "string" ? body.description : "",
        createdAt: now(),
        updatedAt: now(),
        updatedBy: buildAuditActor(actorUser),
        detailImages: [],
      };
      state.exhibitions.unshift(created);
      trackAudit(state, {
        resourceType: "exhibition",
        resourceId: created.id,
        action: "create",
        actor: actorUser,
        changedFields: ["title", "generationId", "place"],
      });
      sendData(response, created);
      return;
    }

    if (segments[1] === "exhibitions" && segments[2]) {
      const exhibitionId = decodeURIComponent(segments[2]);
      const exhibition = state.exhibitions.find((item) => item.id === exhibitionId);
      if (!exhibition) {
        sendError(response, 404, "NOT_FOUND", "Exhibition not found.");
        return;
      }

      if (!segments[3] && method === "GET") {
        sendData(response, exhibition);
        return;
      }

      if (!segments[3] && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        Object.assign(exhibition, body ?? {}, {
          updatedAt: now(),
          updatedBy: buildAuditActor(actorUser),
        });
        trackAudit(state, {
          resourceType: "exhibition",
          resourceId: exhibition.id,
          action: "update",
          actor: actorUser,
          changedFields: Object.keys(body ?? {}),
        });
        sendData(response, exhibition);
        return;
      }

      if (!segments[3] && method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        state.exhibitions = state.exhibitions.filter((item) => item.id !== exhibitionId);
        trackAudit(state, {
          resourceType: "exhibition",
          resourceId: exhibitionId,
          action: "delete",
          actor: actorUser,
          changedFields: ["deleted"],
        });
        sendData(response, null);
        return;
      }

      if (segments[3] === "images" && !segments[4] && method === "POST") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const created: ApiExhibitionImage = {
          id: `exh-image-${crypto.randomUUID()}`,
          exhibitionId,
          imageUrl:
            typeof body?.imageUrl === "string"
              ? body.imageUrl
              : "https://images.mock.local/exhibitions/new-detail.jpg",
          sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
          createdAt: now(),
          updatedAt: now(),
        };
        exhibition.detailImages.push(created);
        sendData(response, created);
        return;
      }

      if (segments[3] === "images" && segments[4] === "batch" && method === "POST") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const payload = ensureArray(body as Record<string, unknown>[]);
        const created = payload.map((entry, index) => {
          const image: ApiExhibitionImage = {
            id: `exh-image-${crypto.randomUUID()}`,
            exhibitionId,
            imageUrl:
              typeof entry.imageUrl === "string"
                ? entry.imageUrl
                : `https://images.mock.local/exhibitions/new-batch-${index + 1}.jpg`,
            sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : index,
            createdAt: now(),
            updatedAt: now(),
          };
          exhibition.detailImages.push(image);
          return image;
        });
        sendData(response, created);
        return;
      }

      if (segments[3] === "images" && segments[4] === "batch" && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const payload = ensureArray(body as Record<string, unknown>[]);
        for (const entry of payload) {
          const imageId = typeof entry.imageId === "string" ? entry.imageId : "";
          const image = exhibition.detailImages.find((item) => item.id === imageId);
          if (!image) {
            continue;
          }
          if (typeof entry.imageUrl === "string") {
            image.imageUrl = entry.imageUrl;
          }
          if (typeof entry.sortOrder === "number") {
            image.sortOrder = entry.sortOrder;
          }
          image.updatedAt = now();
        }
        exhibition.detailImages.sort((left, right) => left.sortOrder - right.sortOrder);
        sendData(response, exhibition.detailImages);
        return;
      }

      if (segments[3] === "images" && segments[4] && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const imageId = decodeURIComponent(segments[4]);
        const image = exhibition.detailImages.find((item) => item.id === imageId);
        if (!image) {
          sendError(response, 404, "NOT_FOUND", "Exhibition image not found.");
          return;
        }
        if (typeof body?.imageUrl === "string") {
          image.imageUrl = body.imageUrl;
        }
        if (typeof body?.sortOrder === "number") {
          image.sortOrder = body.sortOrder;
        }
        image.updatedAt = now();
        sendData(response, image);
        return;
      }

      if (segments[3] === "images" && segments[4] && method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const imageId = decodeURIComponent(segments[4]);
        exhibition.detailImages = exhibition.detailImages.filter(
          (item) => item.id !== imageId,
        );
        sendData(response, null);
        return;
      }
    }

    // Global notices
    if (pathname === "/api/global-notices" && method === "GET") {
      sendData(response, state.notices.global);
      return;
    }

    if (pathname === "/api/global-notices" && method === "POST") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const created: ApiGlobalNotice = {
        id: `notice-${crypto.randomUUID()}`,
        title: typeof body?.title === "string" ? body.title : "신규 전체 공지",
        content: typeof body?.content === "string" ? body.content : "",
        imageUrls: ensureArray(body?.imageUrls as string[]),
        author: buildUserDisplayProfile(actorUser),
        createdAt: now(),
        updatedAt: now(),
        updatedBy: buildAuditActor(actorUser),
      };
      state.notices.global.unshift(created);
      trackAudit(state, {
        resourceType: "global_notice",
        resourceId: created.id,
        action: "create",
        actor: actorUser,
        changedFields: ["title", "content", "imageUrls"],
      });
      sendData(response, created);
      return;
    }

    if (segments[1] === "global-notices" && segments[2]) {
      const noticeId = decodeURIComponent(segments[2]);
      const notice = state.notices.global.find((item) => item.id === noticeId);
      if (!notice) {
        sendError(response, 404, "NOT_FOUND", "Global notice not found.");
        return;
      }

      if (method === "GET") {
        sendData(response, notice);
        return;
      }
      if (method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        Object.assign(notice, body ?? {}, {
          updatedAt: now(),
          updatedBy: buildAuditActor(actorUser),
        });
        trackAudit(state, {
          resourceType: "global_notice",
          resourceId: notice.id,
          action: "update",
          actor: actorUser,
          changedFields: Object.keys(body ?? {}),
        });
        sendData(response, notice);
        return;
      }
      if (method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        state.notices.global = state.notices.global.filter(
          (item) => item.id !== noticeId,
        );
        trackAudit(state, {
          resourceType: "global_notice",
          resourceId: noticeId,
          action: "delete",
          actor: actorUser,
          changedFields: ["deleted"],
        });
        sendData(response, null);
        return;
      }
    }

    // Linktree
    if (pathname === "/api/linktree" && method === "GET") {
      sendData(response, state.linktrees);
      return;
    }

    if (pathname === "/api/linktree" && method === "POST") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const created: ApiLinktree = {
        id: `linktree-${crypto.randomUUID()}`,
        name: typeof body?.name === "string" ? body.name : "신규 링크 그룹",
        createdAt: now(),
        updatedAt: now(),
        updatedBy: buildAuditActor(actorUser),
        items: [],
      };
      state.linktrees.unshift(created);
      trackAudit(state, {
        resourceType: "linktree",
        resourceId: created.id,
        action: "create",
        actor: actorUser,
        changedFields: ["name"],
      });
      sendData(response, created);
      return;
    }

    if (segments[1] === "linktree" && segments[2]) {
      const linktreeId = decodeURIComponent(segments[2]);
      const linktree = state.linktrees.find((item) => item.id === linktreeId);
      if (!linktree) {
        sendError(response, 404, "NOT_FOUND", "Linktree not found.");
        return;
      }

      if (!segments[3] && method === "GET") {
        sendData(response, linktree);
        return;
      }

      if (!segments[3] && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        if (typeof body?.name === "string") {
          linktree.name = body.name;
        }
        linktree.updatedAt = now();
        linktree.updatedBy = buildAuditActor(actorUser);
        trackAudit(state, {
          resourceType: "linktree",
          resourceId: linktree.id,
          action: "update",
          actor: actorUser,
          changedFields: Object.keys(body ?? {}),
        });
        sendData(response, linktree);
        return;
      }

      if (!segments[3] && method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        state.linktrees = state.linktrees.filter((item) => item.id !== linktreeId);
        trackAudit(state, {
          resourceType: "linktree",
          resourceId: linktreeId,
          action: "delete",
          actor: actorUser,
          changedFields: ["deleted"],
        });
        sendData(response, null);
        return;
      }

      if (segments[3] === "items" && !segments[4] && method === "POST") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const created: ApiLinktreeItem = {
          id: `linktree-item-${crypto.randomUUID()}`,
          linktreeId,
          name: typeof body?.name === "string" ? body.name : "신규 링크",
          link:
            typeof body?.link === "string" ? body.link : "https://example.com/new-link",
          createdAt: now(),
          updatedAt: now(),
          updatedBy: buildAuditActor(actorUser),
        };
        linktree.items.push(created);
        linktree.updatedAt = now();
        sendData(response, created);
        return;
      }

      if (segments[3] === "items" && segments[4]) {
        const itemId = decodeURIComponent(segments[4]);
        const item = linktree.items.find((entry) => entry.id === itemId);
        if (!item) {
          sendError(response, 404, "NOT_FOUND", "Linktree item not found.");
          return;
        }

        if (method === "PATCH") {
          if (!requireWritableRole(response, role)) {
            return;
          }
          if (typeof body?.name === "string") {
            item.name = body.name;
          }
          if (typeof body?.link === "string") {
            item.link = body.link;
          }
          item.updatedAt = now();
          item.updatedBy = buildAuditActor(actorUser);
          linktree.updatedAt = now();
          sendData(response, item);
          return;
        }

        if (method === "DELETE") {
          if (!requireWritableRole(response, role)) {
            return;
          }
          linktree.items = linktree.items.filter((entry) => entry.id !== itemId);
          linktree.updatedAt = now();
          sendData(response, null);
          return;
        }
      }
    }

    // Market
    if (pathname === "/api/market/items" && method === "GET") {
      const status = requestUrl.searchParams.get("status");
      const sellerId = requestUrl.searchParams.get("sellerId");
      let items = [...state.marketItems];
      if (status) {
        items = items.filter((item) => item.status === status);
      }
      if (sellerId) {
        items = items.filter((item) => item.sellerId === sellerId);
      }
      sendData(response, items);
      return;
    }

    if (pathname === "/api/market/items" && method === "POST") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const created: ApiMarketItem = {
        id: `market-${crypto.randomUUID()}`,
        sellerId: actorUser.id,
        name: typeof body?.name === "string" ? body.name : "신규 판매글",
        imageUrls: ensureArray(body?.imageUrls as string[]),
        manufacturer: typeof body?.manufacturer === "string" ? body.manufacturer : null,
        productCode: typeof body?.productCode === "string" ? body.productCode : null,
        conditionGrade:
          typeof body?.conditionGrade === "string"
            ? (body.conditionGrade as ApiMarketItem["conditionGrade"])
            : null,
        description: typeof body?.description === "string" ? body.description : null,
        price: typeof body?.price === "number" ? body.price : 0,
        status: "selling",
        seller: buildUserDisplayProfile(actorUser),
        createdAt: now(),
        updatedAt: now(),
        updatedBy: buildAuditActor(actorUser),
      };
      state.marketItems.unshift(created);
      trackAudit(state, {
        resourceType: "market_item",
        resourceId: created.id,
        action: "create",
        actor: actorUser,
        changedFields: ["name", "price", "status"],
      });
      sendData(response, created);
      return;
    }

    if (segments[1] === "market" && segments[2] === "items" && segments[3]) {
      const itemId = decodeURIComponent(segments[3]);
      const item = state.marketItems.find((entry) => entry.id === itemId);
      if (!item) {
        sendError(response, 404, "NOT_FOUND", "Market item not found.");
        return;
      }

      if (!segments[4] && method === "GET") {
        sendData(response, item);
        return;
      }

      if (!segments[4] && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        Object.assign(item, body ?? {}, {
          updatedAt: now(),
          updatedBy: buildAuditActor(actorUser),
        });
        sendData(response, item);
        return;
      }

      if (!segments[4] && method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        state.marketItems = state.marketItems.filter((entry) => entry.id !== itemId);
        state.comments = state.comments.filter((entry) => entry.itemId !== itemId);
        sendData(response, null);
        return;
      }

      if (segments[4] === "status" && method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const status = normalizeRole(body?.status) as ApiMarketItemStatus | null;
        if (!status || !["selling", "reserved", "sold"].includes(status)) {
          sendError(response, 400, "BAD_REQUEST", "Invalid market status.");
          return;
        }
        item.status = status;
        item.updatedAt = now();
        item.updatedBy = buildAuditActor(actorUser);
        sendData(response, item);
        return;
      }

      if (segments[4] === "comments" && method === "GET") {
        const comments = state.comments.filter((entry) => entry.itemId === itemId);
        sendData(response, comments);
        return;
      }

      if (segments[4] === "comments" && method === "POST") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        const created: ApiMarketComment = {
          id: `market-comment-${crypto.randomUUID()}`,
          itemId,
          author: buildUserDisplayProfile(actorUser),
          content: typeof body?.content === "string" ? body.content : "",
          createdAt: now(),
          updatedAt: now(),
          updatedBy: buildAuditActor(actorUser),
        };
        state.comments.push(created);
        sendData(response, created);
        return;
      }
    }

    if (segments[1] === "market" && segments[2] === "comments" && segments[3]) {
      const commentId = decodeURIComponent(segments[3]);
      const comment = state.comments.find((entry) => entry.id === commentId);
      if (!comment) {
        sendError(response, 404, "NOT_FOUND", "Market comment not found.");
        return;
      }

      if (method === "PATCH") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        if (typeof body?.content === "string") {
          comment.content = body.content;
        }
        comment.updatedAt = now();
        comment.updatedBy = buildAuditActor(actorUser);
        sendData(response, comment);
        return;
      }

      if (method === "DELETE") {
        if (!requireWritableRole(response, role)) {
          return;
        }
        state.comments = state.comments.filter((entry) => entry.id !== commentId);
        sendData(response, null);
        return;
      }
    }

    if (pathname === "/api/market/push-subscriptions" && method === "POST") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
      const p256dh = typeof body?.p256dh === "string" ? body.p256dh : "";
      const auth = typeof body?.auth === "string" ? body.auth : "";
      if (!endpoint || !p256dh || !auth) {
        sendError(response, 400, "BAD_REQUEST", "Invalid push subscription payload.");
        return;
      }
      const existing = state.subscriptions.find(
        (subscription) => subscription.endpoint === endpoint,
      );
      if (existing) {
        existing.p256dh = p256dh;
        existing.auth = auth;
      } else {
        state.subscriptions.push({ endpoint, p256dh, auth });
      }
      sendData(response, null);
      return;
    }

    if (pathname === "/api/market/push-subscriptions" && method === "DELETE") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
      state.subscriptions = state.subscriptions.filter(
        (subscription) => subscription.endpoint !== endpoint,
      );
      sendData(response, null);
      return;
    }

    // Site settings
    if (pathname === "/api/site-settings" && method === "GET") {
      sendData(response, state.siteSettings);
      return;
    }

    if (pathname === "/api/site-settings" && method === "PATCH") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      Object.assign(state.siteSettings, body ?? {});
      sendData(response, state.siteSettings);
      return;
    }

    // Recruiting plan
    if (pathname === "/api/recruiting-plan/current" && method === "GET") {
      sendData(response, state.recruitingPlan);
      return;
    }

    if (pathname === "/api/recruiting-plan/current" && method === "PATCH") {
      if (!requireWritableRole(response, role)) {
        return;
      }
      const nextPlan: ApiRecruitingPlan = {
        year: new Date().getFullYear(),
        title:
          typeof body?.title === "string"
            ? body.title
            : (state.recruitingPlan?.title ?? ""),
        content:
          typeof body?.content === "string"
            ? body.content
            : (state.recruitingPlan?.content ?? ""),
        promotionImageUrls: ensureArray(body?.promotionImageUrls as string[]),
        recruitmentStartAt:
          typeof body?.recruitmentStartAt === "number"
            ? body.recruitmentStartAt
            : (state.recruitingPlan?.recruitmentStartAt ?? now()),
        recruitmentEndAt:
          typeof body?.recruitmentEndAt === "number"
            ? body.recruitmentEndAt
            : (state.recruitingPlan?.recruitmentEndAt ?? now()),
        createdAt: state.recruitingPlan?.createdAt ?? now(),
        updatedAt: now(),
      };
      state.recruitingPlan = nextPlan;
      sendData(response, nextPlan);
      return;
    }

    // Admin dashboard stats
    if (pathname === "/api/admin/dashboard" && method === "GET") {
      const generationSortOrder = readNumberQuery(
        requestUrl.searchParams.get("generationSortOrder"),
      );
      sendData(response, buildAdminDashboardStats(state, generationSortOrder));
      return;
    }

    // Audit
    if (segments[1] === "audit" && segments[2] && segments[3] && method === "GET") {
      const resourceType = decodeURIComponent(segments[2]);
      const resourceId = decodeURIComponent(segments[3]);
      const limit = Math.max(
        1,
        Math.min(200, Number(requestUrl.searchParams.get("limit") ?? "20")),
      );
      const logs = state.auditLogs
        .filter(
          (log) => log.resourceType === resourceType && log.resourceId === resourceId,
        )
        .slice(0, limit);
      sendData(response, logs);
      return;
    }

    sendError(response, 404, "NOT_FOUND", `Unhandled route: ${method} ${pathname}`);
  } catch (error) {
    sendError(
      response,
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unknown server error",
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[mock-api] listening on http://${HOST}:${PORT}`);
});
