import { z } from "@hono/zod-openapi";
import {
  KOREAN_MOBILE_PHONE_REGEX,
  STUDENT_NUMBER_REGEX,
} from "../../shared/auth/profile";
import { API_ERROR_CODES, DEFAULT_SITE_SETTINGS } from "../../shared/api-contracts";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  UPLOAD_LIMITS,
} from "../storage/presign";

const EXAMPLE_ID = "11111111-1111-4111-8111-111111111111";
const EXAMPLE_PARENT_ID = "22222222-2222-4222-8222-222222222222";
const EXAMPLE_IMAGE_ID = "33333333-3333-4333-8333-333333333333";
const EXAMPLE_ITEM_ID = "44444444-4444-4444-8444-444444444444";
const EXAMPLE_GENERATION_ID = "55555555-5555-4555-8555-555555555555";
const EXAMPLE_NOTICE_ID = "66666666-6666-4666-8666-666666666666";
const EXAMPLE_USER_ID = "OrYuGkpIFldOIkcrxLrwgzEegsLSJbrh";
const EXAMPLE_AUDIT_ID = "77777777-7777-4777-8777-777777777777";
const EXAMPLE_MARKET_ITEM_ID = "88888888-8888-4888-8888-888888888888";
const EXAMPLE_MARKET_COMMENT_ID = "99999999-9999-4999-8999-999999999999";
const EXAMPLE_TIMESTAMP_MS = 1735689600000;
const EXAMPLE_TIMESTAMP_MS_END = 1738368000000;

