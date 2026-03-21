import type { MiddlewareHandler } from "hono";
import type HonoAppType from "../../types/honoAppType";
import { getAuthCorsOrigins } from "../../lib/auth";
import { forbidden } from "../../lib/http/response";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PREFIXES = [
  "/api/auth",
  "/api/public",
  "/api/openapi.json",
  "/api/docs",
  "/doc",
  "/ui",
] as const;
const SAME_SITE_FETCH_VALUES = new Set(["same-origin", "same-site", "none"]);

const isCsrfExemptPath = (path: string): boolean =>
  CSRF_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));

const readRequestOrigin = (request: Request): string | null => {
  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    return origin;
  }

  const referer = request.headers.get("referer")?.trim();
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

export const apiCsrfProtectionMiddleware: MiddlewareHandler<HonoAppType> = async (
  c,
  next,
) => {
  if (SAFE_METHODS.has(c.req.method.toUpperCase()) || isCsrfExemptPath(c.req.path)) {
    await next();
    return;
  }

  const secFetchSite = c.req.header("sec-fetch-site")?.trim().toLowerCase();
  if (secFetchSite && !SAME_SITE_FETCH_VALUES.has(secFetchSite)) {
    return forbidden(c, "교차 출처 상태 변경 요청은 허용되지 않습니다.");
  }

  const requestOrigin = readRequestOrigin(c.req.raw);
  if (!requestOrigin) {
    await next();
    return;
  }

  const allowedOrigins = getAuthCorsOrigins(c.env);
  if (!allowedOrigins.includes(requestOrigin)) {
    return forbidden(c, "허용되지 않은 출처에서 온 요청입니다.");
  }

  await next();
};
