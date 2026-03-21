import { ERROR_CODES, type ErrorCode } from "./errorCodes";

type AppErrorInput = {
  httpStatus: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
  expose?: boolean;
  cause?: unknown;
};

export class AppError extends Error {
  readonly httpStatus: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly expose: boolean;
  override readonly cause?: unknown;

  constructor(input: AppErrorInput) {
    super(input.message);
    this.name = "AppError";
    this.httpStatus = input.httpStatus;
    this.code = input.code;
    this.details = input.details;
    this.expose = input.expose ?? input.httpStatus < 500;
    this.cause = input.cause;
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError({
      httpStatus: 400,
      code: ERROR_CODES.BAD_REQUEST,
      message,
      details,
    });
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError({
      httpStatus: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message,
      details,
    });
  }

  static unauthorized(message = "로그인이 필요합니다.", details?: unknown): AppError {
    return new AppError({
      httpStatus: 401,
      code: ERROR_CODES.UNAUTHORIZED,
      message,
      details,
    });
  }

  static forbidden(message = "권한이 없습니다.", details?: unknown): AppError {
    return new AppError({
      httpStatus: 403,
      code: ERROR_CODES.FORBIDDEN,
      message,
      details,
    });
  }

  static notFound(message = "대상을 찾을 수 없습니다.", details?: unknown): AppError {
    return new AppError({
      httpStatus: 404,
      code: ERROR_CODES.NOT_FOUND,
      message,
      details,
    });
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError({
      httpStatus: 409,
      code: ERROR_CODES.CONFLICT,
      message,
      details,
    });
  }

  static payloadTooLarge(message: string, details?: unknown): AppError {
    return new AppError({
      httpStatus: 413,
      code: ERROR_CODES.PAYLOAD_TOO_LARGE,
      message,
      details,
    });
  }

  static unsupportedMediaType(message: string, details?: unknown): AppError {
    return new AppError({
      httpStatus: 415,
      code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
      message,
      details,
    });
  }

  static internal(
    message = "서버 내부 오류가 발생했습니다.",
    details?: unknown,
    cause?: unknown,
  ): AppError {
    return new AppError({
      httpStatus: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      message,
      details,
      cause,
      expose: false,
    });
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;
