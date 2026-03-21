import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createGeneration,
  createTestApp,
  createUser,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("generation members routes", () => {
  it("회장은 임의 기수 멤버 목록을 조회할 수 있다", async () => {
    const listUsersByGenerationIds = fn(async () => [
      createUser({
        id: IDs.member,
        familyName: "김",
        givenName: "연영",
        department: "컴퓨터과학과",
        role: "regular_member",
        generationId: IDs.generation,
        generationIds: [IDs.generation],
      }),
    ]);

    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        getGenerationById: fn(async () => createGeneration({ id: IDs.generation })),
        listUsersByGenerationIds,
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}/members`);
    expect(response.status).toBe(200);

    const body = await readJson<{
      data: Array<{
        id: string;
        generationId: string;
        name: string;
        image: string | null;
        familyName: string | null;
        givenName: string | null;
        department: string | null;
        role: string | null;
      }>;
    }>(response);

    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual({
      id: IDs.member,
      generationId: IDs.generation,
      name: "tester",
      image: null,
      familyName: "김",
      givenName: "연영",
      department: "컴퓨터과학과",
      collaborationAvailable: false,
      personalLink: null,
      role: "regular_member",
    });

    expect(Object.keys(body.data[0] ?? {}).sort()).toEqual(
      [
        "department",
        "familyName",
        "generationId",
        "givenName",
        "id",
        "image",
        "collaborationAvailable",
        "personalLink",
        "name",
        "role",
      ].sort(),
    );
  });

  it("부회장은 임의 기수 멤버 목록을 조회할 수 있다", async () => {
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getGenerationById: fn(async () => createGeneration({ id: IDs.generationAlt })),
        listUsersByGenerationIds: fn(async () => [
          createUser({
            id: IDs.otherUser,
            generationId: IDs.generationAlt,
            generationIds: [IDs.generationAlt],
            role: "new_member",
          }),
        ]),
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generationAlt}/members`);
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string; generationId: string }> }>(
      response,
    );
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: IDs.otherUser,
      generationId: IDs.generationAlt,
    });
  });

  it("부장은 본인 소속 기수 멤버 목록을 조회할 수 있다", async () => {
    const app = createTestApp({
      actor: {
        ...createActor("manager", IDs.manager),
        generationId: IDs.generation,
        generationIds: [IDs.generation],
      },
      dataService: createDataServiceMock({
        getGenerationById: fn(async () => createGeneration({ id: IDs.generation })),
        listUsersByGenerationIds: fn(async () => [
          createUser({
            id: IDs.member,
            generationId: IDs.generation,
            generationIds: [IDs.generation],
          }),
        ]),
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}/members`);
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.member);
  });

  it("부장은 본인 소속이 아닌 기수 멤버 목록 조회 시 403을 반환한다", async () => {
    const listUsersByGenerationIds = fn(async () => []);

    const app = createTestApp({
      actor: {
        ...createActor("manager", IDs.manager),
        generationId: IDs.generation,
        generationIds: [IDs.generation],
      },
      dataService: createDataServiceMock({
        getGenerationById: fn(async () => createGeneration({ id: IDs.generationAlt })),
        listUsersByGenerationIds,
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generationAlt}/members`);
    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(listUsersByGenerationIds).not.toHaveBeenCalled();
  });

  it("일반 멤버는 본인 소속 기수 멤버 목록을 조회할 수 있다", async () => {
    const app = createTestApp({
      actor: {
        ...createActor("regular_member", IDs.member),
        generationId: IDs.generation,
        generationIds: [IDs.generation],
      },
      dataService: createDataServiceMock({
        getGenerationById: fn(async () => createGeneration({ id: IDs.generation })),
        listUsersByGenerationIds: fn(async () => [
          createUser({
            id: IDs.member,
            generationId: IDs.generation,
            generationIds: [IDs.generation],
            role: "regular_member",
          }),
        ]),
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}/members`);
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.member);
  });

  it("일반 멤버는 본인 소속이 아닌 기수 멤버 목록 조회 시 403을 반환한다", async () => {
    const app = createTestApp({
      actor: {
        ...createActor("regular_member", IDs.member),
        generationId: IDs.generation,
        generationIds: [IDs.generation],
      },
      dataService: createDataServiceMock({
        getGenerationById: fn(async () => createGeneration({ id: IDs.generationAlt })),
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generationAlt}/members`);
    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
  });

  it("unverified 사용자는 403을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("unverified", IDs.member),
      dataService: createDataServiceMock({
        getGenerationById: fn(async () => createGeneration({ id: IDs.generation })),
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}/members`);
    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
  });

  it("파라미터 UUID 형식이 잘못되면 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("president", IDs.president),
    });

    const response = await app.request("/api/generations/not-a-uuid/members");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("기수가 존재하지 않으면 404를 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        getGenerationById: fn(async () => null),
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}/members`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });
});
