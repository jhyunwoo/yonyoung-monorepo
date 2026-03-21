import { Context } from "hono";
import { ZodType } from "zod";
import { AppError } from "../../shared/errors/AppError";

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

/**
 * createErrorMessage 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param error 에러 상황을 나타내는 객체입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const createErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: Array<{ message?: string }> }).issues;
    if (issues && issues.length > 0) {
      return issues.map(/** issues.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param issue 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (issue) => issue.message ?? "유효성 검사 실패").join(", ");
    }
  }

  return "요청 데이터가 올바르지 않습니다.";
};

/**
 * parseParams 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param schema 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const parseParams = <T>(
  c: Context,
  schema: ZodType<T>,
): ParseResult<T> => {
  const parsed = schema.safeParse(c.req.param());
  if (!parsed.success) {
    return { success: false, message: createErrorMessage(parsed.error) };
  }
  return { success: true, data: parsed.data };
};

/**
 * parseBody 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param schema 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const parseBody = async <T>(
  c: Context,
  schema: ZodType<T>,
  options?: {
    maxBytes?: number;
  },
): Promise<ParseResult<T>> => {
  const maxBytes = options?.maxBytes ?? 5 * 1024 * 1024;
  const contentLengthHeader = c.req.header("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw AppError.payloadTooLarge(
        `요청 본문이 허용된 최대 크기(${maxBytes} bytes)를 초과했습니다.`,
      );
    }
  }

  const encoder = new TextEncoder();
  let rawText: string;
  try {
    rawText = await c.req.text();
  } catch {
    return { success: false, message: "Malformed JSON in request body" };
  }

  if (!rawText || rawText.trim().length === 0) {
    return { success: false, message: "JSON 본문이 필요합니다." };
  }

  const bytes = encoder.encode(rawText).byteLength;
  if (bytes > maxBytes) {
    throw AppError.payloadTooLarge(
      `요청 본문이 허용된 최대 크기(${maxBytes} bytes)를 초과했습니다.`,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return { success: false, message: "Malformed JSON in request body" };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: createErrorMessage(parsed.error) };
  }

  return { success: true, data: parsed.data };
};
