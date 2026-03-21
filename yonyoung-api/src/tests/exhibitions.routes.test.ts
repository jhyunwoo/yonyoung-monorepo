import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createExhibition,
  createExhibitionImage,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("exhibition routes", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("member 계열 사용자는 전시 목록 조회가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const listExhibitions = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => [createExhibition()]);
    const app = createTestApp({
      actor: createActor("new_member"),
      dataService: createDataServiceMock({ listExhibitions }),
    });

    const response = await app.request("/api/exhibitions");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string; startDate: number }> }>(
      response,
    );
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.exhibition);
    expect(typeof body.data[0]?.startDate).toBe("number");
    expect(listExhibitions).toHaveBeenCalledWith(undefined);
  });

  it("전시 목록은 generationId 쿼리를 전달해 서버 필터링할 수 있다", async () => {
    const listExhibitions = fn(async () => [createExhibition()]);
    const app = createTestApp({
      actor: createActor("new_member"),
      dataService: createDataServiceMock({ listExhibitions }),
    });

    const response = await app.request(
      `/api/exhibitions?generationId=${encodeURIComponent(IDs.generation)}`,
    );

    expect(response.status).toBe(200);
    expect(listExhibitions).toHaveBeenCalledWith(IDs.generation);
  });

  it("전시 목록 generationId 쿼리가 UUID 형식이 아니면 400을 반환한다", async () => {
    const listExhibitions = fn(async () => [createExhibition()]);
    const app = createTestApp({
      actor: createActor("new_member"),
      dataService: createDataServiceMock({ listExhibitions }),
    });

    const response = await app.request("/api/exhibitions?generationId=invalid");

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(listExhibitions).not.toHaveBeenCalled();
  });

  it("전시 목록 응답의 설명 HTML은 sanitize 된다", async () => {
    const listExhibitions = fn(async () => [
      createExhibition({
        description:
          '<h2>정상</h2><script>alert("xss")</script><p onclick="evil()">본문</p>',
      }),
    ]);
    const app = createTestApp({
      actor: createActor("new_member"),
      dataService: createDataServiceMock({ listExhibitions }),
    });

    const response = await app.request("/api/exhibitions");
    expect(response.status).toBe(200);
    const body = await readJson<{ data: Array<{ description: string }> }>(response);
    const description = body.data[0]?.description ?? "";

    expect(description).toContain("<h2>정상</h2>");
    expect(description).toContain("<p>본문</p>");
    expect(description).not.toContain("<script");
    expect(description).not.toContain("onclick=");
  });

  it("member 계열 사용자는 전시 생성 권한이 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createExhibitionMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createExhibition());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ createExhibition: createExhibitionMock }),
    });

    const response = await app.request("/api/exhibitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "신규 전시",
        startDate: Date.parse("2031-01-01T00:00:00.000Z"),
        endDate: Date.parse("2031-01-10T00:00:00.000Z"),
        generationId: IDs.generation,
        place: "갤러리",
        coverImageUrl: "https://example.com/exhibition-cover.jpg",
        description: "설명",
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(createExhibitionMock).not.toHaveBeenCalled();
  });

  it("전시 생성 본문이 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request("/api/exhibitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "",
        startDate: "invalid",
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("manager는 전시를 생성할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createExhibitionMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createExhibition({ title: "new-exhibition" }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ createExhibition: createExhibitionMock }),
    });

    const payload = {
      title: "new-exhibition",
      startDate: Date.parse("2031-01-01T00:00:00.000Z"),
      endDate: Date.parse("2031-01-10T00:00:00.000Z"),
      generationId: IDs.generation,
      place: "갤러리",
      coverImageUrl: "https://example.com/exhibition-cover.jpg",
      description: "설명",
    };

    const response = await app.request("/api/exhibitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { title: string } }>(response);
    expect(body.data.title).toBe("new-exhibition");
    expect(createExhibitionMock).toHaveBeenCalledWith(payload);
  });

  it("vice_president는 전시를 생성할 수 있다", async () => {
    const createExhibitionMock = fn(async () =>
      createExhibition({ title: "vp-new-exhibition" }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ createExhibition: createExhibitionMock }),
    });

    const payload = {
      title: "vp-new-exhibition",
      startDate: Date.parse("2031-01-01T00:00:00.000Z"),
      endDate: Date.parse("2031-01-10T00:00:00.000Z"),
      generationId: IDs.generation,
      place: "갤러리",
      coverImageUrl: "https://example.com/exhibition-cover.jpg",
      description: "설명",
    };

    const response = await app.request("/api/exhibitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { title: string } }>(response);
    expect(body.data.title).toBe("vp-new-exhibition");
    expect(createExhibitionMock).toHaveBeenCalledWith(payload);
  });

  it("전시 생성 시 설명 HTML을 sanitize 하고 빈 본문을 차단한다", async () => {
    const createExhibitionMock = fn(async (input: { description: string }) =>
      createExhibition({ description: input.description }),
    );
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ createExhibition: createExhibitionMock }),
    });

    const payload = {
      title: "rich-exhibition",
      startDate: Date.parse("2031-01-01T00:00:00.000Z"),
      endDate: Date.parse("2031-01-10T00:00:00.000Z"),
      generationId: IDs.generation,
      place: "갤러리",
      coverImageUrl: "https://example.com/exhibition-cover.jpg",
      description:
        '<h2>섹션</h2><script>alert(1)</script><p onclick="evil()">본문</p><a href="javascript:alert(1)">bad</a>',
    };

    const response = await app.request("/api/exhibitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { description: string } }>(response);
    const description = body.data.description;
    expect(description).toContain("<h2>섹션</h2>");
    expect(description).toContain("<p>본문</p>");
    expect(description).not.toContain("<script");
    expect(description).not.toContain("onclick=");
    expect(description).not.toContain("javascript:");
    expect(createExhibitionMock).toHaveBeenCalledWith({
      ...payload,
      description,
    });

    const emptyDescriptionResponse = await app.request("/api/exhibitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        description: "<p><br></p>",
      }),
    });
    expect(emptyDescriptionResponse.status).toBe(400);
    await expectErrorCode(emptyDescriptionResponse, "BAD_REQUEST");
    expect(createExhibitionMock).toHaveBeenCalledTimes(1);
  });

  it("전시 상세 조회에서 UUID가 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request("/api/exhibitions/not-a-uuid");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 전시 상세 조회는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getExhibitionById = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getExhibitionById }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(getExhibitionById).toHaveBeenCalledWith(IDs.exhibition);
  });

  it("전시 상세 조회 성공 시 200을 반환한다", async () => {
    const getExhibitionById = fn(async () =>
      createExhibition({ id: IDs.exhibition }),
    );
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getExhibitionById }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`);
    expect(response.status).toBe(200);
    const body = await readJson<{ data: { id: string } }>(response);
    expect(body.data.id).toBe(IDs.exhibition);
  });

  it("전시 수정 본문이 비어 있으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 전시 수정은 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateExhibition = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateExhibition }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "updated" }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("manager는 전시를 수정할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateExhibition = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createExhibition({ title: "updated" }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateExhibition }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "updated" }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { title: string } }>(response);
    expect(body.data.title).toBe("updated");
  });

  it("vice_president는 전시를 수정할 수 있다", async () => {
    const updateExhibition = fn(async () => createExhibition({ title: "vp-updated" }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ updateExhibition }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "vp-updated" }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { title: string } }>(response);
    expect(body.data.title).toBe("vp-updated");
    expect(updateExhibition).toHaveBeenCalledWith(IDs.exhibition, {
      title: "vp-updated",
    });
  });

  it("manager는 전시 삭제 권한이 없어 403을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteExhibition = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteExhibition }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteExhibition).not.toHaveBeenCalled();
  });

  it("vice_president는 전시 삭제 권한이 없어 403을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteExhibition = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ deleteExhibition }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteExhibition).not.toHaveBeenCalled();
  });

  it("president는 전시를 삭제할 수 있다", async () => {
    const deleteExhibition = fn(async () => true);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ deleteExhibition }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteExhibition).toHaveBeenCalledWith(IDs.exhibition);
  });

  it("전시 상세 이미지 추가 시 상위 전시가 없으면 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const addExhibitionImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ addExhibitionImage }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}/images`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://example.com/exhibition-detail.jpg",
        sortOrder: 0,
      }),
    });

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("전시");
  });

  it("manager는 전시 상세 이미지를 추가할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const addExhibitionImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createExhibitionImage());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ addExhibitionImage }),
    });

    const payload = {
      imageUrl: "https://example.com/exhibition-detail.jpg",
      sortOrder: 0,
    };

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}/images`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { id: string } }>(response);
    expect(body.data.id).toBe(IDs.exhibitionImage);
    expect(addExhibitionImage).toHaveBeenCalledWith(IDs.exhibition, payload);
  });

  it("manager는 전시 상세 이미지를 일괄 추가할 수 있다", async () => {
    const addExhibitionImages = fn(async () => [
      createExhibitionImage({ id: IDs.exhibitionImage }),
      createExhibitionImage({
        id: "41000000-0000-4000-8000-000000000002",
        sortOrder: 1,
      }),
    ]);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ addExhibitionImages }),
    });

    const payload = [
      { imageUrl: "https://example.com/exhibition-detail-1.jpg", sortOrder: 0 },
      { imageUrl: "https://example.com/exhibition-detail-2.jpg", sortOrder: 1 },
    ];
    const response = await app.request(`/api/exhibitions/${IDs.exhibition}/images/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data).toHaveLength(2);
    expect(addExhibitionImages).toHaveBeenCalledWith(IDs.exhibition, payload);
  });

  it("전시 상세 이미지 일괄 추가 시 상위 전시가 없으면 404를 반환한다", async () => {
    const addExhibitionImages = fn(async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ addExhibitionImages }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}/images/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([
        { imageUrl: "https://example.com/exhibition-detail-1.jpg", sortOrder: 0 },
      ]),
    });

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("전시");
  });

  it("전시 상세 이미지 수정 본문이 비어 있으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 전시 상세 이미지 수정은 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateExhibitionImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateExhibitionImage }),
    });

    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: 2 }),
      },
    );

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("세부 이미지");
  });

  it("manager는 전시 상세 이미지를 수정할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateExhibitionImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createExhibitionImage({ sortOrder: 2 }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateExhibitionImage }),
    });

    const payload = { sortOrder: 2 };
    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { sortOrder: number } }>(response);
    expect(body.data.sortOrder).toBe(2);
    expect(updateExhibitionImage).toHaveBeenCalledWith(
      IDs.exhibition,
      IDs.exhibitionImage,
      payload,
    );
  });

  it("manager는 전시 상세 이미지를 일괄 수정할 수 있다", async () => {
    const updateExhibitionImages = fn(async () => [
      createExhibitionImage({ id: IDs.exhibitionImage, sortOrder: 2 }),
      createExhibitionImage({
        id: "41000000-0000-4000-8000-000000000002",
        sortOrder: 3,
      }),
    ]);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateExhibitionImages }),
    });

    const payload = [
      { imageId: IDs.exhibitionImage, sortOrder: 2 },
      {
        imageId: "41000000-0000-4000-8000-000000000002",
        sortOrder: 3,
      },
    ];
    const response = await app.request(`/api/exhibitions/${IDs.exhibition}/images/batch`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: Array<{ sortOrder: number }> }>(response);
    expect(body.data.map((item) => item.sortOrder)).toEqual([2, 3]);
    expect(updateExhibitionImages).toHaveBeenCalledWith(IDs.exhibition, payload);
  });

  it("전시 상세 이미지 일괄 수정 대상이 없으면 404를 반환한다", async () => {
    const updateExhibitionImages = fn(async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateExhibitionImages }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}/images/batch`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ imageId: IDs.exhibitionImage, sortOrder: 1 }]),
    });

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("세부 이미지");
  });

  it("manager는 전시 상세 이미지를 삭제할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteExhibitionImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteExhibitionImage }),
    });

    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(204);
    expect(deleteExhibitionImage).toHaveBeenCalledWith(
      IDs.exhibition,
      IDs.exhibitionImage,
    );
  });

  it("존재하지 않는 전시 상세 이미지 삭제는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteExhibitionImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => false);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ deleteExhibitionImage }),
    });

    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("세부 이미지");
  });

  it("vice_president는 전시 상세 이미지를 삭제할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteExhibitionImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ deleteExhibitionImage }),
    });

    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(204);
    expect(deleteExhibitionImage).toHaveBeenCalledWith(
      IDs.exhibition,
      IDs.exhibitionImage,
    );
  });

  it("regular_member는 전시 상세 이미지 삭제 권한이 없어 403을 반환한다", async () => {
    const deleteExhibitionImage = fn(async () => true);
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ deleteExhibitionImage }),
    });

    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteExhibitionImage).not.toHaveBeenCalled();
  });

  it("인증되지 않은 요청은 전시 관련 엔드포인트에서 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const requests: Array<{
      path: string;
      method?: "POST" | "PATCH" | "DELETE";
      body?: unknown;
    }> = [
      { path: "/api/exhibitions" },
      {
        path: "/api/exhibitions",
        method: "POST",
        body: {
          title: "신규 전시",
          startDate: Date.parse("2031-01-01T00:00:00.000Z"),
          endDate: Date.parse("2031-01-10T00:00:00.000Z"),
          generationId: IDs.generation,
          place: "갤러리",
          coverImageUrl: "https://example.com/exhibition-cover.jpg",
          description: "설명",
        },
      },
      { path: `/api/exhibitions/${IDs.exhibition}` },
      {
        path: `/api/exhibitions/${IDs.exhibition}`,
        method: "PATCH",
        body: { title: "updated" },
      },
      { path: `/api/exhibitions/${IDs.exhibition}`, method: "DELETE" },
      {
        path: `/api/exhibitions/${IDs.exhibition}/images`,
        method: "POST",
        body: { imageUrl: "https://example.com/exhibition-detail.jpg", sortOrder: 0 },
      },
      {
        path: `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
        method: "PATCH",
        body: { sortOrder: 2 },
      },
      {
        path: `/api/exhibitions/${IDs.exhibition}/images/batch`,
        method: "POST",
        body: [{ imageUrl: "https://example.com/exhibition-detail.jpg", sortOrder: 0 }],
      },
      {
        path: `/api/exhibitions/${IDs.exhibition}/images/batch`,
        method: "PATCH",
        body: [{ imageId: IDs.exhibitionImage, sortOrder: 2 }],
      },
      {
        path: `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
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

  it("unverified 사용자는 전시 목록/상세 조회 권한이 없어 403을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("unverified", IDs.otherUuid) });

    const listResponse = await app.request("/api/exhibitions");
    expect(listResponse.status).toBe(403);
    await expectErrorCode(listResponse, "FORBIDDEN");

    const detailResponse = await app.request(`/api/exhibitions/${IDs.exhibition}`);
    expect(detailResponse.status).toBe(403);
    await expectErrorCode(detailResponse, "FORBIDDEN");
  });

  it("전시 수정 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request("/api/exhibitions/not-a-uuid", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "updated" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("전시 삭제 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("president", IDs.president) });
    const response = await app.request("/api/exhibitions/not-a-uuid", {
      method: "DELETE",
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("member 계열 사용자는 전시 수정 권한이 없어 403을 반환한다", async () => {
    const updateExhibition = fn(async () => createExhibition());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ updateExhibition }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "updated" }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateExhibition).not.toHaveBeenCalled();
  });

  it("전시 상세 이미지 생성/수정/삭제 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const createResponse = await app.request("/api/exhibitions/not-a-uuid/images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://example.com/exhibition-detail.jpg",
        sortOrder: 0,
      }),
    });
    expect(createResponse.status).toBe(400);
    await expectErrorCode(createResponse, "BAD_REQUEST");

    const patchResponse = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/not-a-uuid`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: 1 }),
      },
    );
    expect(patchResponse.status).toBe(400);
    await expectErrorCode(patchResponse, "BAD_REQUEST");

    const deleteResponse = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/not-a-uuid`,
      { method: "DELETE" },
    );
    expect(deleteResponse.status).toBe(400);
    await expectErrorCode(deleteResponse, "BAD_REQUEST");

    const batchCreateResponse = await app.request("/api/exhibitions/not-a-uuid/images/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ imageUrl: "https://example.com/exhibition-detail.jpg", sortOrder: 0 }]),
    });
    expect(batchCreateResponse.status).toBe(400);
    await expectErrorCode(batchCreateResponse, "BAD_REQUEST");

    const batchUpdateResponse = await app.request("/api/exhibitions/not-a-uuid/images/batch", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ imageId: IDs.exhibitionImage, sortOrder: 1 }]),
    });
    expect(batchUpdateResponse.status).toBe(400);
    await expectErrorCode(batchUpdateResponse, "BAD_REQUEST");
  });

  it("member 계열 사용자는 전시 상세 이미지 수정 권한이 없어 403을 반환한다", async () => {
    const updateExhibitionImage = fn(async () => createExhibitionImage());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ updateExhibitionImage }),
    });

    const response = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: 2 }),
      },
    );

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateExhibitionImage).not.toHaveBeenCalled();
  });

  it("전시/전시 이미지 수정 본문이 스키마와 맞지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const updateResponse = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startDate: "invalid" }),
    });
    expect(updateResponse.status).toBe(400);
    await expectErrorCode(updateResponse, "BAD_REQUEST");

    const updateImageResponse = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageUrl: "invalid-url" }),
      },
    );
    expect(updateImageResponse.status).toBe(400);
    await expectErrorCode(updateImageResponse, "BAD_REQUEST");
  });

  it("전시 수정 시 빈 설명 HTML은 400을 반환한다", async () => {
    const updateExhibition = fn(async () => createExhibition());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateExhibition }),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "<p><br></p>" }),
    });
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateExhibition).not.toHaveBeenCalled();
  });

  it("전시/전시 이미지 수정 본문이 JSON이 아니면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const updateResponse = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(updateResponse.status).toBe(400);
    expect(await updateResponse.text()).toContain("Malformed");

    const updateImageResponse = await app.request(
      `/api/exhibitions/${IDs.exhibition}/images/${IDs.exhibitionImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{",
      },
    );
    expect(updateImageResponse.status).toBe(400);
    expect(await updateImageResponse.text()).toContain("Malformed");
  });
});
