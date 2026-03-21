import type { ApiErrorEnvelope, DataEnvelope } from "@/shared/contracts/api-contracts";

export type { DataEnvelope } from "@/shared/contracts/api-contracts";

export const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

export const normalizePath = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

export type ForwardedRequestContext = {
  host: string | null;
  protocol: "http" | "https";
  origin: string | null;
};

const readPrimaryHeaderValue = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const [first] = value.split(",");
  const trimmed = first?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const isLoopbackHost = (value: string): boolean => {
  let normalized: string;
  try {
    normalized = new URL(`http://${value}`).hostname.trim().toLowerCase();
  } catch {
    normalized = value.trim().toLowerCase();
  }

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized?.endsWith(".localhost") === true
  );
};

const normalizeProtocol = (value: string | null): "http" | "https" | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "http" || normalized === "http:") {
    return "http";
  }

  if (normalized === "https" || normalized === "https:") {
    return "https";
  }

  return null;
};

export const resolveForwardedRequestContext = (input: {
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  origin?: string | null;
}): ForwardedRequestContext => {
  const host =
    readPrimaryHeaderValue(input.forwardedHost) ?? readPrimaryHeaderValue(input.host);
  const protocol =
    normalizeProtocol(readPrimaryHeaderValue(input.forwardedProto)) ??
    (host && isLoopbackHost(host) ? "http" : "https");

  const originCandidate = readPrimaryHeaderValue(input.origin);
  if (originCandidate) {
    try {
      return {
        host,
        protocol,
        origin: new URL(originCandidate).origin,
      };
    } catch {
      // Ignore malformed Origin headers and fall back to the current host context.
    }
  }

  return {
    host,
    protocol,
    origin: host ? `${protocol}://${host}` : null,
  };
};

export const applyForwardedRequestContextHeaders = (
  headers: Headers,
  context: ForwardedRequestContext,
): Headers => {
  if (context.host) {
    headers.set("x-forwarded-host", context.host);
  }

  headers.set("x-forwarded-proto", context.protocol);

  if (context.origin) {
    headers.set("origin", context.origin);
  }

  return headers;
};

export const resolveBaseUrl = (
  candidates: Array<string | undefined | null>,
  fallback: string,
): string => {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return normalizeBaseUrl(trimmed);
      }
    }
  }

  return normalizeBaseUrl(fallback);
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseApiErrorEnvelope = (value: unknown): ApiErrorEnvelope | null => {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null;
  }

  const code = value.error.code;
  const message = value.error.message;
  const requestId = value.error.requestId;
  if (
    typeof code !== "string" ||
    typeof message !== "string" ||
    typeof requestId !== "string"
  ) {
    return null;
  }

  return {
    error: {
      code,
      message,
      requestId,
    },
  } as ApiErrorEnvelope;
};

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(input: {
    status: number;
    code?: string;
    message: string;
    requestId?: string | null;
  }) {
    super(input.message);
    this.name = "AdminApiError";
    this.status = input.status;
    this.code = input.code ?? "UNKNOWN";
    this.requestId = input.requestId ?? null;
  }
}

export const createTimeoutController = (
  timeoutMs: number,
): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
};

export const clearTimeoutController = (
  timeoutId: ReturnType<typeof setTimeout>,
): void => {
  clearTimeout(timeoutId);
};

export const parseJsonBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text.length > 0 ? text : null;
  }

  return response.json();
};

// ---------------------------------------------------------------------------
// Shared type guards & data helpers
// ---------------------------------------------------------------------------

export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
};

export const unwrapDataEnvelope = <T>(payload: unknown): T | null => {
  const record = asRecord(payload);
  if (record && "data" in record) {
    return (record as DataEnvelope<T>).data ?? null;
  }
  return payload as T;
};

// ---------------------------------------------------------------------------
// Cookie header (server-only)
// ---------------------------------------------------------------------------

export const readCookieHeader = async (): Promise<string | null> => {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader.length > 0 ? cookieHeader : null;
};

// ---------------------------------------------------------------------------
// Centralised API base URL resolution
// ---------------------------------------------------------------------------

export const resolveApiBaseUrl = (options?: { clientSide?: boolean }): string => {
  const isClient = options?.clientSide ?? typeof window !== "undefined";

  if (isClient) {
    if (typeof window === "undefined") {
      return "";
    }
    return normalizeBaseUrl(window.location.origin);
  }

  const serverBaseUrl = process.env.API_BASE_URL?.trim();
  if (!serverBaseUrl) {
    throw new Error("API_BASE_URL is required on the server runtime.");
  }

  return normalizeBaseUrl(serverBaseUrl);
};
