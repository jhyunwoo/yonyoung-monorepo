type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "head"
  | "trace";

export type OperationDocSpec = {
  summary: string;
  overview: string;
  parameters: string[];
  requestBody: string[];
  internalFlow: string[];
  responseGuide: string[];
  errorGuide: string[];
  permission: string[];
};

export const REQUIRED_DESCRIPTION_SECTIONS = [
  "## 기본 설명",
  "## 요청 파라미터",
  "## 요청 본문",
  "## 내부 처리 요약",
  "## 반환값",
  "## 오류 응답 가이드",
  "## 권한/인증 조건",
] as const;

const commonErrorGuide = [
  "`400`: UUID 형식 오류, JSON 스키마 불일치, 빈 PATCH 본문 등 입력 검증 실패 시 반환합니다.",
  "`401`: 로그인 세션이 없거나 만료된 경우 반환합니다. 재로그인 후 재시도해야 합니다.",
  "`403`: 역할 기반 권한 정책에 의해 요청이 거부된 경우 반환합니다.",
  "`404`: 요청 대상 리소스가 존재하지 않을 때 반환합니다.",
  "`500`: 서버 내부 예외 또는 외부 의존성(R2/Auth) 오류로 정상 처리하지 못한 경우 반환합니다.",
] as const;

const readOnlyErrorGuide = [
  "`400`: 경로 파라미터(UUID) 형식이 올바르지 않거나 요청 형식이 잘못된 경우 반환합니다.",
  "`401`: 세션 인증이 없거나 만료된 경우 반환합니다.",
  "`403`: 조회 권한이 없는 역할로 접근한 경우 반환합니다.",
  "`404`: 조회 대상이 없는 경우 반환합니다.",
] as const;

