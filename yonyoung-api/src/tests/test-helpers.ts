import { expect, vi } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "../shared/api-contracts";
import { createApp } from "../app";
import type { Actor, Role } from "../lib/authorization/types";
import type {
  ActivityEntity,
  ActivityImageEntity,
  DataService,
  ExhibitionEntity,
  ExhibitionImageEntity,
  GenerationNoticeEntity,
  GlobalNoticeEntity,
  GenerationEntity,
  LinktreeEntity,
  LinktreeItemEntity,
  PresignService,
  RecruitingPlanEntity,
  SiteSettingsEntity,
  UserEntity,
} from "../lib/services/types";
import type { OpenAPIDocument } from "../lib/openapi/merge";

export const IDs = {
  generation: "10000000-0000-4000-8000-000000000001",
  generationAlt: "10000000-0000-4000-8000-000000000002",
  activity: "20000000-0000-4000-8000-000000000001",
  activityImage: "21000000-0000-4000-8000-000000000001",
  exhibition: "40000000-0000-4000-8000-000000000001",
  exhibitionImage: "41000000-0000-4000-8000-000000000001",
  generationNotice: "42000000-0000-4000-8000-000000000001",
  globalNotice: "43000000-0000-4000-8000-000000000001",
  linktree: "50000000-0000-4000-8000-000000000001",
  linktreeItem: "51000000-0000-4000-8000-000000000001",
  otherUuid: "90000000-0000-4000-8000-000000000001",
  member: "user-member-0001",
  otherUser: "user-member-0002",
  manager: "user-manager-0003",
  vicePresident: "user-vp-0004",
  president: "user-president-0005",
} as const;

const BASE_DATE = new Date("2030-01-01T00:00:00.000Z");

