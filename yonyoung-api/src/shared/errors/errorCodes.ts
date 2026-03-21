import type { ApiErrorCode } from "../../shared/api-contracts";

export const ERROR_CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  DB_ERROR: "DB_ERROR",
  R2_ERROR: "R2_ERROR",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_MEDIA_TYPE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const resolveApiErrorCode = (
  code: ErrorCode,
  httpStatus: number,
): ApiErrorCode => {
  switch (code) {
    case ERROR_CODES.BAD_REQUEST:
    case ERROR_CODES.VALIDATION_ERROR:
    case ERROR_CODES.PAYLOAD_TOO_LARGE:
    case ERROR_CODES.UNSUPPORTED_MEDIA_TYPE:
      return "BAD_REQUEST";
    case ERROR_CODES.UNAUTHORIZED:
    case ERROR_CODES.AUTH_ERROR:
      return "UNAUTHORIZED";
    case ERROR_CODES.FORBIDDEN:
      return "FORBIDDEN";
    case ERROR_CODES.NOT_FOUND:
      return "NOT_FOUND";
    case ERROR_CODES.CONFLICT:
      return "CONFLICT";
    case ERROR_CODES.DB_ERROR:
    case ERROR_CODES.R2_ERROR:
      if (httpStatus === 409) {
        return "CONFLICT";
      }
      if (httpStatus === 404) {
        return "NOT_FOUND";
      }
      return "INTERNAL_ERROR";
    default:
      return "INTERNAL_ERROR";
  }
};
