import { z } from "@hono/zod-openapi";
import { ZodType } from "zod";
import { ApiErrorResponseSchema } from "./schemas";

/**
 * jsonBody의 핵심 비즈니스 로직을 수행합니다.
 * @param schema 함수 로직에서 사용하는 입력값입니다.
 * @param description 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const jsonBody = <T extends ZodType>(
  schema: T,
  description?: string,
) => ({
  required: true,
  description,
  content: {
    "application/json": {
      schema,
    },
  },
});

/**
 * dataEnvelope의 핵심 비즈니스 로직을 수행합니다.
 * @param schema 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const dataEnvelope = <T extends ZodType>(schema: T) =>
  z.object({
    data: schema,
  });

/**
 * dataResponse의 핵심 비즈니스 로직을 수행합니다.
 * @param schema 함수 로직에서 사용하는 입력값입니다.
 * @param description 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const dataResponse = <T extends ZodType>(
  schema: T,
  description = "요청이 정상 처리되었습니다. 응답 본문의 data 필드에 결과가 포함됩니다.",
) => ({
  description,
  content: {
    "application/json": {
      schema: dataEnvelope(schema),
    },
  },
});

/**
 * createdResponse 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param schema 함수 로직에서 사용하는 입력값입니다.
 * @param description 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createdResponse = <T extends ZodType>(
  schema: T,
  description =
    "리소스가 성공적으로 생성되었습니다. 생성 결과는 응답 본문의 data 필드에 포함됩니다.",
) => ({
  description,
  content: {
    "application/json": {
      schema: dataEnvelope(schema),
    },
  },
});

export const noContentResponse = {
  description:
    "요청이 정상 처리되었으며 반환 본문은 없습니다. 클라이언트에서는 상태 코드(204)만 확인하면 됩니다.",
};

/**
 * errorResponse의 핵심 비즈니스 로직을 수행합니다.
 * @param description 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: ApiErrorResponseSchema,
    },
  },
});

export const errorResponses = {
  400: errorResponse(
    "요청 본문/파라미터 검증에 실패했습니다. 발생 조건: UUID 형식 오류, 필수 필드 누락, 스키마 타입 불일치, 빈 PATCH payload 등. 서버는 검증 단계에서 요청을 중단하고 BAD_REQUEST를 반환하며, 클라이언트는 입력값을 보정한 뒤 재요청해야 합니다.",
  ),
  401: errorResponse(
    "인증 세션이 없거나 만료되었습니다. 서버는 세션 확인 단계에서 요청을 거부하고 UNAUTHORIZED를 반환합니다. 클라이언트는 재로그인 후 동일 요청을 재시도해야 합니다.",
  ),
  403: errorResponse(
    "역할 기반 권한 정책에 의해 요청이 거부되었습니다. 서버는 인증 이후 권한 검사(requirePermission/can)에서 접근 가능 여부를 판단하고 FORBIDDEN을 반환합니다. 클라이언트는 권한 범위 내 기능만 노출해야 합니다.",
  ),
  404: errorResponse(
    "요청한 리소스를 찾을 수 없습니다. 서버는 식별자 조회 결과가 없을 때 NOT_FOUND를 반환합니다. 클라이언트는 최신 목록을 다시 조회해 유효한 ID인지 확인해야 합니다.",
  ),
  409: errorResponse(
    "리소스 제약 조건 충돌이 발생했습니다(예: generation.sortOrder UNIQUE 충돌). 서버는 데이터 무결성 위반을 감지하면 CONFLICT를 반환하며, 클라이언트는 중복 값을 조정한 뒤 재시도해야 합니다.",
  ),
  413: errorResponse(
    "업로드 허용 크기를 초과했습니다. 클라이언트는 파일 크기를 줄이거나 멀티파트 업로드를 사용해야 합니다.",
  ),
  415: errorResponse(
    "지원하지 않는 미디어 타입입니다. 서버가 허용한 content-type 목록을 확인하세요.",
  ),
  422: errorResponse(
    "요청 구조는 유효하지만 의미적으로 처리할 수 없습니다. 업로드 파트/ETag 정보를 점검하세요.",
  ),
  429: errorResponse(
    "요청 빈도가 허용량을 초과했습니다. 잠시 후 다시 시도하세요.",
  ),
  500: errorResponse(
    "서버 내부 예외 또는 외부 의존성(Auth/R2/DB) 오류로 요청 처리에 실패했습니다. 서버는 INTERNAL_ERROR를 반환하며, 클라이언트는 사용자에게 재시도/잠시 후 다시 시도 안내를 제공해야 합니다.",
  ),
} as const;