/**
 * createActor 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @param id 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createActor = (role: Role, id: string = IDs.member): Actor => ({
  id,
  role,
  rawRole: role,
  name: `${role}-name`,
  familyName: null,
  givenName: null,
  email: `${role}@example.com`,
  generationId: null,
});

/**
 * createGeneration 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createGeneration = (
  overrides: Partial<GenerationEntity> = {},
): GenerationEntity => ({
  id: IDs.generation,
  name: "10기",
  sortOrder: 10,
  startDate: BASE_DATE,
  endDate: new Date("2030-12-31T00:00:00.000Z"),
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  updatedBy: null,
  ...overrides,
});

/**
 * createActivityImage 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createActivityImage = (
  overrides: Partial<ActivityImageEntity> = {},
): ActivityImageEntity => ({
  id: IDs.activityImage,
  activityId: IDs.activity,
  imageUrl: "https://example.com/activity-detail.jpg",
  sortOrder: 0,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  ...overrides,
});

/**
 * createActivity 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createActivity = (
  overrides: Partial<ActivityEntity> = {},
): ActivityEntity => ({
  id: IDs.activity,
  title: "워크숍",
  description: "상세 설명",
  startDate: BASE_DATE,
  endDate: BASE_DATE,
  coverImageUrl: "https://example.com/activity-cover.jpg",
  generationId: IDs.generation,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  updatedBy: null,
  detailImages: [],
  ...overrides,
});

/**
 * createExhibitionImage 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createExhibitionImage = (
  overrides: Partial<ExhibitionImageEntity> = {},
): ExhibitionImageEntity => ({
  id: IDs.exhibitionImage,
  exhibitionId: IDs.exhibition,
  imageUrl: "https://example.com/exhibition-detail.jpg",
  sortOrder: 0,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  ...overrides,
});

/**
 * createExhibition 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createExhibition = (
  overrides: Partial<ExhibitionEntity> = {},
): ExhibitionEntity => ({
  id: IDs.exhibition,
  title: "정기전",
  startDate: new Date("2031-02-01T00:00:00.000Z"),
  endDate: new Date("2031-02-15T00:00:00.000Z"),
  generationId: IDs.generation,
  place: "아트홀",
  coverImageUrl: "https://example.com/exhibition-cover.jpg",
  description: "전시 설명",
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  updatedBy: null,
  detailImages: [],
  ...overrides,
});

/**
 * createLinktreeItem 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createLinktreeItem = (
  overrides: Partial<LinktreeItemEntity> = {},
): LinktreeItemEntity => ({
  id: IDs.linktreeItem,
  linktreeId: IDs.linktree,
  name: "Instagram",
  link: "https://instagram.com/yonyoung",
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  updatedBy: null,
  ...overrides,
});

/**
 * createLinktree 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createLinktree = (
  overrides: Partial<LinktreeEntity> = {},
): LinktreeEntity => ({
  id: IDs.linktree,
  name: "Yonyoung",
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  updatedBy: null,
  items: [],
  ...overrides,
});

export const createGenerationNotice = (
  overrides: Partial<GenerationNoticeEntity> = {},
): GenerationNoticeEntity => ({
  id: IDs.generationNotice,
  generationId: IDs.generation,
  title: "기수 공지 제목",
  content: "기수 공지 본문",
  imageUrls: [],
  author: {
    id: IDs.manager,
    name: "manager-name",
    familyName: null,
    givenName: null,
    image: null,
    role: "manager",
  },
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  updatedBy: null,
  ...overrides,
});

export const createGlobalNotice = (
  overrides: Partial<GlobalNoticeEntity> = {},
): GlobalNoticeEntity => ({
  id: IDs.globalNotice,
  title: "전체 공지 제목",
  content: "전체 공지 본문",
  imageUrls: [],
  author: {
    id: IDs.vicePresident,
    name: "vice-name",
    familyName: null,
    givenName: null,
    image: null,
    role: "vice_president",
  },
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  updatedBy: null,
  ...overrides,
});

export const createSiteSettings = (
  overrides: Partial<SiteSettingsEntity> = {},
): SiteSettingsEntity => ({
  ...DEFAULT_SITE_SETTINGS,
  ...overrides,
});

export const createRecruitingPlan = (
  overrides: Partial<RecruitingPlanEntity> = {},
): RecruitingPlanEntity => ({
  year: 2030,
  title: "2030년도 모집 계획",
  content: "<p>2030년 모집 계획 본문입니다.</p>",
  promotionImageUrls: [
    "https://cdn.yonyoung.example/recruiting/2030-1.jpg",
    "https://cdn.yonyoung.example/recruiting/2030-2.jpg",
  ],
  recruitmentStartAt: new Date("2030-03-01T00:00:00.000Z"),
  recruitmentEndAt: new Date("2030-03-31T23:59:59.000Z"),
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  ...overrides,
});

/**
 * createUser 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createUser = (
  overrides: Partial<UserEntity> = {},
): UserEntity => ({
  id: IDs.member,
  name: "tester",
  email: "tester@example.com",
  image: null,
  showcaseImageUrls: [],
  familyName: null,
  givenName: null,
  college: null,
  department: null,
  studentNumber: null,
  phoneNumber: null,
  collaborationAvailable: false,
  personalLink: null,
  role: "regular_member",
  generationId: null,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  updatedBy: null,
  ...overrides,
});

/**
 * createDataServiceMock 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createDataServiceMock = (
  overrides: Partial<DataService> = {},
): DataService => {
  const base: Partial<DataService> = {
    createAuditLog: async () => undefined,
    listAuditLogs: async () => [],
    getLatestAuditActor: async () => null,
    listLatestAuditActors: async () => ({}),
    listUsers: async () => [],
    listUsersByIds: async () => [],
    listUsersByGenerationIds: async () => [],
    countUsersByRole: async () => 0,
    listUserResourceHistory: async () => ({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    }),
  };

  const merged = { ...base, ...overrides } as DataService;

  return new Proxy(merged, {
    /**
     * get 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @param target 함수 로직에서 사용하는 입력값입니다.
     * @param prop 함수 로직에서 사용하는 입력값입니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof DataService];
      }
      return /** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
        throw new Error(`Unexpected DataService call: ${String(prop)}`);
      };
    },
  }) as DataService;
};

/**
 * createPresignServiceMock 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createPresignServiceMock = (
  overrides: Partial<PresignService> = {},
): PresignService => {
  return new Proxy(overrides as PresignService, {
    /**
     * get 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @param target 함수 로직에서 사용하는 입력값입니다.
     * @param prop 함수 로직에서 사용하는 입력값입니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof PresignService];
      }
      return /** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
        throw new Error(`Unexpected PresignService call: ${String(prop)}`);
      };
    },
  }) as PresignService;
};

const defaultAuthOpenApiSchema: OpenAPIDocument = {
  openapi: "3.1.1",
  info: { title: "auth", version: "1.0.0" },
  paths: {},
};

/**
 * createTestApp 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param input 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createTestApp = (input: {
  actor: Actor | null;
  resolveActor?: () => Promise<Actor | null>;
  dataService?: DataService;
  presignService?: PresignService;
  readR2TotalUsageBytes?: () => Promise<number> | number;
  getAuthOpenApiSchema?: () => Promise<OpenAPIDocument>;
  isDocsEnabled?: boolean;
}) => {
  return createApp({
    /**
     * resolveActor 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    resolveActor: input.resolveActor ?? (async () => input.actor),
    /**
     * getDataService 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    getDataService: () => input.dataService ?? createDataServiceMock(),
    /**
     * getPresignService 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    getPresignService: () => input.presignService ?? createPresignServiceMock(),
    readR2TotalUsageBytes: async () =>
      input.readR2TotalUsageBytes === undefined
        ? 0
        : await input.readR2TotalUsageBytes(),
    getAuthOpenApiSchema:
      input.getAuthOpenApiSchema ??
      /** createApp 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (async () =>
        defaultAuthOpenApiSchema),
    isDocsEnabled:
      /** createApp 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () =>
        input.isDocsEnabled ?? true,
  });
};

/**
 * readJson 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
 * @param response 응답 데이터 또는 응답 객체입니다.
 * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const readJson = async <T>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

/**
 * expectErrorCode의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param response 응답 데이터 또는 응답 객체입니다.
 * @param code 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const expectErrorCode = async (
  response: Response,
  code:
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL_ERROR",
) => {
  const body = await readJson<{
    error: { code: string; message: string; requestId: string };
  }>(
    response,
  );
  expect(body.error.code).toBe(code);
  expect(typeof body.error.message).toBe("string");
  expect(body.error.message.length).toBeGreaterThan(0);
  expect(typeof body.error.requestId).toBe("string");
  expect(body.error.requestId.length).toBeGreaterThan(0);
};

export const fn = vi.fn;
