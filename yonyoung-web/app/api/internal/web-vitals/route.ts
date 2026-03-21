import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/server/observability/logger";
import {
  normalizeObservedRoute,
  summarizeWebVitalForLog,
} from "@/server/observability/client-telemetry";
import {
  INTERNAL_EVENT_BODY_LIMIT_BYTES,
  enforceRequestBodyLimit,
  enforceSameOriginProtection,
} from "@/server/security/request-guards";

const webVitalsPayloadSchema = z.object({
  id: z.string().min(1),
  name: z.enum(["CLS", "INP", "LCP", "FCP", "TTFB"]),
  value: z.number().finite(),
  rating: z.string().min(1),
  path: z.string().min(1),
  delta: z.number().finite().optional(),
  navigationType: z.string().optional(),
  sampledAt: z.number().finite().optional(),
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
  const parsed = webVitalsPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const requestId = request.headers.get("x-request-id")?.trim();
  const traceId = request.headers.get("x-trace-id")?.trim();
  const route = normalizeObservedRoute(parsed.data.path);

  logger.info({
    event: "web-vitals",
    route,
    method: request.method,
    status: 202,
    requestId: requestId || undefined,
    traceId: traceId || undefined,
    metric: summarizeWebVitalForLog(parsed.data),
  });

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