/**
 * timestampField의 핵심 비즈니스 로직을 수행합니다.
 * @param description 함수 로직에서 사용하는 입력값입니다.
 * @param example 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const timestampField = (description: string, example = EXAMPLE_TIMESTAMP_MS) =>
  z
    .number()
    .int()
    .openapi({
      description: `${description} (Unix timestamp(ms), 클라이언트에서 연-월-일로 포맷 변환 권장)`,
      example,
    });

/**
 * urlField의 핵심 비즈니스 로직을 수행합니다.
 * @param description 함수 로직에서 사용하는 입력값입니다.
 * @param example 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const urlField = (description: string, example: string) =>
  z.string().url().openapi({
    description,
    example,
  });

const studentNumberField = (description: string, example: string) =>
  z
    .string()
    .regex(STUDENT_NUMBER_REGEX, "학번은 숫자 10자리여야 합니다.")
    .openapi({
      description,
      example,
    });

const phoneNumberField = (description: string, example: string) =>
  z
    .string()
    .trim()
    .min(1, "전화번호는 비워둘 수 없습니다.")
    .openapi({
      description,
      example,
    });

const ApiErrorCodeSchema = z
  .enum(API_ERROR_CODES)
  .openapi("ApiErrorCode");

const ApiErrorSchema = z
  .object({
    code: ApiErrorCodeSchema.openapi({
      description: "서버가 분류한 에러 코드",
      example: "BAD_REQUEST",
    }),
    message: z.string().openapi({
      description: "클라이언트 디버깅을 위한 에러 메시지",
      example: "요청 본문 또는 파라미터가 올바르지 않습니다.",
    }),
    requestId: z.string().openapi({
      description: "서버 로그 상관관계를 위한 요청 ID",
      example: "8f3aa50e-f842-4ff4-9f02-08d0823d7cb1",
    }),
  })
  .openapi("ApiError");

export const ApiErrorResponseSchema = z
  .object({
    error: ApiErrorSchema.openapi({
      description: "표준 에러 envelope",
    }),
  })
  .openapi("ApiErrorResponse");

export const ApiIdParamSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "조회/수정/삭제 대상 리소스 UUID",
      example: EXAMPLE_ID,
    }),
  })
  .openapi("ApiIdParam");

export const ApiUserIdParamSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "사용자 식별자는 영문/숫자/하이픈/언더스코어만 사용할 수 있습니다.",
      )
      .openapi({
        description: "사용자 식별자 (better-auth user.id)",
        example: EXAMPLE_USER_ID,
      }),
  })
  .openapi("ApiUserIdParam");

export const ApiImageIdParamSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "상위 리소스 UUID (활동/전시)",
      example: EXAMPLE_PARENT_ID,
    }),
    imageId: z.string().uuid().openapi({
      description: "세부 이미지 리소스 UUID",
      example: EXAMPLE_IMAGE_ID,
    }),
  })
  .openapi("ApiImageIdParam");

export const ApiItemIdParamSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "상위 링크트리 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    itemId: z.string().uuid().openapi({
      description: "하위 링크 아이템 UUID",
      example: EXAMPLE_ITEM_ID,
    }),
  })
  .openapi("ApiItemIdParam");

export const ApiNoticeIdParamSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "상위 리소스 UUID (기수)",
      example: EXAMPLE_GENERATION_ID,
    }),
    noticeId: z.string().uuid().openapi({
      description: "공지 UUID",
      example: EXAMPLE_NOTICE_ID,
    }),
  })
  .openapi("ApiNoticeIdParam");

const ApiAuditResourceTypeSchema = z
  .enum([
    "generation",
    "activity",
    "exhibition",
    "generation_notice",
    "global_notice",
    "market_item",
    "market_comment",
    "linktree",
    "linktree_item",
    "user",
  ])
  .openapi("ApiAuditResourceType");

export const ApiAuditParamSchema = z
  .object({
    resourceType: ApiAuditResourceTypeSchema.openapi({
      description: "감사 로그 조회 대상 리소스 타입",
      example: "activity",
    }),
    resourceId: z.string().min(1, "resourceId를 입력해 주세요.").openapi({
      description: "감사 로그 조회 대상 리소스 ID",
      example: EXAMPLE_PARENT_ID,
    }),
  })
  .superRefine((value, context) => {
    if (value.resourceType === "user") {
      return;
    }

    const uuidResult = z.string().uuid().safeParse(value.resourceId);
    if (!uuidResult.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resourceId"],
        message: "resourceId 형식이 올바르지 않습니다.",
      });
    }
  })
  .openapi("ApiAuditParam");

export const ApiAuditQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
      description: "조회할 최대 로그 수 (기본 20, 최대 100)",
      example: 20,
    }),
  })
  .openapi("ApiAuditQuery");

const ApiAuditActorSchema = z
  .object({
    id: z.string().openapi({
      description: "수정자 식별자 (better-auth user.id)",
      example: EXAMPLE_USER_ID,
    }),
    name: z.string().openapi({
      description: "수정자 이름",
      example: "홍길동",
    }),
    familyName: z.string().nullable().openapi({
      description: "수정자 성",
      example: "홍",
    }),
    givenName: z.string().nullable().openapi({
      description: "수정자 이름(given name)",
      example: "길동",
    }),
    role: z.string().nullable().openapi({
      description: "수정자 역할 문자열",
      example: "manager",
    }),
  })
  .openapi("ApiAuditActor");

export const ApiAuditLogSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "감사 로그 UUID",
      example: EXAMPLE_AUDIT_ID,
    }),
    resourceType: ApiAuditResourceTypeSchema.openapi({
      description: "변경 대상 리소스 타입",
      example: "activity",
    }),
    resourceId: z.string().openapi({
      description: "변경 대상 리소스 ID",
      example: EXAMPLE_PARENT_ID,
    }),
    action: z.enum(["create", "update", "delete"]).openapi({
      description: "수행된 변경 액션",
      example: "update",
    }),
    actor: ApiAuditActorSchema.nullable().openapi({
      description: "수정자 정보",
    }),
    changedFields: z.array(z.string()).openapi({
      description: "변경된 필드 목록",
      example: ["title", "description", "updatedAt"],
    }),
    createdAt: timestampField("변경 시각", EXAMPLE_TIMESTAMP_MS),
  })
  .openapi("ApiAuditLog");

export const ApiGenerationSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    name: z.string().openapi({
      description: "기수 이름",
      example: "10기",
    }),
    sortOrder: z.number().int().openapi({
      description: "기수 정렬 순서(작을수록 먼저 노출)",
      example: 10,
    }),
    startDate: timestampField("기수 시작일시", EXAMPLE_TIMESTAMP_MS),
    endDate: timestampField("기수 종료일시", EXAMPLE_TIMESTAMP_MS_END),
    createdAt: timestampField("생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보 (로그가 없으면 null)",
    }),
  })
  .openapi("ApiGeneration");

export const ApiCreateGenerationSchema = z
  .object({
    name: z.string().trim().min(1, "name은 필수입니다.").openapi({
      description: "생성할 기수 이름",
      example: "12기",
    }),
    sortOrder: z.number().int().nonnegative().openapi({
      description: "기수 정렬 순서(0 이상, UNIQUE)",
      example: 12,
    }),
    startDate: z.number().int().positive().openapi({
      description:
        "기수 시작일시 (Unix timestamp(ms), 클라이언트에서 연-월-일 포맷으로 변환)",
      example: EXAMPLE_TIMESTAMP_MS,
    }),
    endDate: z.number().int().positive().openapi({
      description:
        "기수 종료일시 (Unix timestamp(ms), 클라이언트에서 연-월-일 포맷으로 변환)",
      example: EXAMPLE_TIMESTAMP_MS_END,
    }),
  })
  .openapi("ApiCreateGenerationInput");

export const ApiUpdateGenerationSchema = ApiCreateGenerationSchema.partial().openapi(
  "ApiUpdateGenerationInput",
);

export const ApiActivityImageSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "활동 세부 이미지 UUID",
      example: EXAMPLE_IMAGE_ID,
    }),
    activityId: z.string().uuid().openapi({
      description: "상위 활동 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    imageUrl: urlField(
      "활동 세부 이미지 공개 URL (presigned 업로드 완료 후 저장되는 URL)",
      "https://cdn.yonyoung.example/activities/detail/detail-1.jpg",
    ),
    sortOrder: z.number().int().openapi({
      description: "세부 이미지 노출 순서",
      example: 0,
    }),
    createdAt: timestampField("세부 이미지 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("세부 이미지 수정 시각", EXAMPLE_TIMESTAMP_MS),
  })
  .openapi("ApiActivityImage");

export const ApiActivitySchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "활동 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    title: z.string().openapi({
      description: "활동 제목",
      example: "겨울 정기 워크숍",
    }),
    description: z.string().openapi({
      description: "활동 상세 설명 리치텍스트 HTML 본문",
      example: "<p>동아리 구성원 대상 <strong>촬영/편집</strong> 워크숍을 진행했습니다.</p>",
    }),
    startDate: timestampField("활동 시작 시각", EXAMPLE_TIMESTAMP_MS),
    endDate: timestampField("활동 종료 시각", EXAMPLE_TIMESTAMP_MS_END),
    coverImageUrl: urlField(
      "활동 대표 이미지 공개 URL (presigned 업로드 완료 후 저장)",
      "https://cdn.yonyoung.example/activities/cover/cover-1.jpg",
    ),
    generationId: z.string().uuid().openapi({
      description: "연결된 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    createdAt: timestampField("활동 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("활동 수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보 (로그가 없으면 null)",
    }),
    detailImages: z.array(ApiActivityImageSchema).openapi({
      description: "활동 세부 이미지 목록",
    }),
  })
  .openapi("ApiActivity");

export const ApiCreateActivitySchema = z
  .object({
    title: z.string().min(1).openapi({
      description: "활동 제목",
      example: "봄 정기전 준비 모임",
    }),
    description: z.string().min(1).openapi({
      description: "활동 설명 리치텍스트 HTML 본문",
      example: "<p>정기전 작품 선정 및 역할 분담을 진행했습니다.</p>",
    }),
    startDate: z.number().int().positive().openapi({
      description: "활동 시작 시각 (Unix timestamp(ms))",
      example: EXAMPLE_TIMESTAMP_MS,
    }),
    endDate: z.number().int().positive().openapi({
      description: "활동 종료 시각 (Unix timestamp(ms))",
      example: EXAMPLE_TIMESTAMP_MS_END,
    }),
    coverImageUrl: urlField(
      "활동 대표 이미지 공개 URL",
      "https://cdn.yonyoung.example/activities/cover/new-cover.jpg",
    ),
    generationId: z.string().uuid("generationId 형식이 올바르지 않습니다.").openapi({
      description: "연결할 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "활동 종료 시각은 시작 시각보다 빠를 수 없습니다.",
    path: ["endDate"],
  })
  .openapi("ApiCreateActivityInput");

export const ApiUpdateActivitySchema = z
  .object({
    title: z.string().min(1).optional().openapi({
      description: "활동 제목",
      example: "봄 정기전 준비 모임",
    }),
    description: z.string().min(1).optional().openapi({
      description: "활동 설명 리치텍스트 HTML 본문",
      example: "<p>정기전 작품 선정 및 역할 분담을 진행했습니다.</p>",
    }),
    startDate: z.number().int().positive().optional().openapi({
      description: "활동 시작 시각 (Unix timestamp(ms))",
      example: EXAMPLE_TIMESTAMP_MS,
    }),
    endDate: z.number().int().positive().optional().openapi({
      description: "활동 종료 시각 (Unix timestamp(ms))",
      example: EXAMPLE_TIMESTAMP_MS_END,
    }),
    coverImageUrl: urlField(
      "활동 대표 이미지 공개 URL",
      "https://cdn.yonyoung.example/activities/cover/new-cover.jpg",
    ).optional(),
    generationId: z.string().uuid("generationId 형식이 올바르지 않습니다.").optional().openapi({
      description: "연결할 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
  })
  .strict()
  .refine(
    (value) =>
      value.startDate === undefined ||
      value.endDate === undefined ||
      value.startDate <= value.endDate,
    {
      message: "활동 종료 시각은 시작 시각보다 빠를 수 없습니다.",
      path: ["endDate"],
    },
  )
  .openapi("ApiUpdateActivityInput");

export const ApiListActivitiesQuerySchema = z
  .object({
    generationId: z
      .string()
      .uuid("generationId 형식이 올바르지 않습니다.")
      .optional()
      .openapi({
        description: "특정 기수 활동 목록을 조회할 때 사용하는 기수 UUID 필터",
        example: EXAMPLE_GENERATION_ID,
      }),
  })
  .openapi("ApiListActivitiesQuery");

export const ApiCreateActivityImageSchema = z
  .object({
    imageUrl: urlField(
      "추가할 활동 세부 이미지 URL",
      "https://cdn.yonyoung.example/activities/detail/new-detail.jpg",
    ),
    sortOrder: z.number().int().nonnegative().default(0).openapi({
      description: "세부 이미지 표시 순서(기본값 0)",
      example: 0,
    }),
  })
  .openapi("ApiCreateActivityImageInput");

export const ApiUpdateActivityImageSchema = z
  .object({
    imageUrl: urlField(
      "수정할 활동 세부 이미지 URL",
      "https://cdn.yonyoung.example/activities/detail/updated-detail.jpg",
    ).optional(),
    sortOrder: z.number().int().nonnegative().optional().openapi({
      description: "수정할 세부 이미지 표시 순서",
      example: 1,
    }),
  })
  .strict()
  .openapi("ApiUpdateActivityImageInput");

export const ApiCreateActivityImageBatchSchema = z
  .array(ApiCreateActivityImageSchema)
  .min(1, "세부 이미지를 하나 이상 전달해야 합니다.")
  .openapi("ApiCreateActivityImageBatchInput");

const ApiUpdateActivityImageBatchItemSchema = z
  .object({
    imageId: z.string().uuid().openapi({
      description: "수정할 세부 이미지 UUID",
      example: EXAMPLE_IMAGE_ID,
    }),
    imageUrl: urlField(
      "수정할 활동 세부 이미지 URL",
      "https://cdn.yonyoung.example/activities/detail/updated-detail.jpg",
    ).optional(),
    sortOrder: z.number().int().nonnegative().optional().openapi({
      description: "수정할 세부 이미지 표시 순서",
      example: 1,
    }),
  })
  .strict()
  .refine(
    (value) => value.imageUrl !== undefined || value.sortOrder !== undefined,
    {
      message: "수정할 필드를 하나 이상 전달해야 합니다.",
    },
  )
  .openapi("ApiUpdateActivityImageBatchItemInput");

export const ApiUpdateActivityImageBatchSchema = z
  .array(ApiUpdateActivityImageBatchItemSchema)
  .min(1, "세부 이미지를 하나 이상 전달해야 합니다.")
  .refine(
    (items) => new Set(items.map((item) => item.imageId)).size === items.length,
    {
      message: "중복된 imageId를 전달할 수 없습니다.",
    },
  )
  .openapi("ApiUpdateActivityImageBatchInput");

export const ApiExhibitionImageSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "전시 세부 이미지 UUID",
      example: EXAMPLE_IMAGE_ID,
    }),
    exhibitionId: z.string().uuid().openapi({
      description: "상위 전시 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    imageUrl: urlField(
      "전시 세부 이미지 공개 URL",
      "https://cdn.yonyoung.example/exhibitions/detail/detail-1.jpg",
    ),
    sortOrder: z.number().int().openapi({
      description: "전시 세부 이미지 노출 순서",
      example: 0,
    }),
    createdAt: timestampField("세부 이미지 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("세부 이미지 수정 시각", EXAMPLE_TIMESTAMP_MS),
  })
  .openapi("ApiExhibitionImage");

export const ApiExhibitionSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "전시 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    title: z.string().openapi({
      description: "전시 제목",
      example: "2026 정기 사진전",
    }),
    startDate: timestampField("전시 시작 시각", EXAMPLE_TIMESTAMP_MS),
    endDate: timestampField("전시 종료 시각", EXAMPLE_TIMESTAMP_MS_END),
    generationId: z.string().uuid().openapi({
      description: "연결된 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    place: z.string().openapi({
      description: "전시 장소",
      example: "서울시 성동구 아트홀 2관",
    }),
    coverImageUrl: urlField(
      "전시 대표 이미지 공개 URL",
      "https://cdn.yonyoung.example/exhibitions/cover/cover-1.jpg",
    ),
    description: z.string().openapi({
      description: "전시 소개 리치텍스트 HTML 본문",
      example: "<p>도시의 밤을 주제로 한 동아리 정기전입니다.</p>",
    }),
    createdAt: timestampField("전시 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("전시 수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보 (로그가 없으면 null)",
    }),
    detailImages: z.array(ApiExhibitionImageSchema).openapi({
      description: "전시 세부 이미지 목록",
    }),
  })
  .openapi("ApiExhibition");

export const ApiCreateExhibitionSchema = z
  .object({
    title: z.string().min(1).openapi({
      description: "전시 제목",
      example: "2026 정기 사진전",
    }),
    startDate: z.number().int().positive().openapi({
      description: "전시 시작 시각 (Unix timestamp(ms))",
      example: EXAMPLE_TIMESTAMP_MS,
    }),
    endDate: z.number().int().positive().openapi({
      description: "전시 종료 시각 (Unix timestamp(ms))",
      example: EXAMPLE_TIMESTAMP_MS_END,
    }),
    generationId: z.string().uuid("generationId 형식이 올바르지 않습니다.").openapi({
      description: "연결할 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    place: z.string().min(1).openapi({
      description: "전시 장소",
      example: "서울시 성동구 아트홀 2관",
    }),
    coverImageUrl: urlField(
      "전시 대표 이미지 공개 URL",
      "https://cdn.yonyoung.example/exhibitions/cover/new-cover.jpg",
    ),
    description: z.string().min(1).openapi({
      description: "전시 설명 리치텍스트 HTML 본문",
      example: "<p>도시의 밤 풍경을 기록한 작품들을 전시합니다.</p>",
    }),
  })
  .openapi("ApiCreateExhibitionInput");

export const ApiUpdateExhibitionSchema = ApiCreateExhibitionSchema.partial().openapi(
  "ApiUpdateExhibitionInput",
);

export const ApiListExhibitionsQuerySchema = z
  .object({
    generationId: z
      .string()
      .uuid("generationId 형식이 올바르지 않습니다.")
      .optional()
      .openapi({
        description: "특정 기수 전시 목록을 조회할 때 사용하는 기수 UUID 필터",
        example: EXAMPLE_GENERATION_ID,
      }),
  })
  .openapi("ApiListExhibitionsQuery");

export const ApiCreateExhibitionImageSchema = z
  .object({
    imageUrl: urlField(
      "추가할 전시 세부 이미지 URL",
      "https://cdn.yonyoung.example/exhibitions/detail/new-detail.jpg",
    ),
    sortOrder: z.number().int().nonnegative().default(0).openapi({
      description: "세부 이미지 노출 순서(기본값 0)",
      example: 0,
    }),
  })
  .openapi("ApiCreateExhibitionImageInput");

export const ApiUpdateExhibitionImageSchema = z
  .object({
    imageUrl: urlField(
      "수정할 전시 세부 이미지 URL",
      "https://cdn.yonyoung.example/exhibitions/detail/updated-detail.jpg",
    ).optional(),
    sortOrder: z.number().int().nonnegative().optional().openapi({
      description: "수정할 세부 이미지 노출 순서",
      example: 1,
    }),
  })
  .strict()
  .openapi("ApiUpdateExhibitionImageInput");

export const ApiCreateExhibitionImageBatchSchema = z
  .array(ApiCreateExhibitionImageSchema)
  .min(1, "세부 이미지를 하나 이상 전달해야 합니다.")
  .openapi("ApiCreateExhibitionImageBatchInput");

const ApiUpdateExhibitionImageBatchItemSchema = z
  .object({
    imageId: z.string().uuid().openapi({
      description: "수정할 세부 이미지 UUID",
      example: EXAMPLE_IMAGE_ID,
    }),
    imageUrl: urlField(
      "수정할 전시 세부 이미지 URL",
      "https://cdn.yonyoung.example/exhibitions/detail/updated-detail.jpg",
    ).optional(),
    sortOrder: z.number().int().nonnegative().optional().openapi({
      description: "수정할 세부 이미지 노출 순서",
      example: 1,
    }),
  })
  .strict()
  .refine(
    (value) => value.imageUrl !== undefined || value.sortOrder !== undefined,
    {
      message: "수정할 필드를 하나 이상 전달해야 합니다.",
    },
  )
  .openapi("ApiUpdateExhibitionImageBatchItemInput");

export const ApiUpdateExhibitionImageBatchSchema = z
  .array(ApiUpdateExhibitionImageBatchItemSchema)
  .min(1, "세부 이미지를 하나 이상 전달해야 합니다.")
  .refine(
    (items) => new Set(items.map((item) => item.imageId)).size === items.length,
    {
      message: "중복된 imageId를 전달할 수 없습니다.",
    },
  )
  .openapi("ApiUpdateExhibitionImageBatchInput");

const ApiNoticeImageUrlsSchema = z
  .array(
    urlField(
      "공지 첨부 이미지 URL",
      "https://cdn.yonyoung.example/notices/image/notice-image.jpg",
    ),
  )
  .max(10, "공지 첨부 이미지는 최대 10장까지 등록할 수 있습니다.")
  .refine(
    (items) => new Set(items).size === items.length,
    {
      message: "중복된 imageUrls를 전달할 수 없습니다.",
    },
  );

const ApiShowcaseImageUrlsSchema = z
  .array(
    urlField(
      "대표 작품 사진 URL",
      "https://cdn.yonyoung.example/users/profile/showcase-1.jpg",
    ),
  )
  .max(10, "대표 작품 사진은 최대 10장까지 등록할 수 있습니다.")
  .refine(
    (items) => new Set(items).size === items.length,
    {
      message: "중복된 showcaseImageUrls를 전달할 수 없습니다.",
    },
  );

const ApiNoticeAuthorSchema = z
  .object({
    id: z.string().openapi({
      description: "작성자 식별자 (better-auth user.id)",
      example: EXAMPLE_USER_ID,
    }),
    name: z.string().openapi({
      description: "작성자 이름",
      example: "홍길동",
    }),
    familyName: z.string().nullable().openapi({
      description: "작성자 성",
      example: "홍",
    }),
    givenName: z.string().nullable().openapi({
      description: "작성자 이름(given name)",
      example: "길동",
    }),
    image: z.string().url().nullable().openapi({
      description: "작성자 프로필 이미지 URL (없으면 null)",
      example: "https://cdn.yonyoung.example/users/profile/member.png",
    }),
    role: z.string().nullable().openapi({
      description: "작성자 역할 문자열",
      example: "manager",
    }),
  })
  .openapi("ApiNoticeAuthor");

export const ApiGenerationNoticeSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "기수 공지 UUID",
      example: EXAMPLE_NOTICE_ID,
    }),
    generationId: z.string().uuid().openapi({
      description: "소속 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    title: z.string().openapi({
      description: "공지 제목",
      example: "60기 정기 회의 안내",
    }),
    content: z.string().openapi({
      description: "공지 리치텍스트 HTML 본문",
      example: "<p>이번 주 토요일 14시에 회의를 진행합니다.</p>",
    }),
    imageUrls: ApiNoticeImageUrlsSchema.openapi({
      description: "공지 첨부 이미지 URL 목록",
      example: [
        "https://cdn.yonyoung.example/notices/image/notice-1.jpg",
        "https://cdn.yonyoung.example/notices/image/notice-2.jpg",
      ],
    }),
    author: ApiNoticeAuthorSchema.openapi({
      description: "공지 작성자 정보",
    }),
    createdAt: timestampField("공지 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("공지 수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보 (로그가 없으면 null)",
    }),
  })
  .openapi("ApiGenerationNotice");

export const ApiCreateGenerationNoticeSchema = z
  .object({
    title: z.string().trim().min(1, "공지 제목은 비워둘 수 없습니다.").openapi({
      description: "공지 제목",
      example: "60기 정기 회의 안내",
    }),
    content: z.string().trim().min(1, "공지 본문은 비워둘 수 없습니다.").openapi({
      description: "공지 리치텍스트 HTML 본문",
      example: "<p>이번 주 토요일 14시에 회의를 진행합니다.</p>",
    }),
    imageUrls: ApiNoticeImageUrlsSchema.optional().default([]).openapi({
      description: "공지 첨부 이미지 URL 목록 (미전달 시 빈 배열)",
      example: ["https://cdn.yonyoung.example/notices/image/notice-1.jpg"],
    }),
  })
  .openapi("ApiCreateGenerationNoticeInput");

export const ApiUpdateGenerationNoticeSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "공지 제목은 비워둘 수 없습니다.")
      .optional()
      .openapi({
        description: "공지 제목",
        example: "60기 정기 회의 안내",
      }),
    content: z
      .string()
      .trim()
      .min(1, "공지 본문은 비워둘 수 없습니다.")
      .optional()
      .openapi({
        description: "공지 리치텍스트 HTML 본문",
        example: "<p>회의 장소가 소회의실로 변경되었습니다.</p>",
      }),
    imageUrls: ApiNoticeImageUrlsSchema.optional().openapi({
      description: "공지 첨부 이미지 URL 목록",
      example: ["https://cdn.yonyoung.example/notices/image/updated-notice.jpg"],
    }),
  })
  .strict()
  .openapi("ApiUpdateGenerationNoticeInput");

export const ApiGlobalNoticeSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "전체 공지 UUID",
      example: EXAMPLE_NOTICE_ID,
    }),
    title: z.string().openapi({
      description: "공지 제목",
      example: "연영회 정기 총회 안내",
    }),
    content: z.string().openapi({
      description: "공지 리치텍스트 HTML 본문",
      example: "<p>다음 주 금요일 19시 정기 총회가 진행됩니다.</p>",
    }),
    imageUrls: ApiNoticeImageUrlsSchema.openapi({
      description: "공지 첨부 이미지 URL 목록",
      example: ["https://cdn.yonyoung.example/notices/image/global-notice.jpg"],
    }),
    author: ApiNoticeAuthorSchema.openapi({
      description: "공지 작성자 정보",
    }),
    createdAt: timestampField("공지 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("공지 수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보 (로그가 없으면 null)",
    }),
  })
  .openapi("ApiGlobalNotice");

export const ApiCreateGlobalNoticeSchema = z
  .object({
    title: z.string().trim().min(1, "공지 제목은 비워둘 수 없습니다.").openapi({
      description: "공지 제목",
      example: "연영회 정기 총회 안내",
    }),
    content: z.string().trim().min(1, "공지 본문은 비워둘 수 없습니다.").openapi({
      description: "공지 리치텍스트 HTML 본문",
      example: "<p>다음 주 금요일 19시 정기 총회가 진행됩니다.</p>",
    }),
    imageUrls: ApiNoticeImageUrlsSchema.optional().default([]).openapi({
      description: "공지 첨부 이미지 URL 목록 (미전달 시 빈 배열)",
      example: ["https://cdn.yonyoung.example/notices/image/global-notice.jpg"],
    }),
  })
  .openapi("ApiCreateGlobalNoticeInput");

export const ApiUpdateGlobalNoticeSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "공지 제목은 비워둘 수 없습니다.")
      .optional()
      .openapi({
        description: "공지 제목",
        example: "연영회 정기 총회 안내",
      }),
    content: z
      .string()
      .trim()
      .min(1, "공지 본문은 비워둘 수 없습니다.")
      .optional()
      .openapi({
        description: "공지 리치텍스트 HTML 본문",
        example: "<p>일정이 변경되어 토요일 19시로 진행됩니다.</p>",
      }),
    imageUrls: ApiNoticeImageUrlsSchema.optional().openapi({
      description: "공지 첨부 이미지 URL 목록",
      example: ["https://cdn.yonyoung.example/notices/image/global-notice-updated.jpg"],
    }),
  })
  .strict()
  .openapi("ApiUpdateGlobalNoticeInput");

const ApiMarketItemStatusSchema = z
  .enum(["selling", "reserved", "sold"])
  .openapi("ApiMarketItemStatus");

const ApiMarketConditionGradeSchema = z
  .enum(["A", "B", "C", "D"])
  .openapi("ApiMarketConditionGrade");

const ApiMarketImageUrlsSchema = z
  .array(z.string().url("이미지 URL 형식이 올바르지 않습니다."))
  .min(1, "상품 이미지는 최소 1장 필요합니다.")
  .max(10, "상품 이미지는 최대 10장까지 등록할 수 있습니다.")
  .refine(
    (urls) => new Set(urls).size === urls.length,
    "중복된 이미지 URL은 허용되지 않습니다.",
  )
  .openapi("ApiMarketImageUrls");

const ApiMarketSellerSchema = z
  .object({
    id: z.string().min(1).openapi({
      description: "판매자 식별자",
      example: EXAMPLE_USER_ID,
    }),
    name: z.string().openapi({
      description: "판매자 이름",
      example: "홍길동",
    }),
    familyName: z.string().nullable().openapi({
      description: "판매자 성",
      example: "홍",
    }),
    givenName: z.string().nullable().openapi({
      description: "판매자 이름(given name)",
      example: "길동",
    }),
    image: z.string().url().nullable().openapi({
      description: "판매자 프로필 이미지 URL",
      example: "https://cdn.yonyoung.example/users/profile/member.png",
    }),
    role: z.string().nullable().openapi({
      description: "판매자 역할 문자열",
      example: "regular_member",
    }),
  })
  .openapi("ApiMarketSeller");

export const ApiMarketItemSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "장터 게시물 UUID",
      example: EXAMPLE_MARKET_ITEM_ID,
    }),
    sellerId: z.string().min(1).openapi({
      description: "판매자 식별자",
      example: EXAMPLE_USER_ID,
    }),
    name: z.string().openapi({
      description: "판매 물건 이름",
      example: "Sony FE 24-70mm F2.8 GM II",
    }),
    imageUrls: ApiMarketImageUrlsSchema.openapi({
      description: "판매 물건 이미지 URL 목록 (1~10장)",
    }),
    manufacturer: z.string().nullable().openapi({
      description: "제조사",
      example: "Sony",
    }),
    productCode: z.string().nullable().openapi({
      description: "제품 코드",
      example: "SEL2470GM2",
    }),
    conditionGrade: ApiMarketConditionGradeSchema.nullable().openapi({
      description: "제품 상태 등급",
      example: "A",
    }),
    description: z.string().nullable().openapi({
      description: "판매 설명 리치텍스트 HTML",
      example: "<p>실사용 3개월, 박스/보증서 포함</p>",
    }),
    price: z.number().int().nonnegative().openapi({
      description: "판매 가격(원 단위 정수)",
      example: 2200000,
    }),
    status: ApiMarketItemStatusSchema.openapi({
      description: "판매 상태",
      example: "selling",
    }),
    seller: ApiMarketSellerSchema.openapi({
      description: "판매자 프로필",
    }),
    createdAt: timestampField("게시물 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("게시물 수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보",
    }),
  })
  .openapi("ApiMarketItem");

const nullableTrimmedStringField = (description: string, example: string) =>
  z
    .string()
    .trim()
    .min(1, `${description}은 비워둘 수 없습니다.`)
    .nullable()
    .openapi({
      description,
      example,
    });

export const ApiCreateMarketItemSchema = z
  .object({
    name: z.string().trim().min(1, "판매 물건 이름은 비워둘 수 없습니다.").openapi({
      description: "판매 물건 이름",
      example: "Sony FE 24-70mm F2.8 GM II",
    }),
    imageUrls: ApiMarketImageUrlsSchema.openapi({
      description: "판매 물건 이미지 URL 목록 (필수, 1~10장)",
    }),
    manufacturer: nullableTrimmedStringField("제조사", "Sony").optional(),
    productCode: nullableTrimmedStringField("제품 코드", "SEL2470GM2").optional(),
    conditionGrade: ApiMarketConditionGradeSchema.nullable().optional().openapi({
      description: "제품 상태 등급",
      example: "A",
    }),
    description: nullableTrimmedStringField(
      "판매 설명 리치텍스트 HTML",
      "<p>실사용 3개월, 박스/보증서 포함</p>",
    ).optional(),
    price: z.number().int().nonnegative("가격은 0 이상이어야 합니다.").openapi({
      description: "판매 가격(원 단위 정수)",
      example: 2200000,
    }),
  })
  .openapi("ApiCreateMarketItemInput");

export const ApiUpdateMarketItemSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "판매 물건 이름은 비워둘 수 없습니다.")
      .optional()
      .openapi({
        description: "판매 물건 이름",
        example: "Sony FE 24-70mm F2.8 GM II",
      }),
    imageUrls: ApiMarketImageUrlsSchema.optional().openapi({
      description: "판매 물건 이미지 URL 목록 (1~10장)",
    }),
    manufacturer: nullableTrimmedStringField("제조사", "Sony").optional(),
    productCode: nullableTrimmedStringField("제품 코드", "SEL2470GM2").optional(),
    conditionGrade: ApiMarketConditionGradeSchema.nullable().optional().openapi({
      description: "제품 상태 등급",
      example: "B",
    }),
    description: nullableTrimmedStringField(
      "판매 설명 리치텍스트 HTML",
      "<p>생활기스 있음</p>",
    ).optional(),
    price: z.number().int().nonnegative("가격은 0 이상이어야 합니다.").optional().openapi({
      description: "판매 가격(원 단위 정수)",
      example: 1990000,
    }),
  })
  .strict()
  .openapi("ApiUpdateMarketItemInput");

export const ApiUpdateMarketItemStatusSchema = z
  .object({
    status: ApiMarketItemStatusSchema.openapi({
      description: "변경할 판매 상태",
      example: "reserved",
    }),
  })
  .strict()
  .openapi("ApiUpdateMarketItemStatusInput");

export const ApiListMarketItemsQuerySchema = z
  .object({
    status: ApiMarketItemStatusSchema.optional().openapi({
      description: "판매 상태 필터",
      example: "selling",
    }),
    sellerId: z.string().min(1).optional().openapi({
      description: "판매자 식별자 필터",
      example: EXAMPLE_USER_ID,
    }),
    page: z.coerce.number().int().min(1).optional().openapi({
      description: "페이지 번호(1부터 시작)",
      example: 1,
    }),
    pageSize: z.coerce.number().int().min(1).max(100).optional().openapi({
      description: "페이지 크기(기본 20, 최대 100)",
      example: 20,
    }),
  })
  .openapi("ApiListMarketItemsQuery");

export const ApiMarketCommentSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "댓글 UUID",
      example: EXAMPLE_MARKET_COMMENT_ID,
    }),
    itemId: z.string().uuid().openapi({
      description: "상위 장터 게시물 UUID",
      example: EXAMPLE_MARKET_ITEM_ID,
    }),
    author: ApiMarketSellerSchema.openapi({
      description: "댓글 작성자 정보",
    }),
    content: z.string().openapi({
      description: "댓글 본문(plain text)",
      example: "거래 가능할까요?",
    }),
    createdAt: timestampField("댓글 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("댓글 수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보",
    }),
  })
  .openapi("ApiMarketComment");

export const ApiCreateMarketCommentSchema = z
  .object({
    content: z.string().trim().min(1, "댓글 본문은 비워둘 수 없습니다.").openapi({
      description: "댓글 본문",
      example: "거래 가능할까요?",
    }),
  })
  .openapi("ApiCreateMarketCommentInput");

export const ApiUpdateMarketCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "댓글 본문은 비워둘 수 없습니다.")
      .optional()
      .openapi({
        description: "댓글 본문",
        example: "채팅 확인 부탁드립니다.",
      }),
  })
  .strict()
  .openapi("ApiUpdateMarketCommentInput");

export const ApiMarketItemIdParamSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "장터 게시물 UUID",
      example: EXAMPLE_MARKET_ITEM_ID,
    }),
  })
  .openapi("ApiMarketItemIdParam");

export const ApiMarketCommentIdParamSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "장터 댓글 UUID",
      example: EXAMPLE_MARKET_COMMENT_ID,
    }),
  })
  .openapi("ApiMarketCommentIdParam");

export const ApiMarketPushSubscriptionSchema = z
  .object({
    endpoint: z.string().url().openapi({
      description: "Push subscription endpoint URL",
      example: "https://fcm.googleapis.com/fcm/send/abc123",
    }),
    p256dh: z.string().min(1).openapi({
      description: "Push subscription p256dh key",
      example: "BOr6-fake-key",
    }),
    auth: z.string().min(1).openapi({
      description: "Push subscription auth secret",
      example: "fake-auth-secret",
    }),
  })
  .strict()
  .openapi("ApiMarketPushSubscriptionInput");

export const ApiLinktreeItemSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "링크 아이템 UUID",
      example: EXAMPLE_ITEM_ID,
    }),
    linktreeId: z.string().uuid().openapi({
      description: "상위 링크트리 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    name: z.string().openapi({
      description: "링크 표시 이름",
      example: "인스타그램",
    }),
    link: urlField("실제 이동 URL", "https://instagram.com/yonyoung"),
    createdAt: timestampField("링크 아이템 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("링크 아이템 수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보 (로그가 없으면 null)",
    }),
  })
  .openapi("ApiLinktreeItem");

export const ApiLinktreeSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "링크트리 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    name: z.string().openapi({
      description: "링크트리 이름",
      example: "공식 채널",
    }),
    createdAt: timestampField("링크트리 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("링크트리 수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보 (로그가 없으면 null)",
    }),
    items: z.array(ApiLinktreeItemSchema).openapi({
      description: "하위 링크 아이템 목록",
    }),
  })
  .openapi("ApiLinktree");

export const ApiCreateLinktreeSchema = z
  .object({
    name: z.string().min(1).openapi({
      description: "생성할 링크트리 이름",
      example: "공식 채널",
    }),
  })
  .openapi("ApiCreateLinktreeInput");

export const ApiUpdateLinktreeSchema = ApiCreateLinktreeSchema.partial().openapi(
  "ApiUpdateLinktreeInput",
);

export const ApiCreateLinktreeItemSchema = z
  .object({
    name: z.string().min(1).openapi({
      description: "링크 아이템 이름",
      example: "YouTube",
    }),
    link: urlField(
      "링크 아이템 URL",
      "https://youtube.com/@yonyoung",
    ),
  })
  .openapi("ApiCreateLinktreeItemInput");

export const ApiUpdateLinktreeItemSchema = ApiCreateLinktreeItemSchema.partial().openapi(
  "ApiUpdateLinktreeItemInput",
);

const ApiInstagramIdFieldSchema = z
  .string()
  .trim()
  .min(1, "인스타그램 아이디는 비워둘 수 없습니다.")
  .regex(
    /^@?[A-Za-z0-9._]+$/,
    "인스타그램 아이디는 영문, 숫자, 점(.), 밑줄(_)만 사용할 수 있습니다.",
  );

export const ApiSiteSettingsSchema = z
  .object({
    footerOpenChatUrl: urlField(
      "footer 오픈 카톡방 링크",
      DEFAULT_SITE_SETTINGS.footerOpenChatUrl,
    ),
    footerInstagramId: ApiInstagramIdFieldSchema.openapi({
      description: "footer 인스타그램 아이디 (@ 제외 저장 권장)",
      example: DEFAULT_SITE_SETTINGS.footerInstagramId,
    }),
    footerEmail: z
      .string()
      .trim()
      .email("이메일 형식이 올바르지 않습니다.")
      .openapi({
        description: "footer 이메일 주소",
        example: DEFAULT_SITE_SETTINGS.footerEmail,
      }),
    footerPhone: phoneNumberField(
      "footer 전화번호",
      DEFAULT_SITE_SETTINGS.footerPhone,
    ),
    footerAddress: z
      .string()
      .trim()
      .min(1, "주소는 비워둘 수 없습니다.")
      .openapi({
        description: "footer 주소",
        example: DEFAULT_SITE_SETTINGS.footerAddress,
      }),
    donateBankName: z
      .string()
      .trim()
      .min(1, "은행명은 비워둘 수 없습니다.")
      .openapi({
        description: "/donate 페이지 후원 계좌 은행명",
        example: DEFAULT_SITE_SETTINGS.donateBankName,
      }),
    donateAccountNumber: z
      .string()
      .trim()
      .min(1, "계좌번호는 비워둘 수 없습니다.")
      .openapi({
        description: "/donate 페이지 후원 계좌번호",
        example: DEFAULT_SITE_SETTINGS.donateAccountNumber,
      }),
    donateAccountHolder: z
      .string()
      .trim()
      .min(1, "예금주는 비워둘 수 없습니다.")
      .openapi({
        description: "/donate 페이지 후원 계좌 예금주",
        example: DEFAULT_SITE_SETTINGS.donateAccountHolder,
      }),
  })
  .openapi("ApiSiteSettings");

export const ApiUpdateSiteSettingsSchema = ApiSiteSettingsSchema.partial().openapi(
  "ApiUpdateSiteSettingsInput",
);

const ApiRecruitingPromotionImageUrlsSchema = z
  .array(
    urlField(
      "모집 계획 홍보 이미지 URL",
      "https://cdn.yonyoung.example/recruiting/image/recruiting-1.jpg",
    ),
  )
  .max(10, "홍보 이미지는 최대 10장까지 등록할 수 있습니다.")
  .refine((items) => new Set(items).size === items.length, {
    message: "중복된 promotionImageUrls를 전달할 수 없습니다.",
  });

export const ApiRecruitingPlanSchema = z
  .object({
    year: z
      .number()
      .int()
      .min(1970)
      .openapi({
        description: "모집 계획 기준 연도 (KST 기준)",
        example: 2030,
      }),
    title: z
      .string()
      .trim()
      .min(1, "제목은 비워둘 수 없습니다.")
      .openapi({
        description: "해당 연도 모집 계획 제목",
        example: "2030 연영회 신입 부원 모집",
      }),
    content: z
      .string()
      .trim()
      .min(1, "세부 내용은 비워둘 수 없습니다.")
      .openapi({
        description: "모집 계획 상세 리치텍스트 HTML 본문",
        example: "<p>사진에 열정이 있는 분들을 모집합니다.</p>",
      }),
    promotionImageUrls: ApiRecruitingPromotionImageUrlsSchema.openapi({
      description: "모집 계획 홍보 이미지 URL 목록 (최대 10장)",
      example: [
        "https://cdn.yonyoung.example/recruiting/image/recruiting-1.jpg",
        "https://cdn.yonyoung.example/recruiting/image/recruiting-2.jpg",
      ],
    }),
    recruitmentStartAt: timestampField("모집 시작 일시", EXAMPLE_TIMESTAMP_MS),
    recruitmentEndAt: timestampField("모집 종료 일시", EXAMPLE_TIMESTAMP_MS_END),
    createdAt: timestampField("생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("수정 시각", EXAMPLE_TIMESTAMP_MS_END),
  })
  .openapi("ApiRecruitingPlan");

export const ApiUpsertCurrentRecruitingPlanSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "제목은 비워둘 수 없습니다.")
      .openapi({
        description: "해당 연도 모집 계획 제목",
        example: "2030 연영회 신입 부원 모집",
      }),
    content: z
      .string()
      .trim()
      .min(1, "세부 내용은 비워둘 수 없습니다.")
      .openapi({
        description: "모집 계획 상세 리치텍스트 HTML 본문",
        example: "<p>사진에 열정이 있는 분들을 모집합니다.</p>",
      }),
    promotionImageUrls: ApiRecruitingPromotionImageUrlsSchema.openapi({
      description: "모집 계획 홍보 이미지 URL 목록 (최대 10장)",
      example: [
        "https://cdn.yonyoung.example/recruiting/image/recruiting-1.jpg",
        "https://cdn.yonyoung.example/recruiting/image/recruiting-2.jpg",
      ],
    }),
    recruitmentStartAt: timestampField("모집 시작 일시", EXAMPLE_TIMESTAMP_MS),
    recruitmentEndAt: timestampField("모집 종료 일시", EXAMPLE_TIMESTAMP_MS_END),
  })
  .refine(
    (input) => input.recruitmentStartAt <= input.recruitmentEndAt,
    {
      message: "모집 시작 일시는 모집 종료 일시보다 늦을 수 없습니다.",
      path: ["recruitmentStartAt"],
    },
  )
  .openapi("ApiUpsertCurrentRecruitingPlanInput");

export const ApiUserSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "사용자 UUID",
      example: EXAMPLE_USER_ID,
    }),
    name: z.string().openapi({
      description: "사용자 이름",
      example: "홍길동",
    }),
    email: z.string().email().openapi({
      description: "사용자 이메일",
      example: "regular_member@yonyoung.example",
    }),
    image: z.string().url().nullable().openapi({
      description: "프로필 이미지 URL (없으면 null)",
      example: "https://cdn.yonyoung.example/users/profile/member.png",
    }),
    showcaseImageUrls: ApiShowcaseImageUrlsSchema.openapi({
      description: "대표 작품 사진 URL 목록 (최대 10장)",
      example: [
        "https://cdn.yonyoung.example/users/profile/showcase-1.jpg",
        "https://cdn.yonyoung.example/users/profile/showcase-2.jpg",
      ],
    }),
    familyName: z.string().nullable().openapi({
      description: "성 (없으면 null)",
      example: "김",
    }),
    givenName: z.string().nullable().openapi({
      description: "이름 (없으면 null)",
      example: "민수",
    }),
    college: z.string().nullable().openapi({
      description: "대학명 (예: 공과대학, 없으면 null)",
      example: "공과대학",
    }),
    department: z.string().nullable().openapi({
      description: "학과명 (없으면 null)",
      example: "컴퓨터과학과",
    }),
    studentNumber: z.string().nullable().openapi({
      description: "학번 10자리 (없으면 null)",
      example: "2026000123",
    }),
    phoneNumber: z.string().nullable().openapi({
      description: "전화번호 (없으면 null)",
      example: "010-1234-5678",
    }),
    collaborationAvailable: z.boolean().openapi({
      description: "협업 가능 여부 (true/false)",
      example: true,
    }),
    personalLink: z.string().url().nullable().openapi({
      description: "개인 링크 URL (없으면 null)",
      example: "https://example.com/my-portfolio",
    }),
    role: z.string().nullable().openapi({
      description: "원본 사용자 역할 문자열 (없으면 null)",
      example: "regular_member",
    }),
    generationId: z.string().uuid().nullable().openapi({
      description: "소속 기수 UUID (없으면 null)",
      example: EXAMPLE_GENERATION_ID,
    }),
    generationIds: z.array(z.string().uuid()).openapi({
      description: "소속 기수 UUID 목록 (다중 소속 가능, 없으면 빈 배열)",
      example: [EXAMPLE_GENERATION_ID],
    }),
    createdAt: timestampField("사용자 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("사용자 수정 시각", EXAMPLE_TIMESTAMP_MS),
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보 (로그가 없으면 null)",
    }),
  })
  .openapi("ApiUser");

const ApiUserResourceHistoryResourceTypeSchema = z
  .enum([
    "activity",
    "exhibition",
    "generation_notice",
    "global_notice",
    "linktree",
    "linktree_item",
  ])
  .openapi("ApiUserResourceHistoryResourceType");

const ApiUserResourceHistoryItemSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "감사 로그 UUID",
      example: EXAMPLE_AUDIT_ID,
    }),
    resourceType: ApiUserResourceHistoryResourceTypeSchema.openapi({
      description: "이력 리소스 타입",
      example: "activity",
    }),
    resourceId: z.string().openapi({
      description: "변경 대상 리소스 ID",
      example: EXAMPLE_PARENT_ID,
    }),
    resourceTitle: z.string().nullable().openapi({
      description: "리소스 표시 이름(조회 불가/삭제 등으로 없으면 null)",
      example: "정기 워크숍",
    }),
    action: z.enum(["create", "update", "delete"]).openapi({
      description: "수행된 액션",
      example: "update",
    }),
    changedFields: z.array(z.string()).openapi({
      description: "변경 필드 목록",
      example: ["title", "updatedAt"],
    }),
    isDeleted: z.boolean().openapi({
      description: "현재 리소스 삭제 여부(소프트 삭제 포함)",
      example: false,
    }),
    generationId: z.string().uuid().nullable().openapi({
      description: "기수 기반 리소스(activity/exhibition/generation_notice)의 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    linktreeId: z.string().uuid().nullable().openapi({
      description: "linktree_item 리소스일 때 상위 linktree UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    createdAt: timestampField("이력 기록 시각", EXAMPLE_TIMESTAMP_MS),
  })
  .openapi("ApiUserResourceHistoryItem");

export const ApiUserResourceHistorySchema = z
  .object({
    items: z.array(ApiUserResourceHistoryItemSchema).openapi({
      description: "사용자 리소스 이력 배열(최신순)",
    }),
    page: z.number().int().min(1).openapi({
      description: "현재 페이지 번호(1부터 시작)",
      example: 1,
    }),
    pageSize: z.number().int().min(1).openapi({
      description: "페이지당 이력 수",
      example: 10,
    }),
    total: z.number().int().min(0).openapi({
      description: "조건에 맞는 전체 이력 수",
      example: 24,
    }),
    totalPages: z.number().int().min(0).openapi({
      description: "전체 페이지 수",
      example: 3,
    }),
  })
  .openapi("ApiUserResourceHistory");

export const ApiUserResourceHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).openapi({
      description: "조회할 페이지 번호(기본 1)",
      example: 1,
    }),
    pageSize: z.coerce.number().int().min(1).max(100).default(10).openapi({
      description: "페이지당 조회할 최대 이력 수(기본 10, 최대 100)",
      example: 10,
    }),
    action: z.enum(["create", "update", "delete"]).optional().openapi({
      description: "특정 액션만 필터링할 때 사용",
      example: "create",
    }),
  })
  .openapi("ApiUserResourceHistoryQuery");

const ApiPublicGenerationMemberSchema = z
  .object({
    id: z.string().openapi({
      description: "사용자 식별자 (better-auth user.id)",
      example: EXAMPLE_USER_ID,
    }),
    name: z.string().openapi({
      description: "레거시 표시 이름",
      example: "홍길동",
    }),
    image: z.string().url().nullable().openapi({
      description: "프로필 이미지 URL (없으면 null)",
      example: "https://cdn.yonyoung.example/users/profile/member.png",
    }),
    showcaseImageUrls: ApiShowcaseImageUrlsSchema.openapi({
      description: "대표 작품 사진 URL 목록 (최대 10장)",
      example: [
        "https://cdn.yonyoung.example/users/profile/showcase-1.jpg",
        "https://cdn.yonyoung.example/users/profile/showcase-2.jpg",
      ],
    }),
    familyName: z.string().nullable().openapi({
      description: "성 (없으면 null)",
      example: "김",
    }),
    givenName: z.string().nullable().openapi({
      description: "이름 (없으면 null)",
      example: "민수",
    }),
    collaborationAvailable: z.boolean().openapi({
      description: "협업 가능 여부 (true/false)",
      example: true,
    }),
    personalLink: z.string().url().nullable().openapi({
      description: "개인 링크 URL (없으면 null)",
      example: "https://example.com/my-portfolio",
    }),
    role: z.string().nullable().openapi({
      description: "역할 문자열 (없으면 null)",
      example: "regular_member",
    }),
    generationId: z.string().uuid().openapi({
      description: "소속 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
  })
  .openapi("ApiPublicGenerationMember");

export const ApiGenerationMemberSummarySchema = z
  .object({
    id: z.string().openapi({
      description: "사용자 식별자 (better-auth user.id)",
      example: EXAMPLE_USER_ID,
    }),
    generationId: z.string().uuid().openapi({
      description: "조회 기준 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    name: z.string().openapi({
      description: "레거시 표시 이름",
      example: "홍길동",
    }),
    image: z.string().url().nullable().openapi({
      description: "프로필 이미지 URL (없으면 null)",
      example: "https://cdn.yonyoung.example/users/profile/member.png",
    }),
    familyName: z.string().nullable().openapi({
      description: "성 (없으면 null)",
      example: "김",
    }),
    givenName: z.string().nullable().openapi({
      description: "이름 (없으면 null)",
      example: "민수",
    }),
    department: z.string().nullable().openapi({
      description: "학과명 (없으면 null)",
      example: "컴퓨터과학과",
    }),
    collaborationAvailable: z.boolean().openapi({
      description: "협업 가능 여부 (true/false)",
      example: true,
    }),
    personalLink: z.string().url().nullable().openapi({
      description: "개인 링크 URL (없으면 null)",
      example: "https://example.com/my-portfolio",
    }),
    role: z.string().nullable().openapi({
      description: "역할 문자열 (없으면 null)",
      example: "regular_member",
    }),
  })
  .openapi("ApiGenerationMemberSummary");

export const ApiPublicGenerationWithMembersSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    name: z.string().openapi({
      description: "기수 이름",
      example: "60기",
    }),
    sortOrder: z.number().int().openapi({
      description: "기수 정렬 순서",
      example: 60,
    }),
    startDate: timestampField("기수 시작일시", EXAMPLE_TIMESTAMP_MS),
    endDate: timestampField("기수 종료일시", EXAMPLE_TIMESTAMP_MS_END),
    members: z.array(ApiPublicGenerationMemberSchema).openapi({
      description: "해당 기수 소속 공개 멤버 목록",
    }),
  })
  .openapi("ApiPublicGenerationWithMembers");

export const ApiAdminUpdateUserSchema = z
  .object({
    name: z.string().min(1).optional().openapi({
      description: "사용자 이름(관리자 수정 가능)",
      example: "홍길동",
    }),
    image: z.string().url().nullable().optional().openapi({
      description: "프로필 이미지 URL(관리자 수정 가능)",
      example: "https://cdn.yonyoung.example/users/profile/member-new.png",
    }),
    showcaseImageUrls: ApiShowcaseImageUrlsSchema.optional().openapi({
      description: "대표 작품 사진 URL 목록(관리자 수정 가능, 최대 10장)",
      example: ["https://cdn.yonyoung.example/users/profile/showcase-1.jpg"],
    }),
    familyName: z
      .string()
      .trim()
      .min(1, "성은 비워둘 수 없습니다.")
      .nullable()
      .optional()
      .openapi({
        description: "성(관리자 수정 가능)",
        example: "김",
      }),
    givenName: z
      .string()
      .trim()
      .min(1, "이름은 비워둘 수 없습니다.")
      .nullable()
      .optional()
      .openapi({
        description: "이름(관리자 수정 가능)",
        example: "민수",
      }),
    college: z
      .string()
      .trim()
      .min(1, "대학명은 비워둘 수 없습니다.")
      .nullable()
      .optional()
      .openapi({
        description: "대학명(관리자 수정 가능, 예: 공과대학)",
        example: "공과대학",
      }),
    department: z
      .string()
      .trim()
      .min(1, "학과명은 비워둘 수 없습니다.")
      .nullable()
      .optional()
      .openapi({
        description: "학과명(관리자 수정 가능)",
        example: "컴퓨터과학과",
      }),
    studentNumber: studentNumberField("학번 10자리(관리자 수정 가능)", "2026000123")
      .nullable()
      .optional(),
    phoneNumber: phoneNumberField("전화번호(관리자 수정 가능)", "010-1234-5678")
      .nullable()
      .optional(),
    collaborationAvailable: z.boolean().optional().openapi({
      description: "협업 가능 여부(true/false, 관리자 수정 가능)",
      example: true,
    }),
    personalLink: z.string().url().nullable().optional().openapi({
      description: "개인 링크 URL(관리자 수정 가능)",
      example: "https://example.com/my-portfolio",
    }),
    role: z
      .enum([
        "president",
        "vice_president",
        "manager",
        "new_member",
        "associate_member",
        "regular_member",
        "unverified",
      ])
      .optional()
      .openapi({
        description:
          "역할 문자열(관리자 전용). 기본 가입 역할은 `unverified`이며, 승인 시 member 계열 role(`new_member`/`associate_member`/`regular_member`)로 변경할 수 있습니다.",
        example: "manager",
      }),
    generationId: z.string().uuid().nullable().optional().openapi({
      description: "소속 기수 UUID(관리자 수정 가능)",
      example: EXAMPLE_GENERATION_ID,
    }),
    generationIds: z
      .array(z.string().uuid("generationIds 항목 형식이 올바르지 않습니다."))
      .optional()
      .openapi({
        description:
          "소속 기수 UUID 목록(관리자 수정 가능). 전달 시 기존 소속을 전체 교체합니다.",
        example: [EXAMPLE_GENERATION_ID],
      }),
  })
  .strict()
  .openapi("ApiAdminUpdateUserInput");

export const ApiMemberProfileUpdateSchema = z
  .object({
    image: z.string().url().nullable().optional().openapi({
      description: "본인 프로필 이미지 URL 수정",
      example: "https://cdn.yonyoung.example/users/profile/member-self.png",
    }),
    showcaseImageUrls: ApiShowcaseImageUrlsSchema.optional().openapi({
      description: "본인 대표 작품 사진 URL 목록 수정 (최대 10장)",
      example: ["https://cdn.yonyoung.example/users/profile/showcase-1.jpg"],
    }),
    familyName: z
      .string()
      .trim()
      .min(1, "성은 비워둘 수 없습니다.")
      .nullable()
      .optional()
      .openapi({
        description: "본인 성 수정",
        example: "김",
      }),
    givenName: z
      .string()
      .trim()
      .min(1, "이름은 비워둘 수 없습니다.")
      .nullable()
      .optional()
      .openapi({
        description: "본인 이름 수정",
        example: "민수",
      }),
    college: z
      .string()
      .trim()
      .min(1, "대학명은 비워둘 수 없습니다.")
      .nullable()
      .optional()
      .openapi({
        description: "본인 대학명 수정 (예: 공과대학)",
        example: "공과대학",
      }),
    department: z
      .string()
      .trim()
      .min(1, "학과명은 비워둘 수 없습니다.")
      .nullable()
      .optional()
      .openapi({
        description: "본인 학과명 수정",
        example: "컴퓨터과학과",
      }),
    studentNumber: studentNumberField("본인 학번 10자리 수정", "2026000123")
      .nullable()
      .optional(),
    phoneNumber: z
      .string()
      .trim()
      .regex(
        KOREAN_MOBILE_PHONE_REGEX,
        "전화번호는 010-1234-5678 형식이어야 합니다.",
      )
      .nullable()
      .optional()
      .openapi({
        description: "본인 전화번호 수정",
        example: "010-1234-5678",
      }),
    collaborationAvailable: z.boolean().optional().openapi({
      description: "본인 협업 가능 여부 수정(true/false)",
      example: true,
    }),
    personalLink: z.string().url().nullable().optional().openapi({
      description: "본인 개인 링크 URL 수정",
      example: "https://example.com/my-portfolio",
    }),
  })
  .strict()
  .openapi("ApiMemberProfileUpdateInput");

const ApiAdminAssignableRoleSchema = z.enum([
  "president",
  "vice_president",
  "manager",
  "new_member",
  "associate_member",
  "regular_member",
  "unverified",
]);

export const ApiBulkUpdateUserRoleSchema = z
  .object({
    userIds: z
      .array(
        z
          .string()
          .min(1)
          .regex(
            /^[A-Za-z0-9_-]+$/,
            "사용자 식별자는 영문/숫자/하이픈/언더스코어만 사용할 수 있습니다.",
          ),
      )
      .min(1, "사용자 ID를 하나 이상 전달해야 합니다.")
      .max(200, "한 번에 변경 가능한 사용자 수는 최대 200명입니다.")
      .openapi({
        description: "일괄 권한 변경 대상 사용자 ID 목록",
        example: [EXAMPLE_USER_ID],
      }),
    role: ApiAdminAssignableRoleSchema.openapi({
      description: "변경할 역할",
      example: "regular_member",
    }),
  })
  .strict()
  .openapi("ApiBulkUpdateUserRoleInput");

export const ApiAdminDashboardStatsQuerySchema = z
  .object({
    generationSortOrder: z
      .coerce
      .number()
      .int()
      .nonnegative()
      .optional()
      .openapi({
        description: "선택 기수 sortOrder",
        example: 60,
      }),
  })
  .openapi("ApiAdminDashboardStatsQuery");

export const ApiAdminDashboardStatsSchema = z
  .object({
    usersTotal: z.number().int().nonnegative().openapi({
      description: "전체 사용자 수",
      example: 120,
    }),
    unverifiedUsersTotal: z.number().int().nonnegative().openapi({
      description: "미승인 사용자 수(unverified)",
      example: 8,
    }),
    generationsTotal: z.number().int().nonnegative().openapi({
      description: "전체 기수 수",
      example: 12,
    }),
    selectedGenerationMembersTotal: z.number().int().nonnegative().openapi({
      description: "선택 기수 멤버 수",
      example: 34,
    }),
    selectedGenerationActivitiesTotal: z.number().int().nonnegative().openapi({
      description: "선택 기수 활동 수",
      example: 15,
    }),
    selectedGenerationExhibitionsTotal: z.number().int().nonnegative().openapi({
      description: "선택 기수 전시 수",
      example: 2,
    }),
    linktreeLinksTotal: z.number().int().nonnegative().openapi({
      description: "링크트리 전체 링크 수",
      example: 19,
    }),
    r2StorageUsedBytes: z.number().int().nonnegative().openapi({
      description: "R2 버킷 전체 사용량(bytes)",
      example: 2147483648,
    }),
    r2StorageLimitBytes: z.number().int().positive().openapi({
      description: "R2 사용량 기준 한도(bytes), 기본 10GB",
      example: 10737418240,
    }),
    r2StorageUsageAvailable: z.boolean().openapi({
      description:
        "R2 사용량 조회 성공 여부. false면 사용량 수치는 표시용 기본값일 수 있습니다.",
      example: true,
    }),
  })
  .openapi("ApiAdminDashboardStats");

export const ApiPresignRequestSchema = z
  .object({
    fileName: z.string().min(1, "fileName은 필수입니다.").openapi({
      description: "업로드할 파일명",
      example: "cover-image.jpg",
    }),
    contentType: z
      .string()
      .min(1)
      .openapi({
        description: "파일 MIME 타입",
        example: ALLOWED_IMAGE_CONTENT_TYPES[0],
      }),
    fileSize: z
      .number()
      .int()
      .positive()
      .openapi({
        description: `파일 크기(바이트). 단일 업로드 최대 ${UPLOAD_LIMITS.maxSinglePartBytes} bytes`,
        example: 1024 * 1024,
      }),
  })
  .strict()
  .openapi("ApiPresignRequest");

export const ApiPresignResponseSchema = z
  .object({
    uploadUrl: z.string().url().openapi({
      description: "클라이언트가 직접 PUT 업로드할 presigned URL",
      example:
        "https://<account>.r2.cloudflarestorage.com/<bucket>/activities/cover/obj-key",
    }),
    objectKey: z.string().openapi({
      description: "스토리지 객체 키(서버에 저장할 내부 식별 문자열)",
      example: "activities/cover/66666666-6666-4666-8666-666666666666/cover-image.jpg",
    }),
    publicUrl: z.string().url().openapi({
      description: "업로드 후 DB에 저장할 공개 접근 URL",
      example: "https://cdn.yonyoung.example/activities/cover/cover-image.jpg",
    }),
    requiredHeaders: z.record(z.string(), z.string()).openapi({
      description:
        "presigned URL 업로드 시 클라이언트가 그대로 전달해야 하는 헤더 목록",
      example: {
        "Content-Type": "image/jpeg",
      },
    }),
  })
  .openapi("ApiPresignResponse");

export const ApiMultipartUploadInitRequestSchema = z
  .object({
    fileName: ApiPresignRequestSchema.shape.fileName,
    contentType: ApiPresignRequestSchema.shape.contentType,
    fileSize: z
      .number()
      .int()
      .positive()
      .openapi({
        description: `멀티파트 업로드 파일 크기(바이트). 최대 ${UPLOAD_LIMITS.maxMultipartBytes} bytes`,
        example: 50 * 1024 * 1024,
      }),
  })
  .strict()
  .openapi("ApiMultipartUploadInitRequest");

export const ApiMultipartUploadInitResponseSchema = z
  .object({
    uploadId: z.string().openapi({
      description: "멀티파트 업로드 세션 ID",
      example: "VXBsb2FkIElE",
    }),
    objectKey: ApiPresignResponseSchema.shape.objectKey,
    publicUrl: ApiPresignResponseSchema.shape.publicUrl,
    partSize: z.number().int().positive().openapi({
      description: "각 파트 최소 권장 크기(바이트)",
      example: UPLOAD_LIMITS.multipartPartSizeBytes,
    }),
    maxPartNumber: z.number().int().positive().openapi({
      description: "이번 업로드에서 허용되는 최대 partNumber",
      example: 10,
    }),
  })
  .openapi("ApiMultipartUploadInitResponse");

export const ApiMultipartUploadPartRequestSchema = z
  .object({
    uploadId: z.string().min(1).openapi({
      description: "멀티파트 업로드 세션 ID",
      example: "VXBsb2FkIElE",
    }),
    objectKey: z.string().min(1).openapi({
      description: "업로드 대상 객체 키",
      example: "activities/user-1/detail/1700000000000-file.jpg",
    }),
    partNumber: z
      .number()
      .int()
      .min(1)
      .max(UPLOAD_LIMITS.multipartMaxParts)
      .openapi({
        description: "업로드할 파트 번호 (1~10000)",
        example: 1,
      }),
  })
  .strict()
  .openapi("ApiMultipartUploadPartRequest");

export const ApiMultipartUploadPartResponseSchema = z
  .object({
    uploadUrl: z.string().url().openapi({
      description: "해당 파트를 업로드할 presigned URL",
      example: "https://example.r2.cloudflarestorage.com/...",
    }),
    requiredHeaders: z.record(z.string(), z.string()).openapi({
      description: "파트 업로드 시 필요한 헤더",
      example: {},
    }),
  })
  .openapi("ApiMultipartUploadPartResponse");

const ApiMultipartUploadedPartSchema = z
  .object({
    partNumber: z
      .number()
      .int()
      .min(1)
      .max(UPLOAD_LIMITS.multipartMaxParts)
      .openapi({
        description: "완료된 파트 번호",
        example: 1,
      }),
    etag: z.string().min(1).openapi({
      description: "각 파트 업로드 결과 ETag",
      example: "\"9b2cf535f27731c974343645a3985328\"",
    }),
  })
  .openapi("ApiMultipartUploadedPart");

export const ApiMultipartUploadCompleteRequestSchema = z
  .object({
    uploadId: ApiMultipartUploadPartRequestSchema.shape.uploadId,
    objectKey: ApiMultipartUploadPartRequestSchema.shape.objectKey,
    parts: z.array(ApiMultipartUploadedPartSchema).min(1).openapi({
      description: "업로드된 파트 목록",
    }),
  })
  .strict()
  .openapi("ApiMultipartUploadCompleteRequest");

export const ApiMultipartUploadCompleteResponseSchema = z
  .object({
    objectKey: ApiPresignResponseSchema.shape.objectKey,
    publicUrl: ApiPresignResponseSchema.shape.publicUrl,
  })
  .openapi("ApiMultipartUploadCompleteResponse");

export const ApiMultipartUploadAbortRequestSchema = z
  .object({
    uploadId: ApiMultipartUploadPartRequestSchema.shape.uploadId,
    objectKey: ApiMultipartUploadPartRequestSchema.shape.objectKey,
  })
  .strict()
  .openapi("ApiMultipartUploadAbortRequest");

export const ApiOpenApiDocumentSchema = z
  .object({
    openapi: z.string().openapi({
      description: "OpenAPI 문서 버전 문자열",
      example: "3.1.1",
    }),
    info: z.record(z.string(), z.any()).openapi({
      description: "문서 메타데이터(info)",
    }),
    paths: z.record(z.string(), z.any()).openapi({
      description: "API 경로/메서드 정의",
    }),
    components: z.record(z.string(), z.any()).optional().openapi({
      description: "스키마/보안/파라미터 컴포넌트",
    }),
    tags: z.array(z.any()).optional().openapi({
      description: "태그 목록",
    }),
    servers: z.array(z.any()).optional().openapi({
      description: "서버 목록",
    }),
  })
  .passthrough()
  .openapi("ApiOpenApiDocument");
