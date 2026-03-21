import type { MiddlewareHandler } from "hono";
import { parseBooleanEnv, parseNumberEnv } from "../../bindings/env";
import type HonoAppType from "../../types/honoAppType";
import { logger } from "../../shared/logging/logger";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "proxy-authorization",
]);

const redactHeaders = (headers: Headers): Record<string, string> => {
  const selected = [
    "user-agent",
    "content-type",
    "cf-connecting-ip",
    "cf-ray",
    "authorization",
    "cookie",
  ];
  const snapshot: Record<string, string> = {};

  for (const key of selected) {
    const value = headers.get(key);
    if (!value) {
      continue;
    }

    snapshot[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? "[REDACTED]" : value;
  }

  return snapshot;
};

const resolveExecutionContext = (
  c: { executionCtx?: ExecutionContext },
): ExecutionContext | undefined => {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
};

const enqueueLog = (
  c: { executionCtx?: ExecutionContext },
  run: () => void,
): void => {
  const task = Promise.resolve().then(run);
  const executionCtx = resolveExecutionContext(c);

  if (executionCtx && typeof executionCtx.waitUntil === "function") {
    executionCtx.waitUntil(task);
    return;
  }

  void task;
};

const readRequestId = (
  c: {
    get: (key: "requestId") => string;
  },
): string => c.get("requestId");

const DEFAULT_PERF_ANALYTICS_SAMPLE_RATE = 0.2;

const normalizeSampleRate = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_PERF_ANALYTICS_SAMPLE_RATE;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
};

const shouldRecordPerfSample = (input: {
  enabled: boolean;
  sampleRate: number;
}): boolean => {
  if (!input.enabled || input.sampleRate <= 0) {
    return false;
  }

  if (input.sampleRate >= 1) {
    return true;
  }

  return Math.random() <= input.sampleRate;
};

const readColo = (request: Request): string => {
  const cf = (request as Request & { cf?: { colo?: string } }).cf;
  const colo = cf?.colo?.trim();
  if (colo) {
    return colo;
  }

  const cfRay = request.headers.get("cf-ray")?.trim() ?? "";
  const parsedFromRay = cfRay.split("-").at(-1)?.trim() ?? "";
  if (parsedFromRay) {
    return parsedFromRay;
  }

  return "unknown";
};

export const loggerMiddleware: MiddlewareHandler<HonoAppType> = async (
  c,
  next,
) => {
  const startedAt = c.get("startedAt") ?? performance.now();
  const requestId = c.get("requestId");

  enqueueLog(c, () => {
    logger.info({
      event: "request.received",
      requestId,
      method: c.req.method,
      route: c.req.path,
      headers: redactHeaders(c.req.raw.headers),
    });
  });

  try {
    await next();
  } finally {
    const latencyMs = performance.now() - startedAt;

    enqueueLog(c, () => {
      logger.info({
        event: "request.completed",
        requestId,
        method: c.req.method,
        route: c.req.path,
        status: c.res.status,
        latencyMs: Number(latencyMs.toFixed(2)),
        cacheStatus: c.get("cacheStatus") ?? null,
      });
    });

    try {
      const perfAnalyticsEnabled = parseBooleanEnv(
        c.env?.PERF_ANALYTICS_ENABLED,
        false,
      );
      const perfAnalyticsSampleRate = normalizeSampleRate(
        parseNumberEnv(
          c.env?.PERF_ANALYTICS_SAMPLE_RATE,
          DEFAULT_PERF_ANALYTICS_SAMPLE_RATE,
        ),
      );
      const perfAnalytics = c.env?.PERF_ANALYTICS;

      if (
        shouldRecordPerfSample({
          enabled: perfAnalyticsEnabled,
          sampleRate: perfAnalyticsSampleRate,
        }) &&
        perfAnalytics
      ) {
        const roundedLatencyMs = Number(latencyMs.toFixed(2));
        const cacheStatus = c.get("cacheStatus") ?? "none";
        const colo = readColo(c.req.raw);

        enqueueLog(c, () => {
          perfAnalytics.writeDataPoint({
            blobs: [
              c.req.method,
              c.req.path,
              String(c.res.status),
              cacheStatus,
              colo,
            ],
            doubles: [roundedLatencyMs],
            indexes: [String(c.res.status)],
          });
        });
      }
    } catch {
      // analytics telemetry must never fail a request
    }
  }
};

export const logError = (
  c: {
    req: { method: string; path: string };
    get: (key: "requestId") => string;
    executionCtx?: ExecutionContext;
  },
  error: unknown,
) => {
  const message = error instanceof Error ? error.message : String(error);

  enqueueLog(c, () => {
    logger.error({
      event: "request.failed",
      requestId: readRequestId(c),
      method: c.req.method,
      route: c.req.path,
      message,
    });
  });
};
