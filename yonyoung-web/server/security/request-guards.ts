import { NextRequest, NextResponse } from "next/server";
import {
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
} from "@/shared/security/csrf";

export { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@/shared/security/csrf";
export const API_PROXY_BODY_LIMIT_BYTES = 5 * 1024 * 1024;
export const INTERNAL_EVENT_BODY_LIMIT_BYTES = 64 * 1024;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ALLOWED_SEC_FETCH_SITE_VALUES = new Set(["same-origin", "none"]);
const DEFAULT_ALLOWED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "cache-control",
  "content-type",
  "cookie",
  "if-match",
  "if-modified-since",
  "if-none-match",
  "if-unmodified-since",
  "origin",
  "pragma",
  "range",
  "referer",
  "sec-fetch-site",
  "user-agent",
  "x-request-id",
  "x-trace-id",
] as const;

const createJsonErrorResponse = (
  status: number,
  message: string,
): NextResponse<{ ok: false; message: string }> => {
  return NextResponse.json(
    { ok: false, message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
};

const readContentLength = (request: NextRequest): number | null => {
  const rawValue = request.headers.get("content-length")?.trim();
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const readRequestOrigin = (request: NextRequest): string | null => {
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

const isInvalidPathSegment = (segment: string): boolean => {
  const trimmed = segment.trim();
  return (
    trimmed.length === 0 ||
    trimmed === "." ||
    trimmed === ".." ||
    trimmed.includes("/") ||
    trimmed.includes("\\")
  );
};

export const enforceRequestBodyLimit = (
  request: NextRequest,
  maxBytes: number,
): NextResponse<{ ok: false; message: string }> | null => {
  const method = request.method.toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return null;
  }

  const contentLength = readContentLength(request);
  if (contentLength !== null && contentLength > maxBytes) {
    return createJsonErrorResponse(413, "Request body is too large.");
  }

  return null;
};

export const enforceSameOriginProtection = (
  request: NextRequest,
  options?: {
    requireCsrfHeader?: boolean;
  },
): NextResponse<{ ok: false; message: string }> | null => {
  const method = request.method.toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return null;
  }

  const secFetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (secFetchSite && !ALLOWED_SEC_FETCH_SITE_VALUES.has(secFetchSite)) {
    return createJsonErrorResponse(403, "Cross-site state-changing requests are blocked.");
  }

  const requestOrigin = readRequestOrigin(request);
  if (!requestOrigin || requestOrigin !== request.nextUrl.origin) {
    return createJsonErrorResponse(403, "Same-origin requests are required.");
  }

  if (options?.requireCsrfHeader) {
    const csrfHeaderValue = request.headers.get(CSRF_HEADER_NAME)?.trim();
    if (csrfHeaderValue !== CSRF_HEADER_VALUE) {
      return createJsonErrorResponse(403, "Missing CSRF protection header.");
    }
  }

  return null;
};

export const normalizeProxyPath = (input: {
  pathSegments: string[];
  allowedPrefixes: readonly string[];
  blockedPrefixes?: readonly string[];
}): string | null => {
  const { pathSegments, allowedPrefixes, blockedPrefixes = [] } = input;
  if (pathSegments.length === 0) {
    return null;
  }

  const [prefix] = pathSegments;
  if (!prefix || blockedPrefixes.includes(prefix) || !allowedPrefixes.includes(prefix)) {
    return null;
  }

  if (pathSegments.some(isInvalidPathSegment)) {
    return null;
  }

  return pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
};

export const buildUpstreamProxyHeaders = (
  request: NextRequest,
  options?: {
    allowedHeaders?: readonly string[];
    extraHeaders?: Record<string, string>;
  },
): Headers => {
  const headers = new Headers();
  const allowedHeaders = options?.allowedHeaders ?? DEFAULT_ALLOWED_REQUEST_HEADERS;

  for (const headerName of allowedHeaders) {
    const value = request.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  for (const [key, value] of Object.entries(options?.extraHeaders ?? {})) {
    headers.set(key, value);
  }

  return headers;
};
