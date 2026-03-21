import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createTestApp,
  createUser,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("user routes additional coverage", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("legacy /users 경로는 /api/users로 308 리다이렉트한다", async () => {
    const app = createTestApp({ actor: createActor("vice_president", IDs.vicePresident) });

    const response = await app.request("/users?scope=all", { redirect: "manual" });

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("/api/users?scope=all");
  });

  it("legacy /users/:id 경로는 메서드를 유지한 채 /api/users/:id로 308 리다이렉트한다", async () => {
    const app = createTestApp({ actor: createActor("vice_president", IDs.vicePresident) });

    const response = await app.request(`/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
      redirect: "manual",
    });

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`/api/users/${IDs.member}`);
  });

  it("admin 권한 사용자는 users 목록 전체 조회가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const listUsers = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => [
      createUser({ id: IDs.member, role: "regular_member" }),
      createUser({ id: IDs.manager, role: "manager" }),
    ]);
    const getUserById = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser({ id: IDs.vicePresident }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ listUsers, getUserById }),
    });

    const response = await app.request("/api/users");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data).toHaveLength(2);
    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("인증 사용자는 /api/users/me에서 본인 프로필을 조회할 수 있다", async () => {
    const actorId = "user|member-0001";
    const me = createUser({ id: actorId, role: "regular_member" });
    const getUserById = fn(async () => me);
    const app = createTestApp({
      actor: createActor("regular_member", actorId),
      dataService: createDataServiceMock({ getUserById }),
    });

    const response = await app.request("/api/users/me");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: { id: string } }>(response);
    expect(body.data.id).toBe(actorId);
    expect(getUserById).toHaveBeenCalledWith(actorId);
  });

  it("인증되지 않은 요청은 /api/users/me에서 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });

    const response = await app.request("/api/users/me");
    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
  });

  it("member 계열 사용자의 본인 조회(list users fallback)에서 본인이 없으면 404", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getUserById = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      dataService: createDataServiceMock({ getUserById }),
    });

    const response = await app.request("/api/users");
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(getUserById).toHaveBeenCalledWith(IDs.member);
  });

  it("member 계열 사용자의 본인 상세 조회 대상이 없으면 404", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getUserById = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      dataService: createDataServiceMock({ getUserById }),
    });

    const response = await app.request(`/api/users/${IDs.member}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("admin 사용자 수정 본문이 비어 있으면 400", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateUser = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser({ id: IDs.otherUser }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser({ id: IDs.otherUser, role: "regular_member" })),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("admin 사용자 수정 대상이 없으면 404", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateUser = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser({ id: IDs.otherUser }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("admin은 다른 사용자를 삭제할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteUser = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.otherUser, role: "regular_member" })),
        deleteUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith(IDs.otherUser);
  });

  it("삭제 대상 사용자가 없으면 404", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteUser = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => false);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => null),
        deleteUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("vice_president는 회장 정보를 수정할 수 없다", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.president, role: "president" }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.president, role: "president" })),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.president}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated-president" }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("vice_president는 회장 계정을 삭제할 수 없다", async () => {
    const deleteUser = fn(async () => true);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.president, role: "president" })),
        countUsersByRole: fn(async () => 2),
        deleteUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.president}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("마지막 회장은 자기 계정을 삭제할 수 없다", async () => {
    const deleteUser = fn(async () => true);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.president, role: "president" })),
        countUsersByRole: fn(async () => 1),
        deleteUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.president}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("member 계열 사용자는 타인 계정을 삭제할 수 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteUser = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ deleteUser }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("admin 사용자 수정 role이 enum 외 값이면 400", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateUser = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser({ id: IDs.otherUser }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createUser({ id: IDs.otherUser })),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "member" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("인증되지 않은 요청은 users 엔드포인트에서 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const requests: Array<{
      path: string;
      method?: "PATCH" | "DELETE";
      body?: unknown;
    }> = [
      { path: "/api/users" },
      { path: `/api/users/${IDs.otherUser}` },
      {
        path: `/api/users/${IDs.otherUser}`,
        method: "PATCH",
        body: { name: "updated" },
      },
      { path: `/api/users/${IDs.otherUser}`, method: "DELETE" },
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

  it("unverified 사용자는 users 목록/상세 조회 권한이 없어 403을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("unverified", IDs.member) });

    const listResponse = await app.request("/api/users");
    expect(listResponse.status).toBe(403);
    await expectErrorCode(listResponse, "FORBIDDEN");

    const detailResponse = await app.request(`/api/users/${IDs.otherUser}`);
    expect(detailResponse.status).toBe(403);
    await expectErrorCode(detailResponse, "FORBIDDEN");
  });

  it("users 경로 파라미터에 허용되지 않은 문자가 포함되면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("vice_president", IDs.vicePresident) });
    const invalidPath = "/api/users/invalid%20id";

    const detailResponse = await app.request(invalidPath);
    expect(detailResponse.status).toBe(400);
    await expectErrorCode(detailResponse, "BAD_REQUEST");

    const patchResponse = await app.request(invalidPath, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });
    expect(patchResponse.status).toBe(400);
    await expectErrorCode(patchResponse, "BAD_REQUEST");

    const deleteResponse = await app.request(invalidPath, {
      method: "DELETE",
    });
    expect(deleteResponse.status).toBe(400);
    await expectErrorCode(deleteResponse, "BAD_REQUEST");
  });

  it("member 계열 사용자의 본인 수정 본문이 비어 있으면 400", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.member }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ updateUser }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("member 계열 사용자의 본인 수정 전화번호 형식이 잘못되면 400", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.member }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ updateUser }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phoneNumber: "01012345678" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("member 계열 사용자의 협업 가능 여부는 boolean만 허용한다", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.member }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ updateUser }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ collaborationAvailable: "true" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("member 계열 사용자는 협업 가능 여부와 개인 링크를 수정할 수 있다", async () => {
    const updateUser = fn(async () =>
      createUser({
        id: IDs.member,
        collaborationAvailable: true,
        personalLink: "https://example.com/me",
      }),
    );
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ updateUser }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        collaborationAvailable: true,
        personalLink: "https://example.com/me",
      }),
    });

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(IDs.member, {
      collaborationAvailable: true,
      personalLink: "https://example.com/me",
    });
  });

  it("member 계열 사용자는 대표 작품 사진 목록을 수정할 수 있다", async () => {
    const showcaseImageUrls = [
      "https://example.com/showcase-1.jpg",
      "https://example.com/showcase-2.jpg",
    ];
    const updateUser = fn(async () =>
      createUser({
        id: IDs.member,
        showcaseImageUrls,
      }),
    );
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ updateUser }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ showcaseImageUrls }),
    });

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(IDs.member, { showcaseImageUrls });
  });

  it("admin은 대표 작품 사진 목록을 수정할 수 있다", async () => {
    const showcaseImageUrls = [
      "https://example.com/admin-showcase-1.jpg",
      "https://example.com/admin-showcase-2.jpg",
    ];
    const updateUser = fn(async () =>
      createUser({
        id: IDs.otherUser,
        showcaseImageUrls,
      }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.otherUser, role: "regular_member" })),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ showcaseImageUrls }),
    });

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(IDs.otherUser, { showcaseImageUrls });
  });

  it("showcaseImageUrls가 10장을 초과하면 400을 반환한다", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.member }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ updateUser }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        showcaseImageUrls: Array.from(
          { length: 11 },
          (_, index) => `https://example.com/showcase-${index + 1}.jpg`,
        ),
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("showcaseImageUrls에 중복 URL이 포함되면 400을 반환한다", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.member }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ updateUser }),
    });

    const duplicateUrl = "https://example.com/showcase-duplicate.jpg";
    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        showcaseImageUrls: [duplicateUrl, duplicateUrl],
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("showcaseImageUrls에 잘못된 URL이 포함되면 400을 반환한다", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.member }));
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ updateUser }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        showcaseImageUrls: ["invalid-url"],
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("회장 1인 상태에서 회장 권한 하향은 400을 반환한다", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.president, role: "regular_member" }));
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.president, role: "president" })),
        countUsersByRole: fn(async () => 1),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.president}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "regular_member" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("admin 수정에서 update 대상이 사라지면 404를 반환한다", async () => {
    const updateUser = fn(async () => null);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.otherUser, role: "regular_member" })),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(updateUser).toHaveBeenCalled();
  });

  it("bulk-role 권한 일괄 변경은 vice_president에게 허용된다", async () => {
    const listUsersByIds = fn(async () => [
      createUser({ id: IDs.member, role: "regular_member" }),
      createUser({ id: IDs.otherUser, role: "associate_member" }),
    ]);
    const countUsersByRole = fn(async () => 1);
    const bulkUpdateUsersRole = fn(async () => [
      createUser({ id: IDs.member, role: "manager" }),
      createUser({ id: IDs.otherUser, role: "manager" }),
    ]);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        listUsersByIds,
        countUsersByRole,
        bulkUpdateUsersRole,
      }),
    });

    const response = await app.request("/api/users/bulk-role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userIds: [IDs.member, IDs.otherUser],
        role: "manager",
      }),
    });
    expect(response.status).toBe(200);
    const body = await readJson<{ data: Array<{ id: string; role: string | null }> }>(response);
    expect(body.data).toHaveLength(2);
    expect(bulkUpdateUsersRole).toHaveBeenCalledWith({
      userIds: [IDs.member, IDs.otherUser],
      role: "manager",
    });
    expect(listUsersByIds).toHaveBeenCalledWith([IDs.member, IDs.otherUser]);
    expect(countUsersByRole).toHaveBeenCalledWith("president");
  });

  it("bulk-role 요청에서 manager는 403을 반환한다", async () => {
    const bulkUpdateUsersRole = fn(async () => []);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        listUsers: fn(async () => [createUser({ id: IDs.member, role: "regular_member" })]),
        bulkUpdateUsersRole,
      }),
    });

    const response = await app.request("/api/users/bulk-role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userIds: [IDs.member],
        role: "regular_member",
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(bulkUpdateUsersRole).not.toHaveBeenCalled();
  });

  it("bulk-role 요청에서 회장은 다른 회장 권한을 변경할 수 없어 403을 반환한다", async () => {
    const bulkUpdateUsersRole = fn(async () => []);
    const listUsersByIds = fn(async () => [
      createUser({ id: IDs.otherUser, role: "president" }),
    ]);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        listUsersByIds,
        countUsersByRole: fn(async () => 2),
        bulkUpdateUsersRole,
      }),
    });

    const response = await app.request("/api/users/bulk-role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userIds: [IDs.otherUser],
        role: "regular_member",
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(bulkUpdateUsersRole).not.toHaveBeenCalled();
    expect(listUsersByIds).toHaveBeenCalledWith([IDs.otherUser]);
  });

  it("bulk-role 요청에서 대상 사용자 일부가 없으면 400을 반환한다", async () => {
    const bulkUpdateUsersRole = fn(async () => []);
    const listUsersByIds = fn(async () => [
      createUser({ id: IDs.member, role: "regular_member" }),
    ]);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        listUsersByIds,
        countUsersByRole: fn(async () => 1),
        bulkUpdateUsersRole,
      }),
    });

    const response = await app.request("/api/users/bulk-role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userIds: [IDs.member, IDs.otherUser],
        role: "regular_member",
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(bulkUpdateUsersRole).not.toHaveBeenCalled();
    expect(listUsersByIds).toHaveBeenCalledWith([IDs.member, IDs.otherUser]);
  });

  it("bulk-role 요청에서 회장 1인을 하향하면 400을 반환한다", async () => {
    const bulkUpdateUsersRole = fn(async () => []);
    const listUsersByIds = fn(async () => [
      createUser({ id: IDs.president, role: "president" }),
    ]);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        listUsersByIds,
        countUsersByRole: fn(async () => 1),
        bulkUpdateUsersRole,
      }),
    });

    const response = await app.request("/api/users/bulk-role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userIds: [IDs.president],
        role: "manager",
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(bulkUpdateUsersRole).not.toHaveBeenCalled();
    expect(listUsersByIds).toHaveBeenCalledWith([IDs.president]);
  });

  it("bulk-role 요청에서 vice_president는 회장을 대상으로 변경할 수 없다", async () => {
    const bulkUpdateUsersRole = fn(async () => []);
    const listUsersByIds = fn(async () => [
      createUser({ id: IDs.president, role: "president" }),
    ]);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        listUsersByIds,
        countUsersByRole: fn(async () => 2),
        bulkUpdateUsersRole,
      }),
    });

    const response = await app.request("/api/users/bulk-role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userIds: [IDs.president],
        role: "manager",
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(bulkUpdateUsersRole).not.toHaveBeenCalled();
    expect(listUsersByIds).toHaveBeenCalledWith([IDs.president]);
  });

  it("resource-history 조회는 부회장에게 허용되며 기본 page/pageSize를 사용한다", async () => {
    const listUserResourceHistory = fn(async () => ({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.member })),
        listUserResourceHistory,
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}/resource-history`);

    expect(response.status).toBe(200);
    const body = await readJson<{
      data: {
        items: unknown[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>(response);
    expect(body.data).toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });
    expect(listUserResourceHistory).toHaveBeenCalledWith({
      userId: IDs.member,
      page: 1,
      pageSize: 10,
      action: undefined,
    });
  });

  it("resource-history 조회는 회장에게 허용되며 page/pageSize/action 쿼리를 반영한다", async () => {
    const listUserResourceHistory = fn(async () => ({
      items: [],
      page: 2,
      pageSize: 15,
      total: 24,
      totalPages: 2,
    }));
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.member })),
        listUserResourceHistory,
      }),
    });

    const response = await app.request(
      `/api/users/${IDs.member}/resource-history?page=2&pageSize=15&action=create`,
    );

    expect(response.status).toBe(200);
    expect(listUserResourceHistory).toHaveBeenCalledWith({
      userId: IDs.member,
      page: 2,
      pageSize: 15,
      action: "create",
    });
  });

  it("resource-history 조회에서 manager는 403을 반환한다", async () => {
    const listUserResourceHistory = fn(async () => ({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        listUserResourceHistory,
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}/resource-history`);

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(listUserResourceHistory).not.toHaveBeenCalled();
  });

  it("resource-history 조회에서 사용자 ID 형식이 잘못되면 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
    });

    const response = await app.request("/api/users/invalid%20id/resource-history");

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("resource-history 조회에서 대상 사용자가 없으면 404를 반환한다", async () => {
    const listUserResourceHistory = fn(async () => ({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => null),
        listUserResourceHistory,
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}/resource-history`);

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(listUserResourceHistory).not.toHaveBeenCalled();
  });

  it("resource-history 조회에서 pageSize가 범위를 벗어나면 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.member })),
      }),
    });

    const response = await app.request(
      `/api/users/${IDs.member}/resource-history?pageSize=101`,
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });
});
