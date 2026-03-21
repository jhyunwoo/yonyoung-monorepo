import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createLinktree,
  createLinktreeItem,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("linktree routes", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("member 계열 사용자는 링크트리 목록 조회가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const listLinktrees = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => [createLinktree()]);
    const app = createTestApp({
      actor: createActor("associate_member"),
      dataService: createDataServiceMock({ listLinktrees }),
    });

    const response = await app.request("/api/linktree");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.linktree);
  });

  it("member 계열 사용자는 링크트리를 생성할 수 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createLinktreeMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createLinktree());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ createLinktree: createLinktreeMock }),
    });

    const response = await app.request("/api/linktree", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "new-linktree" }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(createLinktreeMock).not.toHaveBeenCalled();
  });

  it("링크트리 생성 본문이 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request("/api/linktree", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("manager는 링크트리를 생성할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createLinktreeMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createLinktree({ name: "new-linktree" }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ createLinktree: createLinktreeMock }),
    });

    const response = await app.request("/api/linktree", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "new-linktree" }),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("new-linktree");
    expect(createLinktreeMock).toHaveBeenCalledWith({ name: "new-linktree" });
  });

  it("vice_president는 링크트리를 생성할 수 있다", async () => {
    const createLinktreeMock = fn(async () =>
      createLinktree({ name: "vp-new-linktree" }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ createLinktree: createLinktreeMock }),
    });

    const response = await app.request("/api/linktree", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "vp-new-linktree" }),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("vp-new-linktree");
    expect(createLinktreeMock).toHaveBeenCalledWith({ name: "vp-new-linktree" });
  });

  it("링크트리 상세 조회에서 UUID가 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request("/api/linktree/not-a-uuid");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 링크트리 상세 조회는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getLinktreeById = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getLinktreeById }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(getLinktreeById).toHaveBeenCalledWith(IDs.linktree);
  });

  it("링크트리 상세 조회 성공 시 200을 반환한다", async () => {
    const getLinktreeById = fn(async () => createLinktree({ id: IDs.linktree }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getLinktreeById }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}`);
    expect(response.status).toBe(200);
    const body = await readJson<{ data: { id: string } }>(response);
    expect(body.data.id).toBe(IDs.linktree);
  });

  it("링크트리 수정 본문이 비어 있으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 링크트리 수정은 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateLinktree = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateLinktree }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("manager는 링크트리를 수정할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateLinktree = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createLinktree({ name: "updated" }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateLinktree }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("updated");
  });

  it("vice_president는 링크트리를 수정할 수 있다", async () => {
    const updateLinktree = fn(async () => createLinktree({ name: "vp-updated" }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ updateLinktree }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "vp-updated" }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("vp-updated");
    expect(updateLinktree).toHaveBeenCalledWith(IDs.linktree, {
      name: "vp-updated",
    });
  });

  it("member 계열 사용자는 링크트리 삭제 권한이 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteLinktree = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ deleteLinktree }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteLinktree).not.toHaveBeenCalled();
  });

  it("존재하지 않는 링크트리 삭제는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteLinktree = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => false);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteLinktree }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("manager는 링크트리를 삭제할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteLinktree = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteLinktree }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteLinktree).toHaveBeenCalledWith(IDs.linktree);
  });

  it("member 계열 사용자는 링크 아이템 추가가 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const addLinktreeItem = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createLinktreeItem());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ addLinktreeItem }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "instagram",
        link: "https://instagram.com/test",
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(addLinktreeItem).not.toHaveBeenCalled();
  });

  it("링크 아이템 생성 본문이 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(`/api/linktree/${IDs.linktree}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "", link: "not-url" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("상위 링크트리가 없으면 링크 아이템 생성 시 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const addLinktreeItem = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ addLinktreeItem }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "instagram",
        link: "https://instagram.com/test",
      }),
    });

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("링크트리");
  });

  it("manager는 링크 아이템을 생성할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const addLinktreeItem = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createLinktreeItem());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ addLinktreeItem }),
    });

    const payload = {
      name: "instagram",
      link: "https://instagram.com/test",
    };

    const response = await app.request(`/api/linktree/${IDs.linktree}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { id: string } }>(response);
    expect(body.data.id).toBe(IDs.linktreeItem);
    expect(addLinktreeItem).toHaveBeenCalledWith(IDs.linktree, payload);
  });

  it("vice_president는 링크 아이템을 생성할 수 있다", async () => {
    const addLinktreeItem = fn(async () =>
      createLinktreeItem({ name: "vp-instagram" }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ addLinktreeItem }),
    });

    const payload = {
      name: "vp-instagram",
      link: "https://instagram.com/vp",
    };

    const response = await app.request(`/api/linktree/${IDs.linktree}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("vp-instagram");
    expect(addLinktreeItem).toHaveBeenCalledWith(IDs.linktree, payload);
  });

  it("링크 아이템 수정 본문이 비어 있으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 링크 아이템 수정은 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateLinktreeItem = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateLinktreeItem }),
    });

    const response = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "updated" }),
      },
    );

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("링크 아이템");
  });

  it("manager는 링크 아이템을 수정할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateLinktreeItem = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createLinktreeItem({ name: "updated" }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateLinktreeItem }),
    });

    const payload = { name: "updated" };
    const response = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("updated");
    expect(updateLinktreeItem).toHaveBeenCalledWith(
      IDs.linktree,
      IDs.linktreeItem,
      payload,
    );
  });

  it("vice_president는 링크 아이템을 수정할 수 있다", async () => {
    const updateLinktreeItem = fn(async () =>
      createLinktreeItem({ name: "vp-updated-item" }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ updateLinktreeItem }),
    });

    const payload = { name: "vp-updated-item" };
    const response = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("vp-updated-item");
    expect(updateLinktreeItem).toHaveBeenCalledWith(
      IDs.linktree,
      IDs.linktreeItem,
      payload,
    );
  });

  it("member 계열 사용자는 링크 아이템 삭제가 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteLinktreeItem = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ deleteLinktreeItem }),
    });

    const response = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteLinktreeItem).not.toHaveBeenCalled();
  });

  it("존재하지 않는 링크 아이템 삭제는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteLinktreeItem = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => false);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteLinktreeItem }),
    });

    const response = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("링크 아이템");
  });

  it("manager는 링크 아이템을 삭제할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteLinktreeItem = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteLinktreeItem }),
    });

    const response = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(204);
    expect(deleteLinktreeItem).toHaveBeenCalledWith(IDs.linktree, IDs.linktreeItem);
  });

  it("인증되지 않은 요청은 링크트리 관련 엔드포인트에서 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const requests: Array<{
      path: string;
      method?: "POST" | "PATCH" | "DELETE";
      body?: unknown;
    }> = [
      { path: "/api/linktree" },
      {
        path: "/api/linktree",
        method: "POST",
        body: { name: "new-linktree" },
      },
      { path: `/api/linktree/${IDs.linktree}` },
      {
        path: `/api/linktree/${IDs.linktree}`,
        method: "PATCH",
        body: { name: "updated" },
      },
      { path: `/api/linktree/${IDs.linktree}`, method: "DELETE" },
      {
        path: `/api/linktree/${IDs.linktree}/items`,
        method: "POST",
        body: { name: "instagram", link: "https://instagram.com/test" },
      },
      {
        path: `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
        method: "PATCH",
        body: { name: "updated" },
      },
      {
        path: `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
        method: "DELETE",
      },
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

  it("unverified 사용자는 링크트리 목록/상세 조회 권한이 없어 403을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("unverified", IDs.otherUuid) });

    const listResponse = await app.request("/api/linktree");
    expect(listResponse.status).toBe(403);
    await expectErrorCode(listResponse, "FORBIDDEN");

    const detailResponse = await app.request(`/api/linktree/${IDs.linktree}`);
    expect(detailResponse.status).toBe(403);
    await expectErrorCode(detailResponse, "FORBIDDEN");
  });

  it("링크트리 수정 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request("/api/linktree/not-a-uuid", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("링크트리 삭제 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request("/api/linktree/not-a-uuid", {
      method: "DELETE",
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("member 계열 사용자는 링크트리 수정 권한이 없어 403을 반환한다", async () => {
    const updateLinktree = fn(async () => createLinktree());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ updateLinktree }),
    });

    const response = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateLinktree).not.toHaveBeenCalled();
  });

  it("링크 아이템 생성/수정/삭제 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const createResponse = await app.request("/api/linktree/not-a-uuid/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "instagram",
        link: "https://instagram.com/test",
      }),
    });
    expect(createResponse.status).toBe(400);
    await expectErrorCode(createResponse, "BAD_REQUEST");

    const patchResponse = await app.request(
      `/api/linktree/${IDs.linktree}/items/not-a-uuid`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "updated" }),
      },
    );
    expect(patchResponse.status).toBe(400);
    await expectErrorCode(patchResponse, "BAD_REQUEST");

    const deleteResponse = await app.request(
      `/api/linktree/${IDs.linktree}/items/not-a-uuid`,
      { method: "DELETE" },
    );
    expect(deleteResponse.status).toBe(400);
    await expectErrorCode(deleteResponse, "BAD_REQUEST");
  });

  it("member 계열 사용자는 링크 아이템 수정 권한이 없어 403을 반환한다", async () => {
    const updateLinktreeItem = fn(async () => createLinktreeItem());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ updateLinktreeItem }),
    });

    const response = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "updated" }),
      },
    );

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateLinktreeItem).not.toHaveBeenCalled();
  });

  it("링크트리/링크 아이템 수정 본문이 스키마와 맞지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const updateResponse = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(updateResponse.status).toBe(400);
    await expectErrorCode(updateResponse, "BAD_REQUEST");

    const updateItemResponse = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ link: "invalid-url" }),
      },
    );
    expect(updateItemResponse.status).toBe(400);
    await expectErrorCode(updateItemResponse, "BAD_REQUEST");
  });

  it("링크트리/링크 아이템 수정 본문이 JSON이 아니면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const updateResponse = await app.request(`/api/linktree/${IDs.linktree}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(updateResponse.status).toBe(400);
    expect(await updateResponse.text()).toContain("Malformed");

    const updateItemResponse = await app.request(
      `/api/linktree/${IDs.linktree}/items/${IDs.linktreeItem}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{",
      },
    );
    expect(updateItemResponse.status).toBe(400);
    expect(await updateItemResponse.text()).toContain("Malformed");
  });
});
