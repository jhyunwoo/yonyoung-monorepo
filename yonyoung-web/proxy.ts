import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/server/observability/logger";
import {
  applyForwardedRequestContextHeaders,
  resolveForwardedRequestContext,
} from "@/shared/http/http";

const sessionSchema = z.object({
  session: z.object({
    id: z.string(),
    userId: z.string(),
    token: z.string(),
  }),
  user: z.object({
    id: z.string(),
    role: z.string().optional().nullable(),
  }),
});

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

const getApiBaseUrl = (): string => {
  const value = process.env.API_BASE_URL?.trim();
  if (!value) {
    throw new Error("API_BASE_URL is required for proxy authentication checks.");
  }

  return normalizeBaseUrl(value);
};

const isAuthorizedDashboardRole = (role: string | null | undefined): boolean => {
  if (!role) {
    return false;
  }

  return role.toLowerCase() !== "unverified";
};

const ensureCorrelationId = (
  request: NextRequest,
  headerName: "x-request-id" | "x-trace-id",
): string => {
  const incoming = request.headers.get(headerName)?.trim();
  if (incoming) {
    return incoming;
  }

  return crypto.randomUUID();
};

const withCorrelationHeaders = (
  response: NextResponse,
  requestId: string,
  traceId: string,
): NextResponse => {
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-trace-id", traceId);
  return response;
};

const redirectToSignIn = (
  request: NextRequest,
  requestId: string,
  traceId: string,
): NextResponse => {
  const signInUrl = new URL("/auth/sign-in", request.url);
  signInUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return withCorrelationHeaders(NextResponse.redirect(signInUrl), requestId, traceId);
};

const createForbiddenResponse = (requestId: string, traceId: string): NextResponse =>
  withCorrelationHeaders(
    new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }),
    requestId,
    traceId,
  );

const fetchSession = async (request: NextRequest, requestId: string, traceId: string) => {
  const headers = new Headers({
    Accept: "application/json",
    cookie: request.headers.get("cookie") ?? "",
    "x-request-id": requestId,
    "x-trace-id": traceId,
  });

  applyForwardedRequestContextHeaders(
    headers,
    resolveForwardedRequestContext({
      host: request.nextUrl.host,
      forwardedProto: request.nextUrl.protocol,
      origin: request.nextUrl.origin,
    }),
  );

  const response = await fetch(`${getApiBaseUrl()}/api/auth/get-session`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json().catch(() => null)) as unknown;
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
};

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (!request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const requestId = ensureCorrelationId(request, "x-request-id");
  const traceId = ensureCorrelationId(request, "x-trace-id");

  try {
    const session = await fetchSession(request, requestId, traceId);

    if (!session) {
      return redirectToSignIn(request, requestId, traceId);
    }

    if (!isAuthorizedDashboardRole(session.user.role)) {
      return createForbiddenResponse(requestId, traceId);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-request-id", requestId);
    requestHeaders.set("x-trace-id", traceId);

    return withCorrelationHeaders(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      requestId,
      traceId,
    );
  } catch (error) {
    logger.error({
      event: "proxy.auth_check_failed",
      route: request.nextUrl.pathname,
      method: request.method,
      requestId,
      traceId,
      error: error instanceof Error ? { message: error.message } : { value: error },
    });

    return redirectToSignIn(request, requestId, traceId);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