/**
 * mkSpec의 핵심 비즈니스 로직을 수행합니다.
 * @param spec 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const mkSpec = (spec: OperationDocSpec): OperationDocSpec => spec;

const internalOperationSpecs: Record<string, OperationDocSpec> = {
  listGenerations: mkSpec({
    summary: "기수 목록 조회",
    overview:
      "동아리 기수 정보를 정렬된 목록으로 조회합니다. 관리자 화면에서 기수 선택/필터의 기준 데이터로 사용됩니다.",
    parameters: [
      "경로/쿼리 파라미터를 사용하지 않습니다.",
      "응답의 `sortOrder`를 기준으로 클라이언트에서 표시 순서를 구성합니다.",
    ],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "`requireActor`로 세션을 확인하고 인증된 사용자만 허용합니다.",
      "`requirePermission(..., \"generation\", \"read\")`로 역할별 조회 권한을 검사합니다.",
      "DB에서 기수 목록을 조회하고 `{ data: ApiGeneration[] }`로 응답합니다.",
    ],
    responseGuide: [
      "`200`: 기수 배열을 반환합니다. 각 항목에는 이름, 순서, 시작/종료일 timestamp(ms)가 포함됩니다.",
    ],
    errorGuide: [...readOnlyErrorGuide],
    permission: [
      "인증된 사용자만 접근 가능합니다.",
      "역할 정책 기준: generation 리소스 `read` 권한이 필요합니다.",
    ],
  }),
  createGeneration: mkSpec({
    summary: "기수 생성",
    overview:
      "새 기수를 등록합니다. 관리자가 기수 체계를 확정할 때 사용하며 `sortOrder` 중복은 허용되지 않습니다.",
    parameters: ["경로 파라미터를 사용하지 않습니다."],
    requestBody: [
      "`name`: 기수명(필수, 공백 불가)",
      "`sortOrder`: 표시 순서(정수, 0 이상, 유니크)",
      "`startDate`, `endDate`: Unix timestamp(ms) 정수",
    ],
    internalFlow: [
      "세션 및 `generation:create` 권한을 검사합니다.",
      "요청 본문을 Zod로 검증한 뒤 DB insert를 수행합니다.",
      "UNIQUE 충돌 시 `409 CONFLICT`로 변환하고, 성공 시 생성된 기수 객체를 반환합니다.",
    ],
    responseGuide: [
      "`201`: 생성된 `ApiGeneration`을 `{ data }`로 반환합니다.",
      "`409`: `sortOrder` 중복 시 반환합니다.",
    ],
    errorGuide: [
      ...commonErrorGuide,
      "`409`: `sortOrder` 고유 제약 위반(기존 기수와 순서 충돌) 시 반환합니다.",
    ],
    permission: [
      "역할 정책 기준 `generation:create` 권한이 필요합니다.",
      "회장/부회장만 생성 가능합니다.",
    ],
  }),
  getGenerationById: mkSpec({
    summary: "기수 단건 조회",
    overview:
      "기수 ID로 단건 정보를 조회합니다. 상세 편집 화면 진입 시 기준 데이터 로딩에 사용합니다.",
    parameters: ["`id` (path, UUID): 조회할 기수 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 및 `generation:read` 권한을 확인합니다.",
      "`id` 파라미터를 검증하고 DB에서 단건 조회합니다.",
      "대상이 없으면 `404`, 있으면 `{ data: ApiGeneration }`을 반환합니다.",
    ],
    responseGuide: ["`200`: 조회된 기수 객체 단건을 반환합니다."],
    errorGuide: [...readOnlyErrorGuide],
    permission: [
      "인증 + `generation:read` 권한이 필요합니다.",
      "부원도 읽기 권한 범위에서 조회 가능합니다.",
    ],
  }),
  listGenerationMembers: mkSpec({
    summary: "기수 멤버 목록 조회",
    overview:
      "특정 기수에 소속된 멤버 요약 목록을 조회합니다. 응답은 이름/학과/회원구분 중심의 summary 필드만 반환합니다.",
    parameters: ["`id` (path, UUID): 조회할 기수 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 및 `generation:read` 권한을 확인합니다.",
      "기수 존재 여부를 먼저 확인해 없으면 `404`를 반환합니다.",
      "회장/부회장은 모든 기수 접근 가능, 그 외 역할은 본인 소속 기수 ID에 한해 접근합니다.",
      "기수 멤버를 필터링한 뒤 한글 이름 기준 정렬하여 summary 배열로 반환합니다.",
    ],
    responseGuide: [
      "`200`: `ApiGenerationMemberSummary[]` 반환",
      "응답에는 이메일/학번/전화번호 등 민감 프로필 필드를 포함하지 않습니다.",
    ],
    errorGuide: [
      "`400`: UUID 형식 오류",
      "`401`: 인증 없음",
      "`403`: 소속 기수 접근 권한 없음 또는 unverified 접근",
      "`404`: 기수 없음",
    ],
    permission: [
      "회장/부회장: 모든 기수 멤버 조회 가능",
      "부장/member 계열: 본인 소속 기수 멤버 조회만 허용",
      "unverified: 조회 불가",
    ],
  }),
  updateGeneration: mkSpec({
    summary: "기수 수정",
    overview:
      "기수의 이름/순서/기간 정보를 부분 수정합니다. PATCH 방식으로 전달된 필드만 반영합니다.",
    parameters: ["`id` (path, UUID): 수정 대상 기수 식별자"],
    requestBody: [
      "PATCH 본문은 부분 필드만 전달 가능합니다.",
      "빈 객체(`{}`)는 허용되지 않으며 `400`을 반환합니다.",
      "`sortOrder`를 변경할 경우 기존 값과 충돌하면 `409`가 반환됩니다.",
    ],
    internalFlow: [
      "세션 및 `generation:update` 권한을 확인합니다.",
      "파라미터/본문을 검증하고 빈 PATCH 본문을 차단합니다.",
      "DB 업데이트 결과가 없으면 `404`, 성공 시 수정된 객체를 반환합니다.",
    ],
    responseGuide: [
      "`200`: 최신 상태의 `ApiGeneration`을 `{ data }`로 반환합니다.",
      "`409`: 정렬 순서 중복 충돌 시 반환합니다.",
    ],
    errorGuide: [
      ...commonErrorGuide,
      "`409`: `sortOrder` UNIQUE 충돌 시 반환합니다.",
    ],
    permission: [
      "`generation:update` 권한이 필요합니다.",
      "부회장까지 수정 가능하며, 부장/부원은 불가합니다.",
    ],
  }),
  deleteGeneration: mkSpec({
    summary: "기수 삭제",
    overview:
      "기수를 삭제합니다. 삭제 성공 시 본문 없이 `204 No Content`를 반환합니다.",
    parameters: ["`id` (path, UUID): 삭제할 기수 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 및 `generation:delete` 권한을 확인합니다.",
      "파라미터를 검증한 뒤 DB에서 삭제를 시도합니다.",
      "대상이 없으면 `404`, 삭제 성공 시 `204`를 반환합니다.",
    ],
    responseGuide: ["`204`: 본문 없이 삭제 완료를 의미합니다."],
    errorGuide: [...readOnlyErrorGuide],
    permission: [
      "`generation:delete` 권한이 필요합니다.",
      "현재 정책상 회장만 삭제 가능합니다.",
    ],
  }),
  listActivities: mkSpec({
    summary: "활동 목록 조회",
    overview:
      "활동 기록 목록을 조회합니다. 각 활동에는 대표 이미지와 세부 이미지 배열이 함께 포함됩니다.",
    parameters: ["경로/쿼리 파라미터를 사용하지 않습니다."],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 및 `activity:read` 권한을 확인합니다.",
      "활동과 세부 이미지를 함께 조회하여 응답 모델에 매핑합니다.",
      "정상 조회 시 `{ data: ApiActivity[] }`를 반환합니다.",
    ],
    responseGuide: [
      "`200`: 활동 배열 반환. 각 활동의 `startDate`/`endDate`는 Unix timestamp(ms)입니다.",
    ],
    errorGuide: [...readOnlyErrorGuide],
    permission: [
      "`activity:read` 권한이 필요합니다.",
      "미승인(unverified)을 제외한 모든 역할이 읽기 가능합니다.",
    ],
  }),
  createActivity: mkSpec({
    summary: "활동 생성",
    overview:
      "새 활동을 생성합니다. 대표 이미지 URL, 기수 ID, 활동 기간(start/end timestamp)을 함께 저장합니다.",
    parameters: ["경로 파라미터를 사용하지 않습니다."],
    requestBody: [
      "`title`, `description`: 활동 제목/설명",
      "`startDate`, `endDate`: Unix timestamp(ms), 종료 시각은 시작 시각보다 빠를 수 없음",
      "`coverImageUrl`: presigned 업로드 완료 후 저장할 공개 URL",
      "`generationId`: 연결할 기수 UUID",
    ],
    internalFlow: [
      "세션 및 `activity:create` 권한을 확인합니다.",
      "본문을 검증한 뒤 활동 row를 생성합니다.",
      "생성된 활동을 `{ data }`로 반환하고 상태 코드는 `201`입니다.",
    ],
    responseGuide: ["`201`: 생성된 `ApiActivity` 객체를 반환합니다."],
    errorGuide: [...commonErrorGuide],
    permission: [
      "`activity:create` 권한이 필요합니다.",
      "회장/부회장/부장만 생성할 수 있습니다.",
    ],
  }),
  getActivityById: mkSpec({
    summary: "활동 단건 조회",
    overview:
      "활동 ID 기준 상세 데이터를 조회합니다. 본문 정보와 세부 이미지 배열을 함께 제공합니다.",
    parameters: ["`id` (path, UUID): 조회할 활동 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 및 `activity:read` 권한 확인",
      "UUID 검증 후 DB 단건 조회",
      "미존재 시 `404`, 존재 시 `{ data: ApiActivity }` 반환",
    ],
    responseGuide: ["`200`: 활동 단건 상세를 반환합니다."],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`activity:read` 권한 필요"],
  }),
  updateActivity: mkSpec({
    summary: "활동 수정",
    overview:
      "활동 본문 정보를 부분 수정합니다. PATCH 본문은 최소 1개 이상의 필드를 포함해야 합니다.",
    parameters: ["`id` (path, UUID): 수정 대상 활동 식별자"],
    requestBody: [
      "부분 수정 필드만 전달합니다.",
      "빈 객체는 허용되지 않으며 `400`을 반환합니다.",
      "URL/timestamp/UUID 형식은 스키마 검증을 통과해야 합니다.",
    ],
    internalFlow: [
      "세션 + `activity:update` 권한 확인",
      "파라미터/본문 검증 및 빈 PATCH 차단",
      "DB 업데이트 결과 반환(없으면 `404`)",
    ],
    responseGuide: ["`200`: 수정된 `ApiActivity` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: [
      "`activity:update` 권한 필요",
      "회장/부회장/부장만 수정할 수 있습니다.",
    ],
  }),
  deleteActivity: mkSpec({
    summary: "활동 삭제",
    overview: "활동 본문과 연관 데이터를 정책에 따라 삭제합니다.",
    parameters: ["`id` (path, UUID): 삭제 대상 활동 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `activity:delete` 권한 확인",
      "UUID 검증 후 DB 삭제 실행",
      "대상 미존재 시 `404`, 성공 시 `204`",
    ],
    responseGuide: ["`204`: 본문 없이 삭제 완료"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`activity:delete` 권한 필요(회장/부회장/부장만 삭제 가능)"],
  }),
  addActivityImage: mkSpec({
    summary: "활동 세부 이미지 추가",
    overview:
      "활동에 세부 이미지를 추가합니다. 대표 이미지와 별도로 다중 이미지를 관리하기 위한 엔드포인트입니다.",
    parameters: ["`id` (path, UUID): 세부 이미지를 추가할 활동 식별자"],
    requestBody: [
      "`imageUrl`: 업로드 완료된 공개 이미지 URL",
      "`sortOrder`: 이미지 정렬 순서(정수, 생략 시 기본값 0)",
    ],
    internalFlow: [
      "세션 + `activity:update` 권한 확인",
      "활동 존재 여부 확인 후 세부 이미지 row 생성",
      "활동이 없으면 `404`, 생성 성공 시 `201`",
    ],
    responseGuide: ["`201`: 생성된 `ApiActivityImage` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["회장/부회장/부장만 활동 세부 이미지를 추가/수정할 수 있습니다."],
  }),
  updateActivityImage: mkSpec({
    summary: "활동 세부 이미지 수정",
    overview:
      "활동의 특정 세부 이미지 URL 또는 정렬 순서를 부분 수정합니다.",
    parameters: [
      "`id` (path, UUID): 상위 활동 식별자",
      "`imageId` (path, UUID): 수정할 세부 이미지 식별자",
    ],
    requestBody: [
      "`imageUrl` 또는 `sortOrder` 중 최소 1개 이상 전달해야 합니다.",
      "빈 객체 PATCH는 `400`을 반환합니다.",
    ],
    internalFlow: [
      "세션 + `activity:update` 권한 확인",
      "복합 경로 파라미터 검증 후 업데이트 수행",
      "이미지 미존재 시 `404`, 성공 시 수정 결과 반환",
    ],
    responseGuide: ["`200`: 수정된 `ApiActivityImage` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["`activity:update` 권한 필요(회장/부회장/부장만 수정 가능)"],
  }),
  deleteActivityImage: mkSpec({
    summary: "활동 세부 이미지 삭제",
    overview: "활동에 연결된 세부 이미지 1건을 삭제합니다.",
    parameters: [
      "`id` (path, UUID): 상위 활동 식별자",
      "`imageId` (path, UUID): 삭제할 세부 이미지 식별자",
    ],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `activity:delete` 권한 확인",
      "복합 파라미터 검증 후 삭제 실행",
      "미존재 시 `404`, 성공 시 `204` 반환",
    ],
    responseGuide: ["`204`: 본문 없이 삭제 완료"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`activity:delete` 권한 필요(회장/부회장/부장만 삭제 가능)"],
  }),
  listExhibitions: mkSpec({
    summary: "전시 목록 조회",
    overview:
      "전시 목록을 조회합니다. 전시 기간, 장소, 대표/세부 이미지 정보를 포함합니다.",
    parameters: ["경로/쿼리 파라미터를 사용하지 않습니다."],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `exhibition:read` 권한 확인",
      "전시 목록과 세부 이미지 조회",
      "`{ data: ApiExhibition[] }` 반환",
    ],
    responseGuide: ["`200`: 전시 배열 반환"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`exhibition:read` 권한 필요"],
  }),
  createExhibition: mkSpec({
    summary: "전시 생성",
    overview:
      "전시를 생성합니다. 기간, 장소, 대표 이미지 및 설명을 저장하고 기수와 연결합니다.",
    parameters: ["경로 파라미터를 사용하지 않습니다."],
    requestBody: [
      "`title`, `description`: 전시 제목/설명",
      "`startDate`, `endDate`: 전시 기간 Unix timestamp(ms)",
      "`generationId`: 연결 기수 UUID",
      "`place`: 전시 장소 텍스트",
      "`coverImageUrl`: 대표 이미지 공개 URL",
    ],
    internalFlow: [
      "세션 + `exhibition:create` 권한 확인",
      "본문 검증 후 DB 생성",
      "성공 시 `201`과 생성 객체 반환",
    ],
    responseGuide: ["`201`: `ApiExhibition` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["`exhibition:create` 권한 필요"],
  }),
  getExhibitionById: mkSpec({
    summary: "전시 단건 조회",
    overview: "전시 ID로 상세 전시 정보를 조회합니다.",
    parameters: ["`id` (path, UUID): 조회 대상 전시 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `exhibition:read` 권한 확인",
      "UUID 검증 후 단건 조회",
      "없으면 `404`, 있으면 `200`",
    ],
    responseGuide: ["`200`: `ApiExhibition` 반환"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`exhibition:read` 권한 필요"],
  }),
  updateExhibition: mkSpec({
    summary: "전시 수정",
    overview: "전시 정보를 부분 수정합니다.",
    parameters: ["`id` (path, UUID): 수정 대상 전시 식별자"],
    requestBody: [
      "부분 필드 PATCH를 지원합니다.",
      "빈 본문 PATCH는 `400`을 반환합니다.",
    ],
    internalFlow: [
      "세션 + `exhibition:update` 권한 확인",
      "파라미터/본문 검증",
      "대상 없으면 `404`, 성공 시 `200`",
    ],
    responseGuide: ["`200`: 수정된 `ApiExhibition` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["`exhibition:update` 권한 필요"],
  }),
  deleteExhibition: mkSpec({
    summary: "전시 삭제",
    overview: "전시 1건을 삭제합니다.",
    parameters: ["`id` (path, UUID): 삭제 대상 전시 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `exhibition:delete` 권한 확인",
      "UUID 검증 후 삭제",
      "성공 시 `204`",
    ],
    responseGuide: ["`204`: 본문 없이 삭제 완료"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`exhibition:delete` 권한 필요(회장만 삭제 가능)"],
  }),
  addExhibitionImage: mkSpec({
    summary: "전시 세부 이미지 추가",
    overview: "특정 전시에 세부 이미지 1건을 추가합니다.",
    parameters: ["`id` (path, UUID): 상위 전시 식별자"],
    requestBody: [
      "`imageUrl`: 공개 이미지 URL",
      "`sortOrder`: 정렬 순서(생략 시 0)",
    ],
    internalFlow: [
      "세션 + `exhibition:update` 권한 확인",
      "상위 전시 존재 여부 확인 후 이미지 생성",
      "성공 시 `201`",
    ],
    responseGuide: ["`201`: 생성된 `ApiExhibitionImage` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["`exhibition:update` 권한 필요"],
  }),
  updateExhibitionImage: mkSpec({
    summary: "전시 세부 이미지 수정",
    overview: "전시의 특정 세부 이미지 정보를 부분 수정합니다.",
    parameters: [
      "`id` (path, UUID): 상위 전시 식별자",
      "`imageId` (path, UUID): 수정 대상 세부 이미지 식별자",
    ],
    requestBody: [
      "`imageUrl` 또는 `sortOrder` 중 최소 1개 전달",
      "빈 PATCH는 `400` 반환",
    ],
    internalFlow: [
      "세션 + `exhibition:update` 권한 확인",
      "복합 UUID 파라미터 검증",
      "미존재 시 `404`, 성공 시 `200`",
    ],
    responseGuide: ["`200`: 수정된 `ApiExhibitionImage` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["`exhibition:update` 권한 필요"],
  }),
  deleteExhibitionImage: mkSpec({
    summary: "전시 세부 이미지 삭제",
    overview: "전시에 연결된 세부 이미지 1건을 삭제합니다.",
    parameters: [
      "`id` (path, UUID): 상위 전시 식별자",
      "`imageId` (path, UUID): 삭제 대상 세부 이미지 식별자",
    ],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `exhibition:update` 권한 확인",
      "복합 파라미터 검증 후 삭제",
      "삭제 성공 시 `204`",
    ],
    responseGuide: ["`204`: 본문 없는 성공 응답"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`exhibition:update` 권한 필요"],
  }),
  listLinktrees: mkSpec({
    summary: "링크트리 목록 조회",
    overview:
      "링크트리 목록과 각 링크 아이템 배열을 조회합니다. 대외 링크 페이지 렌더링 기준 데이터입니다.",
    parameters: ["경로/쿼리 파라미터를 사용하지 않습니다."],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `linktree:read` 권한 확인",
      "링크트리와 하위 아이템을 함께 조회",
      "목록 응답 반환",
    ],
    responseGuide: ["`200`: `ApiLinktree[]` 반환"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`linktree:read` 권한 필요"],
  }),
  createLinktree: mkSpec({
    summary: "링크트리 생성",
    overview: "새 링크트리 엔트리를 생성합니다.",
    parameters: ["경로 파라미터를 사용하지 않습니다."],
    requestBody: ["`name`: 링크트리 표시 이름(필수)"],
    internalFlow: [
      "세션 + `linktree:create` 권한 확인",
      "본문 검증 후 링크트리 생성",
      "성공 시 `201` 반환",
    ],
    responseGuide: ["`201`: 생성된 `ApiLinktree` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["`linktree:create` 권한 필요"],
  }),
  getLinktreeById: mkSpec({
    summary: "링크트리 단건 조회",
    overview: "링크트리 ID로 단건 상세를 조회합니다.",
    parameters: ["`id` (path, UUID): 조회 대상 링크트리 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `linktree:read` 권한 확인",
      "UUID 검증 후 단건 조회",
      "없으면 `404`",
    ],
    responseGuide: ["`200`: `ApiLinktree` 반환"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`linktree:read` 권한 필요"],
  }),
  updateLinktree: mkSpec({
    summary: "링크트리 수정",
    overview: "링크트리 메타 정보(이름)를 부분 수정합니다.",
    parameters: ["`id` (path, UUID): 수정 대상 링크트리 식별자"],
    requestBody: [
      "부분 PATCH 지원",
      "빈 본문 PATCH는 `400` 반환",
    ],
    internalFlow: [
      "세션 + `linktree:update` 권한 확인",
      "입력 검증 후 업데이트",
      "대상 없으면 `404`",
    ],
    responseGuide: ["`200`: 수정된 `ApiLinktree` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["`linktree:update` 권한 필요"],
  }),
  deleteLinktree: mkSpec({
    summary: "링크트리 삭제",
    overview: "링크트리 1건을 삭제합니다.",
    parameters: ["`id` (path, UUID): 삭제 대상 링크트리 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `linktree:delete` 권한 확인",
      "UUID 검증 후 삭제",
      "성공 시 `204`",
    ],
    responseGuide: ["`204`: 본문 없는 삭제 성공"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`linktree:delete` 권한 필요"],
  }),
  addLinktreeItem: mkSpec({
    summary: "링크트리 아이템 추가",
    overview: "특정 링크트리에 링크 아이템을 추가합니다.",
    parameters: ["`id` (path, UUID): 상위 링크트리 식별자"],
    requestBody: [
      "`name`: 링크 이름",
      "`link`: 이동 URL",
    ],
    internalFlow: [
      "세션 + `linktree:update` 권한 확인",
      "상위 링크트리 확인 후 아이템 생성",
      "성공 시 `201` 반환",
    ],
    responseGuide: ["`201`: 생성된 `ApiLinktreeItem` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["아이템 변경은 `linktree:update` 권한으로 관리"],
  }),
  updateLinktreeItem: mkSpec({
    summary: "링크트리 아이템 수정",
    overview: "링크트리 아이템 이름/링크를 부분 수정합니다.",
    parameters: [
      "`id` (path, UUID): 상위 링크트리 식별자",
      "`itemId` (path, UUID): 수정 대상 아이템 식별자",
    ],
    requestBody: [
      "`name` 또는 `link` 중 최소 1개 전달",
      "빈 PATCH 본문은 `400`",
    ],
    internalFlow: [
      "세션 + `linktree:update` 권한 확인",
      "복합 파라미터 검증 후 업데이트",
      "대상 없으면 `404`",
    ],
    responseGuide: ["`200`: 수정된 `ApiLinktreeItem` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["`linktree:update` 권한 필요"],
  }),
  deleteLinktreeItem: mkSpec({
    summary: "링크트리 아이템 삭제",
    overview: "링크트리 하위 링크 아이템 1건을 삭제합니다.",
    parameters: [
      "`id` (path, UUID): 상위 링크트리 식별자",
      "`itemId` (path, UUID): 삭제 대상 아이템 식별자",
    ],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 + `linktree:delete` 권한 확인",
      "복합 파라미터 검증 후 삭제",
      "삭제 성공 시 `204`",
    ],
    responseGuide: ["`204`: 본문 없는 성공 응답"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["`linktree:delete` 권한 필요"],
  }),
  listUsers: mkSpec({
    summary: "사용자 목록/본인 조회",
    overview:
      "권한에 따라 사용자 목록 또는 본인 정보만 조회합니다. member 계열 role(new_member/associate_member/regular_member)은 본인 정보만 반환됩니다.",
    parameters: ["경로/쿼리 파라미터를 사용하지 않습니다."],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 확인 후 역할 기반 분기(`can(...)`)를 수행합니다.",
      "관리 권한이 있으면 전체 목록 조회, member 계열 role이면 본인 단건만 배열 형태로 반환합니다.",
      "권한이 없으면 `403`을 반환합니다.",
    ],
    responseGuide: [
      "`200`: 사용자 배열 반환. member 계열 role은 길이 1의 본인 배열을 받습니다.",
      "`404`: member 계열 role의 본인 row가 DB에 없으면 반환될 수 있습니다.",
    ],
    errorGuide: [
      "`401`: 인증 없음",
      "`403`: 역할 정책상 조회 불가",
      "`404`: 본인 사용자 정보가 존재하지 않음",
    ],
    permission: [
      "회장/부회장은 전체 사용자 조회 가능",
      "운영진(manager)은 본인 소속 기수 사용자만 조회 가능",
      "member 계열 role은 self-only 정책으로 본인 데이터만 조회 가능",
    ],
  }),
  getUserById: mkSpec({
    summary: "사용자 단건 조회",
    overview:
      "사용자 ID 기준 단건 조회입니다. member 계열 role은 본인 ID에 대해서만 접근할 수 있습니다.",
    parameters: ["`id` (path, UUID): 조회 대상 사용자 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 확인 후 본인 여부(`isSelf`)와 역할 권한을 함께 검사합니다.",
      "member 계열 role이 타인 ID를 조회하면 명시적으로 `403`을 반환합니다.",
      "대상이 없으면 `404`, 있으면 `200`",
    ],
    responseGuide: ["`200`: `ApiUser` 반환"],
    errorGuide: [
      "`400`: UUID 형식 오류",
      "`401`: 인증 없음",
      "`403`: 권한 없음 또는 member 계열 role의 타인 조회 시도",
      "`404`: 사용자 없음",
    ],
    permission: [
      "회장/부회장은 모든 사용자 조회 가능",
      "운영진(manager)은 본인 소속 기수 사용자 + 본인 ID만 조회 가능",
      "member 계열 role은 본인 ID만 허용",
    ],
  }),
  getUserResourceHistory: mkSpec({
    summary: "사용자 리소스 이력 조회",
    overview:
      "특정 사용자의 리소스 생성/수정/삭제 이력을 조회합니다. 감사 로그(actorId)와 리소스 메타 정보를 조합해 화면 표시용 데이터를 제공합니다.",
    parameters: [
      "`id` (path): 조회 대상 사용자 식별자(better-auth user.id)",
      "`page` (query, optional): 조회할 페이지 번호(기본 1)",
      "`pageSize` (query, optional): 페이지당 조회 건수(기본 10, 최소 1, 최대 100)",
      "`action` (query, optional): create/update/delete 중 특정 액션만 조회",
    ],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 확인 후 회장/부회장 권한인지 검사합니다.",
      "대상 사용자 존재 여부를 확인합니다(없으면 `404`).",
      "audit_logs(actorId) 기준으로 대상 리소스 타입의 이력을 최신순 조회하고 리소스 메타를 병합해 반환합니다.",
    ],
    responseGuide: [
      "`200`: `{ items: ApiUserResourceHistoryItem[], page, pageSize, total, totalPages }` 반환",
      "`items`에는 리소스 타입/제목/액션/삭제 여부/연결용 보조 ID(generationId/linktreeId)가 포함됩니다.",
    ],
    errorGuide: [
      "`400`: 사용자 ID 형식 또는 page/pageSize/action 쿼리 검증 실패",
      "`401`: 인증 없음",
      "`403`: 회장/부회장이 아닌 역할",
      "`404`: 대상 사용자 없음",
    ],
    permission: [
      "회장/부회장만 접근 가능",
      "부장/member 계열/unverified는 접근 불가",
    ],
  }),
  updateUser: mkSpec({
    summary: "사용자 정보 수정",
    overview:
      "역할별로 수정 가능 범위가 다릅니다. 관리자는 확장 필드(role/generationIds 및 학적 정보 포함), member 계열 role 및 unverified는 본인 프로필 필드만 수정 가능합니다.",
    parameters: ["`id` (path, UUID): 수정 대상 사용자 식별자"],
    requestBody: [
      "관리자 요청: `ApiAdminUpdateUserSchema` 기준",
      "member 계열 role/unverified 본인 요청: `ApiMemberProfileUpdateSchema` 기준(image/showcaseImageUrls/familyName/givenName/college/department/studentNumber/phoneNumber)",
      "빈 PATCH 본문은 `400` 반환",
    ],
    internalFlow: [
      "세션 확인 후 admin-like 권한과 self 여부를 분기합니다.",
      "역할에 맞는 스키마로 본문을 검증합니다.",
      "권한/대상 검증 통과 시 업데이트하고 최신 사용자 객체를 반환합니다.",
    ],
    responseGuide: ["`200`: 수정된 `ApiUser` 반환"],
    errorGuide: [
      ...commonErrorGuide,
      "`403`: member 계열 role 또는 unverified가 본인이 아닌 사용자 수정 시도 시 반환합니다.",
    ],
    permission: [
      "관리 권한자는 사용자 관리 필드 및 학적 정보 수정 가능",
      "member 계열 role 및 unverified는 본인 프로필 필드(학적 정보 포함)만 수정 가능",
    ],
  }),
  deleteUser: mkSpec({
    summary: "사용자 삭제(탈퇴 포함)",
    overview:
      "사용자 계정을 삭제합니다. member 계열 role은 본인 계정 탈퇴만 가능하며, 관리자는 정책 범위 내에서 삭제할 수 있습니다.",
    parameters: ["`id` (path, UUID): 삭제 대상 사용자 식별자"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션 확인 후 역할 권한과 본인 여부를 함께 검증합니다.",
      "권한 미충족 시 `403`을 반환합니다.",
      "삭제 성공 시 `204` 반환",
    ],
    responseGuide: ["`204`: 본문 없는 삭제 성공"],
    errorGuide: [...readOnlyErrorGuide],
    permission: [
      "관리 권한자는 정책 범위 내 사용자 삭제 가능",
      "member 계열 role은 self-only 탈퇴만 허용",
    ],
  }),
  bulkUpdateUserRole: mkSpec({
    summary: "사용자 권한 일괄 변경",
    overview:
      "여러 사용자 권한을 한 번에 변경합니다. 본인보다 높은 등급으로 승격할 수 없고 회장 권한은 최소 1명 이상 유지됩니다.",
    parameters: ["경로 파라미터를 사용하지 않습니다."],
    requestBody: [
      "`userIds`: 권한 변경 대상 사용자 ID 배열",
      "`role`: 변경할 대상 역할",
    ],
    internalFlow: [
      "세션 및 `user:update` 권한을 확인합니다.",
      "입력 사용자/역할 검증 후 회장 최소 1인 유지 정책을 검사합니다.",
      "검증을 통과하면 일괄 업데이트 후 갱신된 사용자 배열을 반환합니다.",
    ],
    responseGuide: ["`200`: 권한이 반영된 `ApiUser[]` 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["관리 권한(`user:update`) 필요"],
  }),
  getAdminDashboardStats: mkSpec({
    summary: "관리자 대시보드 집계 조회",
    overview:
      "관리자 홈(`/admin`) 현황판에 필요한 KPI 집계를 조회합니다. 선택 기수 sortOrder를 쿼리로 전달할 수 있습니다.",
    parameters: ["`generationSortOrder` (query, optional): 선택 기수 sortOrder"],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "세션을 확인하고 관리자 페이지 접근 가능한 역할인지 검사합니다.",
      "전체/선택기수 집계를 계산해 단일 응답으로 반환합니다.",
      "선택 기수가 없거나 유효하지 않으면 선택 기수 관련 지표는 0으로 반환됩니다.",
      "R2 버킷 전체 사용량을 조회해 10GB 한도 대비 사용량 메타를 함께 반환합니다.",
      "R2 조회 실패 시에도 응답은 200을 유지하며 `r2StorageUsageAvailable=false`를 반환합니다.",
    ],
    responseGuide: ["`200`: `ApiAdminDashboardStats` 반환"],
    errorGuide: [...readOnlyErrorGuide],
    permission: ["관리자 페이지 접근 역할 필요"],
  }),
  issueActivityCoverPresign: mkSpec({
    summary: "활동 대표 이미지 업로드 URL 발급",
    overview:
      "AWS S3 호환(R2) presigned PUT URL을 발급하여 활동 대표 이미지를 안전하게 업로드하도록 지원합니다.",
    parameters: ["경로 파라미터 없음"],
    requestBody: [
      "`fileName`: 업로드 파일명",
      "`contentType`: `image/*` MIME 타입만 허용",
    ],
    internalFlow: [
      "세션 확인 후 `activity:create` 또는 `activity:update` 권한을 검사합니다.",
      "본문 검증 후 presign 서비스에서 URL/오브젝트 키/필수 헤더를 생성합니다.",
      "발급 실패 시 `500`, 성공 시 `201`을 반환합니다.",
    ],
    responseGuide: [
      "`201`: `uploadUrl`, `objectKey`, `publicUrl`, `requiredHeaders`를 반환합니다.",
      "클라이언트는 `uploadUrl`로 PUT 업로드 후 `publicUrl`을 본문 API에 저장합니다.",
    ],
    errorGuide: [...commonErrorGuide],
    permission: ["회장/부회장/부장처럼 활동 생성/수정 권한이 있는 역할만 발급 가능합니다."],
  }),
  issueActivityDetailPresign: mkSpec({
    summary: "활동 세부 이미지 업로드 URL 발급",
    overview: "활동 세부 이미지 업로드용 presigned PUT URL을 발급합니다.",
    parameters: ["경로 파라미터 없음"],
    requestBody: [
      "`fileName`, `contentType(image/*)`를 전달합니다.",
    ],
    internalFlow: [
      "`activity:create/update` 권한을 확인합니다.",
      "presign 발급 후 업로드 메타를 반환합니다.",
    ],
    responseGuide: ["`201`: presign 발급 정보 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["회장/부회장/부장처럼 활동 생성/수정 권한이 있는 역할만 발급 가능합니다."],
  }),
  issueExhibitionCoverPresign: mkSpec({
    summary: "전시 대표 이미지 업로드 URL 발급",
    overview: "전시 대표 이미지 업로드를 위한 presigned URL을 발급합니다.",
    parameters: ["경로 파라미터 없음"],
    requestBody: ["`fileName`, `contentType(image/*)`"],
    internalFlow: [
      "`exhibition:create/update` 권한 확인",
      "presign 서비스 호출",
      "발급 결과 반환",
    ],
    responseGuide: ["`201`: presign 발급 정보 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["전시 생성/수정 권한 필요"],
  }),
  issueExhibitionDetailPresign: mkSpec({
    summary: "전시 세부 이미지 업로드 URL 발급",
    overview: "전시 세부 이미지 업로드 presigned URL을 발급합니다.",
    parameters: ["경로 파라미터 없음"],
    requestBody: ["`fileName`, `contentType(image/*)`"],
    internalFlow: [
      "`exhibition:create/update` 권한 확인",
      "presign URL/헤더/공개 URL 생성",
      "발급 결과 반환",
    ],
    responseGuide: ["`201`: presign 발급 정보 반환"],
    errorGuide: [...commonErrorGuide],
    permission: ["전시 생성/수정 권한 필요"],
  }),
  issueUserProfilePresign: mkSpec({
    summary: "사용자 프로필 이미지 업로드 URL 발급",
    overview:
      "사용자 프로필 이미지 업로드용 presigned URL을 발급합니다. member 계열 role은 본인 프로필 수정 흐름에서 사용됩니다.",
    parameters: ["경로 파라미터 없음"],
    requestBody: ["`fileName`, `contentType(image/*)`"],
    internalFlow: [
      "세션 확인 후 관리자 `user:update` 권한 또는 member 계열 role 본인 프로필 시나리오를 허용합니다.",
      "본문 검증 후 presign 발급",
      "성공 시 `201`, 실패 시 `500`",
    ],
    responseGuide: ["`201`: presign 발급 정보 반환"],
    errorGuide: [...commonErrorGuide],
    permission: [
      "관리자 사용자 수정 권한 보유자 또는 member 계열 role 본인 프로필 수정 흐름에서만 발급",
    ],
  }),
  getOpenApiDocument: mkSpec({
    summary: "통합 OpenAPI 문서 조회",
    overview:
      "내부 API 스키마와 Better Auth 스키마를 병합한 단일 OpenAPI 3.1 문서를 반환합니다.",
    parameters: ["경로/쿼리 파라미터를 사용하지 않습니다."],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "내부 OpenAPI 문서를 생성하고 Better Auth 스키마를 조회합니다.",
      "경로/컴포넌트를 병합하고 문서 설명 강화(enrich) 후 반환합니다.",
    ],
    responseGuide: ["`200`: OpenAPI 3.1 JSON 문서 반환"],
    errorGuide: ["`500`: 스키마 병합 또는 생성 실패"],
    permission: ["공개 엔드포인트입니다."],
  }),
  getScalarApiReference: mkSpec({
    summary: "Scalar API 문서 UI 조회",
    overview:
      "Scalar UI를 렌더링하여 브라우저에서 `/api/openapi.json` 문서를 시각적으로 탐색할 수 있도록 제공합니다.",
    parameters: ["경로/쿼리 파라미터를 사용하지 않습니다."],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "Scalar 설정(url=/api/openapi.json)으로 HTML을 렌더링합니다.",
    ],
    responseGuide: ["`200`: `text/html` 문서 UI 반환"],
    errorGuide: ["일반적으로 문서 렌더링 실패 외 비즈니스 오류를 반환하지 않습니다."],
    permission: ["공개 엔드포인트입니다."],
  }),
  getHealth: mkSpec({
    summary: "시스템 인프라 헬스 체크",
    overview:
      "D1, R2, Durable Object, ASSETS 등 Cloudflare 의존 서비스 상태를 점검한 종합 결과를 반환합니다.",
    parameters: ["파라미터를 사용하지 않습니다."],
    requestBody: ["요청 본문은 사용하지 않습니다."],
    internalFlow: [
      "D1 쿼리, R2 put/head/delete, R2 presign 생성, Durable Object/ASSETS 바인딩 점검을 수행합니다.",
      "각 체크 결과를 집계해 전체 상태를 계산하고 JSON으로 반환합니다.",
    ],
    responseGuide: [
      "`200`: 모든 필수 체크가 `healthy`인 경우 헬스 체크 JSON을 반환합니다.",
      "`503`: 하나 이상의 체크가 `unhealthy`인 경우 헬스 체크 JSON을 반환합니다.",
    ],
    errorGuide: ["체크 실패 시에도 가능한 한 실패 원인을 포함한 JSON을 반환합니다."],
    permission: ["공개 엔드포인트입니다."],
  }),
};

type AuthSpecMap = Record<string, Partial<Record<HttpMethod, OperationDocSpec>>>;

const authSpecMap: AuthSpecMap = {
  "/api/auth/get-session": {
    get: mkSpec({
      summary: "인증 세션 조회",
      overview:
        "현재 요청의 쿠키 기반 세션 정보를 조회합니다. 로그인 상태 점검 및 보호 라우트 판별에 사용됩니다.",
      parameters: ["쿠키(`better-auth.session_token`)를 기반으로 세션을 판별합니다."],
      requestBody: ["요청 본문은 사용하지 않습니다."],
      internalFlow: [
        "Better Auth가 요청 헤더/쿠키를 파싱합니다.",
        "유효한 세션이면 사용자/세션 객체를 반환하고, 없으면 null 응답을 반환합니다.",
      ],
      responseGuide: [
        "`200`: 로그인 상태면 세션 객체, 비로그인이면 null 형태를 반환합니다.",
      ],
      errorGuide: [
        "`401/200(null)`: 클라이언트 구현 방식에 따라 비로그인 상태를 해석해야 합니다.",
      ],
      permission: ["일반적으로 인증 확인용 엔드포인트이며 세션 존재 여부가 핵심입니다."],
    }),
  },
  "/api/auth/sign-in/social": {
    post: mkSpec({
      summary: "소셜 로그인 시작",
      overview:
        "소셜 공급자(예: Google) 로그인 플로우를 시작합니다. 공급자 인증 페이지 이동 URL을 생성합니다.",
      parameters: [
        "공급자(provider), callbackURL, redirect 옵션 등이 본문에 포함됩니다.",
      ],
      requestBody: [
        "Better Auth 소셜 로그인 스키마를 따릅니다.",
        "`provider`는 사전에 구성된 공급자만 허용됩니다.",
      ],
      internalFlow: [
        "요청 본문 검증 후 OAuth 공급자 인증 URL을 구성합니다.",
        "필요 시 redirect URL 또는 중간 응답 URL을 반환합니다.",
      ],
      responseGuide: [
        "`200`: 인증 진행용 URL/상태를 반환합니다.",
      ],
      errorGuide: [
        "`400`: 공급자 값 또는 필수 입력이 잘못된 경우",
        "`500`: OAuth 설정/통신 오류",
      ],
      permission: ["비로그인 사용자가 로그인 시작을 위해 호출할 수 있습니다."],
    }),
  },
  "/api/auth/sign-out": {
    post: mkSpec({
      summary: "로그아웃",
      overview: "현재 세션을 무효화하고 인증 쿠키를 정리합니다.",
      parameters: ["유효한 세션 쿠키가 있으면 해당 세션을 종료합니다."],
      requestBody: ["요청 본문은 일반적으로 필요하지 않습니다."],
      internalFlow: [
        "세션 토큰을 식별해 무효화합니다.",
        "클라이언트 쿠키를 만료 처리합니다.",
      ],
      responseGuide: ["`200`: 로그아웃 처리 결과 반환"],
      errorGuide: [
        "`401`: 이미 로그아웃 상태이거나 세션이 유효하지 않은 경우",
      ],
      permission: ["로그인 사용자의 세션 종료 용도입니다."],
    }),
  },
  "/api/auth/callback/google": {
    get: mkSpec({
      summary: "Google OAuth 콜백 처리",
      overview:
        "Google 인증 완료 후 인가 코드를 받아 사용자 세션을 생성합니다.",
      parameters: ["OAuth `code`, `state` 쿼리 파라미터를 사용합니다."],
      requestBody: ["요청 본문은 사용하지 않습니다."],
      internalFlow: [
        "state 검증 및 토큰 교환",
        "사용자 조회/생성 후 세션 발급",
        "설정된 콜백 URL로 리다이렉트",
      ],
      responseGuide: ["`200/302`: 라이브러리 동작에 따라 응답/리다이렉트"],
      errorGuide: [
        "`400`: code/state 불일치",
        "`500`: OAuth 교환 실패",
      ],
      permission: ["OAuth 공급자에서 반환된 브라우저 요청이 호출합니다."],
    }),
  },
  "/api/auth/open-api/generate-schema": {
    get: mkSpec({
      summary: "Better Auth OpenAPI 스키마 생성",
      overview:
        "Better Auth가 제공하는 인증 엔드포인트 OpenAPI 스키마를 생성해 반환합니다.",
      parameters: ["파라미터를 사용하지 않습니다."],
      requestBody: ["요청 본문은 사용하지 않습니다."],
      internalFlow: [
        "Better Auth OpenAPI 플러그인이 최신 스키마를 생성합니다.",
      ],
      responseGuide: ["`200`: 인증 API 스키마 JSON 반환"],
      errorGuide: ["일반적으로 비즈니스 오류를 반환하지 않습니다."],
      permission: ["문서 병합을 위해 공개 접근 가능합니다."],
    }),
  },
};

/**
 * buildUnknownAuthSpec 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param path 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @param method 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const buildUnknownAuthSpec = (
  path: string,
  method: HttpMethod,
): OperationDocSpec => {
  return mkSpec({
    summary: `인증 엔드포인트 (${method.toUpperCase()} ${path})`,
    overview:
      "Better Auth에서 자동 제공하는 인증 엔드포인트입니다. 세부 동작은 인증 플러그인 구성 및 요청 종류에 따라 달라집니다.",
    parameters: ["요청 파라미터/쿼리/쿠키 구조는 Better Auth 스키마를 따릅니다."],
    requestBody: [
      "요청 본문은 엔드포인트 목적(로그인/세션/토큰)에 따라 달라집니다.",
      "정확한 필드는 OpenAPI requestBody 스키마를 확인하세요.",
    ],
    internalFlow: [
      "Better Auth가 요청을 라우팅하고 입력을 검증합니다.",
      "인증/세션/계정 처리를 수행한 뒤 결과를 응답합니다.",
    ],
    responseGuide: ["성공 응답 구조는 해당 operation의 response schema를 따릅니다."],
    errorGuide: [
      "`400`: 인증 요청 스키마 불일치",
      "`401`: 세션 없음 또는 인증 실패",
      "`500`: 인증 시스템 내부 오류",
    ],
    permission: [
      "로그인 엔드포인트는 비로그인 접근이 가능할 수 있으며, 세션 관리 엔드포인트는 인증이 필요할 수 있습니다.",
      "실제 요구 조건은 각 operation의 security와 middleware를 함께 확인해야 합니다.",
    ],
  });
};

/**
 * formatList의 핵심 비즈니스 로직을 수행합니다.
 * @param items 반복 처리 중인 현재 항목입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const formatList = (items: string[]): string => {
  if (items.length === 0) {
    return "- 해당 사항이 없습니다.";
  }
  return items.map(/** items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => `- ${item}`).join("\n");
};

/**
 * renderOperationDescription의 핵심 비즈니스 로직을 수행합니다.
 * @param spec 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const renderOperationDescription = (spec: OperationDocSpec): string => {
  const sections = [
    `${REQUIRED_DESCRIPTION_SECTIONS[0]}\n${spec.overview}`,
    `${REQUIRED_DESCRIPTION_SECTIONS[1]}\n${formatList(spec.parameters)}`,
    `${REQUIRED_DESCRIPTION_SECTIONS[2]}\n${formatList(spec.requestBody)}`,
    `${REQUIRED_DESCRIPTION_SECTIONS[3]}\n${formatList(spec.internalFlow)}`,
    `${REQUIRED_DESCRIPTION_SECTIONS[4]}\n${formatList(spec.responseGuide)}`,
    `${REQUIRED_DESCRIPTION_SECTIONS[5]}\n${formatList(spec.errorGuide)}`,
    `${REQUIRED_DESCRIPTION_SECTIONS[6]}\n${formatList(spec.permission)}`,
  ];
  return sections.join("\n\n");
};

/**
 * asMethod의 핵심 비즈니스 로직을 수행합니다.
 * @param method 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const asMethod = (method: string): HttpMethod | null => {
  const normalized = method.toLowerCase();
  if (
    normalized === "get" ||
    normalized === "post" ||
    normalized === "put" ||
    normalized === "patch" ||
    normalized === "delete" ||
    normalized === "options" ||
    normalized === "head" ||
    normalized === "trace"
  ) {
    return normalized;
  }
  return null;
};

/**
 * getInternalOperationDocSpec 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param operationId 대상을 식별하기 위한 ID 값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const getInternalOperationDocSpec = (
  operationId: string | undefined,
): OperationDocSpec | null => {
  if (!operationId) {
    return null;
  }
  return internalOperationSpecs[operationId] ?? null;
};

/**
 * getAuthOperationDocSpec 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param path 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @param method 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const getAuthOperationDocSpec = (
  path: string,
  method: string,
): OperationDocSpec | null => {
  const httpMethod = asMethod(method);
  if (!httpMethod || !path.startsWith("/api/auth")) {
    return null;
  }

  const direct = authSpecMap[path]?.[httpMethod];
  if (direct) {
    return direct;
  }

  if (path.startsWith("/api/auth/sign-in/")) {
    return mkSpec({
      summary: "인증 로그인 처리",
      overview:
        "인증 공급자/방식별 로그인 진입 엔드포인트입니다. 구체 필드는 Better Auth 스키마를 따릅니다.",
      parameters: ["공급자별 요청 파라미터를 사용합니다."],
      requestBody: ["로그인 방식별 필수 입력값을 전달합니다."],
      internalFlow: [
        "입력 검증 및 인증 챌린지/리다이렉트 생성",
        "인증 성공 시 세션 생성",
      ],
      responseGuide: ["성공 시 로그인 진행/완료 정보를 반환합니다."],
      errorGuide: [
        "`400`: 인증 입력 오류",
        "`401`: 인증 실패",
        "`500`: 인증 내부 오류",
      ],
      permission: ["로그인 진입 API로 비로그인 상태에서 호출 가능합니다."],
    });
  }

  if (path.startsWith("/api/auth/callback/")) {
    return mkSpec({
      summary: "인증 콜백 처리",
      overview:
        "외부 인증 공급자에서 반환된 콜백을 처리하여 세션을 생성/갱신합니다.",
      parameters: ["인가 코드, state 등의 쿼리 파라미터를 사용합니다."],
      requestBody: ["요청 본문은 일반적으로 사용하지 않습니다."],
      internalFlow: [
        "콜백 파라미터 검증",
        "토큰 교환/사용자 매핑",
        "세션 생성 및 최종 이동 처리",
      ],
      responseGuide: ["성공 시 세션이 생성되고 리다이렉트 또는 성공 응답을 반환합니다."],
      errorGuide: [
        "`400`: 콜백 파라미터 불일치",
        "`500`: 공급자 통신 오류",
      ],
      permission: ["OAuth/인증 공급자가 리다이렉트하는 요청입니다."],
    });
  }

  if (path.startsWith("/api/auth/open-api/")) {
    return mkSpec({
      summary: "인증 OpenAPI 스키마 조회",
      overview:
        "인증 시스템 OpenAPI 스키마를 조회하는 문서 보조 엔드포인트입니다.",
      parameters: ["요청 파라미터를 사용하지 않습니다."],
      requestBody: ["요청 본문 없음"],
      internalFlow: [
        "인증 문서 스키마를 생성해 반환합니다.",
      ],
      responseGuide: ["`200`: 인증 OpenAPI 문서 반환"],
      errorGuide: ["일반적으로 비즈니스 오류를 반환하지 않습니다."],
      permission: ["문서 병합을 위해 공개 접근 가능합니다."],
    });
  }

  return buildUnknownAuthSpec(path, httpMethod);
};
