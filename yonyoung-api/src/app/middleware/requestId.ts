import type { MiddlewareHandler } from "hono";
import type HonoAppType from "../../types/honoAppType";

const readIncomingRequestId = (request: Request): string | null => {
  const fromHeader = request.headers.get("x-request-id")?.trim();
  if (fromHeader) {
    return fromHeader;
  }

  const fromCloudflareRay = request.headers.get("cf-ray")?.trim();
  if (fromCloudflareRay) {
    return fromCloudflareRay;
  }

  return null;
};

export const requestIdMiddleware: MiddlewareHandler<HonoAppType> = async (
  c,
  next,
) => {
  const requestId = readIncomingRequestId(c.req.raw) ?? crypto.randomUUID();

  c.set("requestId", requestId);
  c.set("correlationId", requestId);
  c.set("startedAt", performance.now());
  c.set("cacheStatus", null);
  c.set("actorResolved", false);
  c.set("dataService", null);

  await next();

  c.res.headers.set("X-Request-Id", requestId);
  c.res.headers.set("X-Correlation-Id", requestId);
};
