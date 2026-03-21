import type { Instrumentation } from "next";
import { logger } from "@/server/observability/logger";

export function register(): void {
  logger.info({
    event: "instrumentation.register",
  });
}

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: error,
  };
};

export const onRequestError: Instrumentation.onRequestError = (
  error,
  errorRequest,
  errorContext,
) => {
  logger.error({
    event: "request.error",
    route: errorContext.routePath,
    method: errorRequest.method,
    error: serializeError(error),
    request: {
      path: errorRequest.path,
      headers: errorRequest.headers,
      context: errorContext,
    },
  });
};
