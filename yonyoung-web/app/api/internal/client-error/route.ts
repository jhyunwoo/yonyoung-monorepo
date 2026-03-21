import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/server/observability/logger";
import {
  normalizeObservedRoute,
  summarizeClientErrorForLog,
  summarizeRouterTransitionForLog,
} from "@/server/observability/client-telemetry";
import {
  INTERNAL_EVENT_BODY_LIMIT_BYTES,
  enforceRequestBodyLimit,
  enforceSameOriginProtection,
} from "@/server/security/request-guards";

const clientErrorPayloadSchema = z.object({
  event: z.enum(["client.error", "client.unhandledrejection", "router.transition.start"]),
  path: z.string().min(1),
  message: z.string().optional(),
  stack: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sampledAt: z.number().finite(),
});

const parseBody = async (request: NextRequest): Promise<unknown> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json().catch(() => null);
  }

  const text = await request.text().catch(() => "");
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfProtectionResponse = enforceSameOriginProtection(request);
  if (csrfProtectionResponse) {
    return csrfProtectionResponse;
  }

  const bodyLimitResponse = enforceRequestBodyLimit(
    request,
    INTERNAL_EVENT_BODY_LIMIT_BYTES,
  );
  if (bodyLimitResponse) {
    return bodyLimitResponse;
  }

  const body = await parseBody(request);
  const parsed = clientErrorPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const requestId = request.headers.get("x-request-id")?.trim();
  const traceId = request.headers.get("x-trace-id")?.trim();
  const route = normalizeObservedRoute(parsed.data.path);

  const baseLogPayload = {
    event: parsed.data.event,
    route,
    status: 202,
    requestId: requestId || undefined,
    traceId: traceId || undefined,
    ingestPath: request.nextUrl.pathname,
    ingestMethod: request.method,
  };

  if (parsed.data.event === "router.transition.start") {
    logger.info({
      ...baseLogPayload,
      transition: summarizeRouterTransitionForLog(parsed.data),
    });
  } else {
    logger.warn({
      ...baseLogPayload,
      error: summarizeClientErrorForLog(parsed.data),
    });
  }

  return NextResponse.json(
    { ok: true },
    {
      status: 202,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
