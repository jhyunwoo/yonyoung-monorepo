import type { MiddlewareHandler } from "hono";
import type HonoAppType from "../../types/honoAppType";
import { AppError } from "../../shared/errors/AppError";

const DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024;
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

const readContentLength = (request: Request): number | null => {
  const header = request.headers.get("content-length");
  if (!header) {
    return null;
  }

  const parsed = Number(header);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const createMaxBodySizeMiddleware = (
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): MiddlewareHandler<HonoAppType> => {
  return async (c, next) => {
    if (!BODY_METHODS.has(c.req.method.toUpperCase())) {
      await next();
      return;
    }

    const contentLength = readContentLength(c.req.raw);
    if (contentLength !== null && contentLength > maxBytes) {
      throw AppError.payloadTooLarge(
        `요청 본문이 허용된 최대 크기(${maxBytes} bytes)를 초과했습니다.`,
      );
    }

    await next();
  };
};

export const maxBodySizeMiddleware = createMaxBodySizeMiddleware();
