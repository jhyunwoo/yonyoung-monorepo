import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createGeneration,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("generation routes", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("인증되지 않은 요청은 401을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/generations");

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
  });

  it("member 계열 사용자는 generation 목록 조회가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const listGenerations = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => [createGeneration()]);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ listGenerations }),
    });

    const response = await app.request("/api/generations");
    expect(response.status).toBe(200);

    const body = await readJson<{
      data: Array<{ id: string; startDate: number; endDate: number }>;
    }>(response);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.generation);
    expect(typeof body.data[0]?.startDate).toBe("number");
    expect(typeof body.data[0]?.endDate).toBe("number");
    expect(listGenerations).toHaveBeenCalledTimes(1);
  });

  it("manager는 generation 생성 권한이 없어 403을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createGenerationMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createGeneration());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ createGeneration: createGenerationMock }),
    });

    const response = await app.request("/api/generations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "11기",
        sortOrder: 11,
        startDate: Date.parse("2031-01-01T00:00:00.000Z"),
        endDate: Date.parse("2031-12-31T00:00:00.000Z"),
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(createGenerationMock).not.toHaveBeenCalled();
  });

  it("생성 요청 본문이 잘못되면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("president", IDs.president) });

    const response = await app.request("/api/generations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sortOrder: 11,
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("president는 generation을 생성할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createGenerationMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createGeneration({ name: "11기", sortOrder: 11 }));
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ createGeneration: createGenerationMock }),
    });

    const payload = {
      name: "11기",
      sortOrder: 11,
      startDate: Date.parse("2031-01-01T00:00:00.000Z"),
      endDate: Date.parse("2031-12-31T00:00:00.000Z"),
    };
    const response = await app.request("/api/generations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { name: string; sortOrder: number } }>(response);
    expect(body.data.name).toBe("11기");
    expect(body.data.sortOrder).toBe(11);
    expect(createGenerationMock).toHaveBeenCalledWith(payload);
  });

  it("generation 생성 시 UNIQUE 충돌은 409를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createGenerationMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      throw new Error("UNIQUE constraint failed: generations.sort_order");
    });
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ createGeneration: createGenerationMock }),
    });

    const response = await app.request("/api/generations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "11기",
        sortOrder: 11,
        startDate: Date.parse("2031-01-01T00:00:00.000Z"),
        endDate: Date.parse("2031-12-31T00:00:00.000Z"),
      }),
    });

    expect(response.status).toBe(409);
    await expectErrorCode(response, "CONFLICT");
  });

  it("generation 생성 시 알 수 없는 예외는 500을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createGenerationMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      throw new Error("db unavailable");
    });
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ createGeneration: createGenerationMock }),
    });

    const response = await app.request("/api/generations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "11기",
        sortOrder: 11,
        startDate: Date.parse("2031-01-01T00:00:00.000Z"),
        endDate: Date.parse("2031-12-31T00:00:00.000Z"),
      }),
    });

    expect(response.status).toBe(500);
    await expectErrorCode(response, "INTERNAL_ERROR");
  });

  it("상세 조회에서 UUID 파라미터가 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("regular_member") });

    const response = await app.request("/api/generations/not-a-uuid");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 generation 상세 조회는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getGenerationById = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ getGenerationById }),
    });

    const response = await app.request(`/api/generations/${IDs.generationAlt}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(getGenerationById).toHaveBeenCalledWith(IDs.generationAlt);
  });

  it("generation 상세 조회는 성공 시 200과 데이터를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getGenerationById = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createGeneration({ id: IDs.generationAlt }));
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ getGenerationById }),
    });

    const response = await app.request(`/api/generations/${IDs.generationAlt}`);
    expect(response.status).toBe(200);
    const body = await readJson<{ data: { id: string } }>(response);
    expect(body.data.id).toBe(IDs.generationAlt);
  });

  it("manager는 generation 수정 권한이 없어 403을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateGeneration = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createGeneration());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateGeneration }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateGeneration).not.toHaveBeenCalled();
  });

  it("generation 수정 본문이 비어 있으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("vice_president", IDs.vicePresident) });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("generation 수정 파라미터가 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("vice_president", IDs.vicePresident) });

    const response = await app.request("/api/generations/not-a-uuid", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("generation 수정 시 UNIQUE 충돌은 409를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateGeneration = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      throw new Error("unique index violated");
    });
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ updateGeneration }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sortOrder: 99 }),
    });

    expect(response.status).toBe(409);
    await expectErrorCode(response, "CONFLICT");
  });

  it("generation 수정 시 알 수 없는 오류는 500을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateGeneration = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      throw new Error("unexpected");
    });
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ updateGeneration }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sortOrder: 99 }),
    });

    expect(response.status).toBe(500);
    await expectErrorCode(response, "INTERNAL_ERROR");
  });

  it("존재하지 않는 generation 수정은 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateGeneration = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ updateGeneration }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("generation 수정 성공 시 200을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateGeneration = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createGeneration({ name: "updated" }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ updateGeneration }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("updated");
  });

  it("vice_president는 generation 삭제 권한이 없어 403을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteGeneration = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ deleteGeneration }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteGeneration).not.toHaveBeenCalled();
  });

  it("generation 삭제 파라미터가 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("president", IDs.president) });

    const response = await app.request("/api/generations/not-a-uuid", {
      method: "DELETE",
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 generation 삭제는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteGeneration = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => false);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ deleteGeneration }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("generation 삭제 성공 시 204를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteGeneration = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ deleteGeneration }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteGeneration).toHaveBeenCalledWith(IDs.generation);
  });

  it("인증되지 않은 요청은 generation 관련 엔드포인트에서 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const requests: Array<{
      path: string;
      method?: "POST" | "PATCH" | "DELETE";
      body?: unknown;
    }> = [
      { path: "/api/generations" },
      {
        path: "/api/generations",
        method: "POST",
        body: {
          name: "11기",
          sortOrder: 11,
          startDate: Date.parse("2031-01-01T00:00:00.000Z"),
          endDate: Date.parse("2031-12-31T00:00:00.000Z"),
        },
      },
      { path: `/api/generations/${IDs.generation}` },
      {
        path: `/api/generations/${IDs.generation}`,
        method: "PATCH",
        body: { name: "updated" },
      },
      { path: `/api/generations/${IDs.generation}`, method: "DELETE" },
    ];

    for (const request of requests) {
      const response = await app.request(request.path, {
        method: request.method,
        headers: request.body ? { "content-type": "application/json" } : undefined,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      expect(response.status).toBe(401);
      await expectErrorCode(response, "UNAUTHORIZED");
    }
  });

  it("unverified 사용자는 generation 목록/상세 조회 권한이 없어 403을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("unverified", IDs.otherUuid) });

    const listResponse = await app.request("/api/generations");
    expect(listResponse.status).toBe(403);
    await expectErrorCode(listResponse, "FORBIDDEN");

    const detailResponse = await app.request(`/api/generations/${IDs.generation}`);
    expect(detailResponse.status).toBe(403);
    await expectErrorCode(detailResponse, "FORBIDDEN");
  });
});
