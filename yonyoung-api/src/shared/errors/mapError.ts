import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { MissingStorageConfigError } from "../../lib/storage/presign";
import { AppError, isAppError } from "./AppError";
import { ERROR_CODES, type ErrorCode } from "./errorCodes";

type LegacyHttpErrorLike = {
  status: number;
  code: string;
  message: string;
  expose?: boolean;
};

const MALFORMED_JSON_MESSAGES = [
  "Unexpected end of JSON input",
  "Unexpected token",
  "Malformed JSON",
  "JSON",
] as const;

const isLegacyHttpError = (error: unknown): error is LegacyHttpErrorLike => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as Partial<LegacyHttpErrorLike>;
  return (
    typeof candidate.status === "number" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
};

const mapLegacyHttpError = (error: LegacyHttpErrorLike): AppError => {
  const resolvedCode = (Object.values(ERROR_CODES) as string[]).includes(error.code)
    ? (error.code as ErrorCode)
    : ERROR_CODES.INTERNAL_ERROR;

  return new AppError({
    httpStatus: error.status,
    code: resolvedCode,
    message: error.message,
    expose: error.expose,
  });
};

const looksLikeMalformedJson = (error: Error): boolean => {
  return MALFORMED_JSON_MESSAGES.some((needle) => error.message.includes(needle));
};

const looksLikeAuthError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("auth") ||
    message.includes("session") ||
    message.includes("unauthorized") ||
    message.includes("not authenticated") ||
    message.includes("invalid token")
  );
};

const looksLikeD1ConstraintError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("sqlite_constraint") ||
    message.includes("constraint failed") ||
    message.includes("unique constraint")
  );
};

const looksLikeD1Error = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("d1") ||
    message.includes("sqlite") ||
    message.includes("drizzle")
  );
};

const looksLikeR2NotFoundError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("nosuchkey") ||
    message.includes("the specified key does not exist") ||
    message.includes("object not found")
  );
};

const looksLikeR2TooLargeError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("entitytoolarge") ||
    message.includes("metadatatoolarge") ||
    message.includes("too large")
  );
};

const looksLikeR2Error = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("r2") ||
    message.includes("cloudflare object storage") ||
    message.includes("s3")
  );
};

export const mapErrorToAppError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof MissingStorageConfigError) {
    return new AppError({
      httpStatus: 500,
      code: ERROR_CODES.R2_ERROR,
      message: error.message,
      expose: true,
      details: { missingKeys: error.missingKeys },
      cause: error,
    });
  }

  if (error instanceof ZodError) {
    return AppError.validation("요청 데이터가 올바르지 않습니다.", {
      issues: error.issues.map((issue) => ({
        path: issue.path,
        code: issue.code,
        message: issue.message,
      })),
    });
  }

  if (error instanceof HTTPException) {
    return new AppError({
      httpStatus: error.status,
      code: error.status >= 500 ? ERROR_CODES.INTERNAL_ERROR : ERROR_CODES.BAD_REQUEST,
      message: error.message || "요청 처리 중 오류가 발생했습니다.",
      expose: error.status < 500,
      cause: error,
    });
  }

  if (isLegacyHttpError(error)) {
    return mapLegacyHttpError(error);
  }

  if (error instanceof Error) {
    if (looksLikeMalformedJson(error)) {
      return AppError.badRequest("Malformed JSON body", {
        originalMessage: error.message,
      });
    }

    if (looksLikeAuthError(error)) {
      return new AppError({
        httpStatus: 401,
        code: ERROR_CODES.AUTH_ERROR,
        message: "인증 정보가 유효하지 않습니다.",
        cause: error,
      });
    }

    if (looksLikeD1ConstraintError(error)) {
      return new AppError({
        httpStatus: 409,
        code: ERROR_CODES.DB_ERROR,
        message: "데이터 무결성 제약 조건을 위반했습니다.",
        details: { reason: "constraint_violation" },
        cause: error,
      });
    }

    if (looksLikeD1Error(error)) {
      return new AppError({
        httpStatus: 500,
        code: ERROR_CODES.DB_ERROR,
        message: "데이터베이스 처리 중 오류가 발생했습니다.",
        expose: false,
        cause: error,
      });
    }

    if (looksLikeR2NotFoundError(error)) {
      return new AppError({
        httpStatus: 404,
        code: ERROR_CODES.R2_ERROR,
        message: "요청한 스토리지 객체를 찾을 수 없습니다.",
        details: { reason: "object_not_found" },
        cause: error,
      });
    }

    if (looksLikeR2TooLargeError(error)) {
      return new AppError({
        httpStatus: 413,
        code: ERROR_CODES.R2_ERROR,
        message: "스토리지 처리 제한을 초과했습니다.",
        details: { reason: "payload_too_large" },
        cause: error,
      });
    }

    if (looksLikeR2Error(error)) {
      return new AppError({
        httpStatus: 500,
        code: ERROR_CODES.R2_ERROR,
        message: "스토리지 처리 중 오류가 발생했습니다.",
        expose: false,
        cause: error,
      });
    }

    return AppError.internal("서버 내부 오류가 발생했습니다.", undefined, error);
  }

  return AppError.internal("서버 내부 오류가 발생했습니다.", undefined, error);
};
