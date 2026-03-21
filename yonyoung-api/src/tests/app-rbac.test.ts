import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import type { Actor, Role } from "../lib/authorization/types";
import type {
  DataService,
  PresignService,
  UserEntity,
} from "../lib/services/types";

const IDs = {
  generation: "10000000-0000-4000-8000-000000000001",
  otherGeneration: "10000000-0000-4000-8000-000000000002",
  exhibition: "20000000-0000-4000-8000-000000000001",
  member: "30000000-0000-4000-8000-000000000001",
  otherUser: "30000000-0000-4000-8000-000000000002",
  manager: "30000000-0000-4000-8000-000000000003",
  president: "30000000-0000-4000-8000-000000000004",
} as const;

/**
 * createActor 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @param id 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const createActor = (
  role: Role,
  id: string,
  generationId: string | null = null,
): Actor => ({
  id,
  role,
  rawRole: role,
  name: `${role}-name`,
  familyName: null,
  givenName: null,
  email: `${role}@example.com`,
  generationId,
});

/**
 * createUser 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param id 대상을 식별하기 위한 ID 값입니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const createUser = (
  id: string,
  role: UserEntity["role"] = "regular_member",
  generationId: string | null = null,
): UserEntity => ({
  id,
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
  role,
  generationId,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  updatedBy: null,
});

const createMarketItemEntity = (overrides: Partial<{
  id: string;
  sellerId: string;
  status: "selling" | "reserved" | "sold";
}> = {}) => ({
  id: overrides.id ?? "88000000-0000-4000-8000-000000000001",
  sellerId: overrides.sellerId ?? IDs.member,
  name: "렌즈",
  imageUrls: ["https://cdn.example.com/market/item.jpg"],
  manufacturer: null,
  productCode: null,
  conditionGrade: null,
  description: null,
  price: 1000,
  status: overrides.status ?? "selling",
  seller: {
    id: overrides.sellerId ?? IDs.member,
    name: "seller-name",
    familyName: null,
    givenName: null,
    image: null,
    role: "regular_member",
  },
  createdAt: new Date(0),
  updatedAt: new Date(0),
  updatedBy: null,
});

/**
 * createDataServiceMock 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param overrides 대상을 식별하기 위한 ID 값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const createDataServiceMock = (overrides: Partial<DataService> = {}): DataService => {
  const base: Partial<DataService> = {
    createAuditLog: async () => undefined,
    listAuditLogs: async () => [],
    getLatestAuditActor: async () => null,
    listLatestAuditActors: async () => ({}),
    listUsers: async () => [],
    listUsersByIds: async () => [],
    listUsersByGenerationIds: async () => [],
    countUsersByRole: async () => 0,
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
const createPresignServiceMock = (
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

/**
 * createTestApp 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param input 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const createTestApp = (input: {
  actor: Actor | null;
  dataService?: DataService;
  presignService?: PresignService;
}) => {
  return createApp({
        /**
     * resolveActor 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    resolveActor: async () => input.actor,
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
    readR2TotalUsageBytes: async () => 0,
  });
};

describe("RBAC routes", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("미로그인 요청은 401을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/generations");
    expect(response.status).toBe(401);
  });

  it("부회장은 generation 삭제가 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: createActor("vice_president", IDs.member),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(403);
  });

  it("회장은 generation 삭제가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteGeneration = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("president", IDs.member),
      dataService: createDataServiceMock({
        deleteGeneration,
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(204);
    expect(deleteGeneration).toHaveBeenCalledWith(IDs.generation);
  });

  it("부장은 exhibition 삭제가 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(403);
  });

  it("부회장은 exhibition 삭제가 불가하다", async () => {
    const app = createTestApp({
      actor: createActor("vice_president", IDs.member),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(403);
  });

  it("부장은 exhibition 세부 이미지 삭제가 가능하다", async () => {
    const deleteExhibitionImage = vi.fn(async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        deleteExhibitionImage,
      }),
    });

    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/21000000-0000-4000-8000-000000000001`,
      {
        method: "DELETE",
      },
    );
    expect(response.status).toBe(204);
    expect(deleteExhibitionImage).toHaveBeenCalledWith(
      IDs.exhibition,
      "21000000-0000-4000-8000-000000000001",
    );
  });

  it("부원은 exhibition 세부 이미지 삭제가 불가하다", async () => {
    const deleteExhibitionImage = vi.fn(async () => true);
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        deleteExhibitionImage,
      }),
    });

    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/21000000-0000-4000-8000-000000000001`,
      {
        method: "DELETE",
      },
    );
    expect(response.status).toBe(403);
    expect(deleteExhibitionImage).not.toHaveBeenCalled();
  });

  it("정회원은 market 판매글 생성이 가능하다", async () => {
    const createMarketItem = vi.fn(async () =>
      createMarketItemEntity({ sellerId: IDs.member }),
    );
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        createMarketItem,
      }),
    });

    const response = await app.request("/api/market/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "렌즈",
        imageUrls: ["https://cdn.example.com/market/item.jpg"],
        price: 1000,
      }),
    });

    expect(response.status).toBe(201);
    expect(createMarketItem).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: IDs.member,
      }),
    );
  });

  it("unverified는 market 판매글 생성이 불가하다", async () => {
    const createMarketItem = vi.fn(async () =>
      createMarketItemEntity({ sellerId: IDs.member }),
    );
    const app = createTestApp({
      actor: createActor("unverified", IDs.member),
      dataService: createDataServiceMock({
        createMarketItem,
      }),
    });

    const response = await app.request("/api/market/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "렌즈",
        imageUrls: ["https://cdn.example.com/market/item.jpg"],
        price: 1000,
      }),
    });

    expect(response.status).toBe(403);
    expect(createMarketItem).not.toHaveBeenCalled();
  });

  it("부원의 users 목록 조회는 본인 1건만 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getUserById = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param id 대상을 식별하기 위한 ID 값입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (id: string) => createUser(id));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        getUserById,
      }),
    });

    const response = await app.request("/api/users");
    expect(response.status).toBe(200);

    const body = (await response.json()) as { data: UserEntity[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.member);
    expect(getUserById).toHaveBeenCalledWith(IDs.member);
  });

  it("정회원(regular_member)의 users 목록 조회도 본인 1건만 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getUserById = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param id 대상을 식별하기 위한 ID 값입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async (id: string) => createUser(id, "regular_member"));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        getUserById,
      }),
    });

    const response = await app.request("/api/users");
    expect(response.status).toBe(200);

    const body = (await response.json()) as { data: UserEntity[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.member);
    expect(getUserById).toHaveBeenCalledWith(IDs.member);
  });

  it("운영진은 본인 소속 기수 사용자 목록만 조회할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const listUsersByGenerationIds = vi.fn(async () => [
      createUser(IDs.member, "regular_member", IDs.generation),
      createUser(IDs.manager, "manager", IDs.generation),
    ]);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager, IDs.generation),
      dataService: createDataServiceMock({
        listUsersByGenerationIds,
      }),
    });

    const response = await app.request("/api/users");
    expect(response.status).toBe(200);

    const body = (await response.json()) as { data: UserEntity[] };
    expect(body.data).toHaveLength(2);
    expect(body.data.map((user) => user.id)).toEqual([IDs.member, IDs.manager]);
    expect(listUsersByGenerationIds).toHaveBeenCalledTimes(1);
    expect(listUsersByGenerationIds).toHaveBeenCalledWith([IDs.generation]);
  });

  it("부원은 다른 사용자 상세 조회가 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`);
    expect(response.status).toBe(403);
  });

  it("부원은 본인 상세 조회가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        getUserById: vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser(IDs.member)),
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}`);
    expect(response.status).toBe(200);
  });

  it("운영진은 본인 기수 외 사용자 상세 조회가 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager, IDs.generation),
      dataService: createDataServiceMock({
        getUserById: vi.fn(async () =>
          createUser(IDs.otherUser, "regular_member", IDs.otherGeneration),
        ),
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`);
    expect(response.status).toBe(403);
  });

  it("운영진은 본인 기수 사용자 상세 조회가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager, IDs.generation),
      dataService: createDataServiceMock({
        getUserById: vi.fn(async () =>
          createUser(IDs.member, "regular_member", IDs.generation),
        ),
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}`);
    expect(response.status).toBe(200);
  });

  it("부원은 본인 프로필(image)만 수정 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateUser = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser(IDs.member));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        image: "https://cdn.example.com/users/profile-member.png",
      }),
    });

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(IDs.member, {
      image: "https://cdn.example.com/users/profile-member.png",
    });
  });

  it("미인증 사용자는 본인 기본 정보를 수정할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateUser = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser(IDs.member, "unverified"));
    const app = createTestApp({
      actor: createActor("unverified", IDs.member),
      dataService: createDataServiceMock({
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        familyName: "김",
        givenName: "연영",
      }),
    });

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(IDs.member, {
      familyName: "김",
      givenName: "연영",
    });
  });

  it("부원은 role/generationId를 수정할 수 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "president",
      }),
    });

    expect(response.status).toBe(400);
  });

  it("부회장은 본인보다 높은 등급(회장)으로 변경할 수 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateUser = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser(IDs.otherUser, "president"));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.member),
      dataService: createDataServiceMock({
        getUserById: vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser(IDs.otherUser, "regular_member")),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "president",
      }),
    });

    expect(response.status).toBe(403);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("관리자는 unverified를 regular_member로 변경할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateUser = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser(IDs.otherUser, "regular_member"));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.member),
      dataService: createDataServiceMock({
        getUserById: vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser(IDs.otherUser, "unverified")),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "regular_member",
      }),
    });

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(IDs.otherUser, {
      role: "regular_member",
    });
  });

  it("회장 인원은 권한 변경으로 1명 미만이 될 수 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateUser = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser(IDs.president, "regular_member"));
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        getUserById: vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser(IDs.president, "president")),
        countUsersByRole: vi.fn(async () => 1),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.president}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "regular_member",
      }),
    });

    expect(response.status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("부원은 본인 계정 삭제(탈퇴)가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteUser = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        getUserById: vi.fn(async () => createUser(IDs.member, "regular_member")),
        deleteUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith(IDs.member);
  });

  it("부원은 activities 생성이 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createActivity = vi.fn(async () => ({
      id: IDs.exhibition,
      title: "t",
      description: "d",
      startDate: new Date(0),
      endDate: new Date(0),
      coverImageUrl: "https://example.com/a.jpg",
      generationId: IDs.generation,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      updatedBy: null,
      detailImages: [],
    }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        createActivity,
      }),
    });

    const response = await app.request("/api/activities", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "t",
        description: "d",
        startDate: Date.now(),
        endDate: Date.now(),
        coverImageUrl: "https://example.com/a.jpg",
        generationId: IDs.generation,
      }),
    });

    expect(response.status).toBe(403);
    expect(createActivity).not.toHaveBeenCalled();
  });

  it("부장은 사용자 프로필 presign 발급이 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(403);
  });

  it("준회원(associate_member)은 사용자 프로필 presign 발급이 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const issuePresignedPutUrl = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => ({
      uploadUrl: "https://upload.example.com/signed",
      objectKey: "users/key.png",
      publicUrl: "https://cdn.example.com/users/key.png",
      requiredHeaders: {
        "Content-Type": "image/png",
      },
    }));
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      presignService: createPresignServiceMock({
        issuePresignedPutUrl,
      }),
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(201);
    expect(issuePresignedPutUrl).toHaveBeenCalledWith({
      actorId: IDs.member,
      resource: "users",
      slot: "profile",
      fileName: "profile.png",
      contentType: "image/png",
      fileSize: 1024,
    });
  });

  it("부장은 activities presign 발급이 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const issuePresignedPutUrl = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => ({
      uploadUrl: "https://upload.example.com/signed",
      objectKey: "activities/key.png",
      publicUrl: "https://cdn.example.com/activities/key.png",
      requiredHeaders: {
        "Content-Type": "image/png",
      },
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({
        issuePresignedPutUrl,
      }),
    });

    const response = await app.request("/api/activities/presign/cover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fileName: "cover.png",
        contentType: "image/png",
        fileSize: 1024,
      }),
    });

    expect(response.status).toBe(201);
    expect(issuePresignedPutUrl).toHaveBeenCalledWith({
      actorId: IDs.manager,
      resource: "activities",
      slot: "cover",
      fileName: "cover.png",
      contentType: "image/png",
      fileSize: 1024,
    });
  });
});
