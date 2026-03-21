import type { Context } from "hono";
import type { ApiErrorCode } from "../../shared/api-contracts";
import { AppError } from "./AppError";
import { resolveApiErrorCode, type ErrorCode } from "./errorCodes";

const DEFAULT_INTERNAL_MESSAGE = "서버 내부 오류가 발생했습니다.";

type ErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
};

export type ProblemDocument = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  code: string;
  details?: unknown;
};

const readRequestId = (c: Context): string => {
  const requestId = (
    c as Context & {
      get: (key: "requestId") => string | undefined;
    }
  ).get?.("requestId");

  return requestId ?? "unknown-request-id";
};

const toProblemDocument = (
  c: Context,
  error: AppError,
  requestId: string,
): ProblemDocument => {
  const status = Number.isFinite(error.httpStatus) ? error.httpStatus : 500;
  const detail = error.expose ? error.message : DEFAULT_INTERNAL_MESSAGE;

  return {
    type: `https://api.yonyoung.moveto.kr/problems/${error.code.toLowerCase()}`,
    title: error.code,
    status,
    detail,
    instance: c.req.path,
    requestId,
    code: error.code,
    ...(error.expose && error.details !== undefined
      ? { details: error.details }
      : {}),
  };
};

const toLegacyEnvelope = (
  requestId: string,
  problem: ProblemDocument,
): ErrorEnvelope => {
  const apiCode = resolveApiErrorCode(problem.code as ErrorCode, problem.status);
  return {
    error: {
      code: apiCode,
      message: problem.detail,
      requestId,
    },
  };
};

export const toErrorResponse = (c: Context, error: AppError): Response => {
  const requestId = readRequestId(c);
  const problem = toProblemDocument(c, error, requestId);
  const envelope = toLegacyEnvelope(requestId, problem);

  return c.json(envelope, problem.status as never);
};

export const toErrorEnvelope = (
  c: Context,
  error: AppError,
): ErrorEnvelope => {
  const requestId = readRequestId(c);
  const problem = toProblemDocument(c, error, requestId);
  return toLegacyEnvelope(requestId, problem);
};
