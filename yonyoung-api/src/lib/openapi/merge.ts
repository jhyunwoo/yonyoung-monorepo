 
export type OpenAPIDocument = {
  openapi?: string;
  info?: any;
  paths?: Record<string, Record<string, any>>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    [key: string]: any;
  };
  tags?: Array<{ name: string; [key: string]: any }>;
  [key: string]: any;
};

/**
 * isRecord 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const isRecord = (value: unknown): value is Record<string, any> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "trace",
]);

/**
 * ensureAuthPathPrefix의 핵심 비즈니스 로직을 수행합니다.
 * @param path 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const ensureAuthPathPrefix = (path: string): string => {
  if (path.startsWith("/api/auth")) {
    return path;
  }
  return `/api/auth${path.startsWith("/") ? path : `/${path}`}`;
};

/**
 * mergeTags의 핵심 비즈니스 로직을 수행합니다.
 * @param internalTags 함수 로직에서 사용하는 입력값입니다.
 * @param authTags 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const mergeTags = (
  internalTags: OpenAPIDocument["tags"],
  authTags: OpenAPIDocument["tags"],
) => {
  const merged = [...(internalTags ?? [])];
  const tagByName = new Map<string, { name: string; [key: string]: any }>();

  for (const tag of merged) {
    if (!tag || typeof tag.name !== "string") {
      continue;
    }
    tagByName.set(tag.name, tag);
  }

  for (const tag of authTags ?? []) {
    if (!tag || typeof tag.name !== "string") {
      continue;
    }

    const existing = tagByName.get(tag.name);
    if (!existing) {
      merged.push(tag);
      tagByName.set(tag.name, tag);
      continue;
    }

    if (
      (!existing.description || String(existing.description).trim() === "") &&
      tag.description
    ) {
      existing.description = tag.description;
    }
  }

  return merged;
};

/**
 * mergePaths의 핵심 비즈니스 로직을 수행합니다.
 * @param internalPaths 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @param authPaths 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const mergePaths = (
  internalPaths: OpenAPIDocument["paths"] | undefined,
  authPaths: OpenAPIDocument["paths"] | undefined,
) => {
  const mergedPaths = { ...(internalPaths ?? {}) };
  const existingOperationIds = new Set<string>();

  for (const path of Object.values(mergedPaths)) {
    if (!isRecord(path)) {
      continue;
    }
    for (const [method, operation] of Object.entries(path)) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }
      if (
        isRecord(operation) &&
        "operationId" in operation &&
        typeof operation.operationId === "string"
      ) {
        existingOperationIds.add(operation.operationId);
      }
    }
  }

  for (const [rawPath, pathItem] of Object.entries(authPaths ?? {})) {
    if (!isRecord(pathItem)) {
      continue;
    }

    const normalizedPath = ensureAuthPathPrefix(rawPath);
    const normalizedPathItem = { ...pathItem };

    for (const [method, operation] of Object.entries(normalizedPathItem)) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }
      if (
        !isRecord(operation) ||
        !("operationId" in operation) ||
        typeof operation.operationId !== "string"
      ) {
        continue;
      }

      if (existingOperationIds.has(operation.operationId)) {
        normalizedPathItem[method] = {
          ...operation,
          operationId: `auth_${operation.operationId}`,
        };
      } else {
        existingOperationIds.add(operation.operationId);
      }
    }

    if (!mergedPaths[normalizedPath]) {
      mergedPaths[normalizedPath] = normalizedPathItem;
      continue;
    }

    mergedPaths[normalizedPath] = {
      ...mergedPaths[normalizedPath],
      ...normalizedPathItem,
    };
  }

  return mergedPaths;
};

/**
 * mergeOpenApiDocuments의 핵심 비즈니스 로직을 수행합니다.
 * @param internalDoc 함수 로직에서 사용하는 입력값입니다.
 * @param authDoc 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const mergeOpenApiDocuments = (
  internalDoc: OpenAPIDocument,
  authDoc: OpenAPIDocument,
): OpenAPIDocument => {
  const internalComponents = isRecord(internalDoc.components)
    ? internalDoc.components
    : {};
  const authComponents = isRecord(authDoc.components) ? authDoc.components : {};

  return {
    ...internalDoc,
    openapi: "3.1.1",
    paths: mergePaths(internalDoc.paths, authDoc.paths),
    components: {
      ...internalComponents,
      ...authComponents,
      schemas: {
        ...(isRecord(internalComponents.schemas) ? internalComponents.schemas : {}),
        ...(isRecord(authComponents.schemas) ? authComponents.schemas : {}),
      },
      securitySchemes: {
        ...(isRecord(internalComponents.securitySchemes)
          ? internalComponents.securitySchemes
          : {}),
        ...(isRecord(authComponents.securitySchemes)
          ? authComponents.securitySchemes
          : {}),
      },
    },
    tags: mergeTags(internalDoc.tags, authDoc.tags),
  };
};
