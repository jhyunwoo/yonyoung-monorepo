import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createGenerationNotice,
  createGlobalNotice,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("notices routes", () => {
  it("인증되지 않은 사용자는 notice 엔드포인트 접근 시 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });

    const scenarios = [
      {
        path: `/api/generations/${IDs.generation}/notices`,
        init: undefined,
      },
      {
        path: `/api/generations/${IDs.generation}/notices`,
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "공지", content: "본문" }),
        },
      },
      {
        path: `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
        init: undefined,
      },
      {
        path: `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
        init: {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "수정" }),
        },
      },
      {
        path: `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
        init: { method: "DELETE" },
      },
      {
        path: "/api/global-notices",
        init: undefined,
      },
      {
        path: "/api/global-notices",
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "전체 공지", content: "본문" }),
        },
      },
      {
        path: `/api/global-notices/${IDs.globalNotice}`,
        init: undefined,
      },
      {
        path: `/api/global-notices/${IDs.globalNotice}`,
        init: {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "수정" }),
        },
      },
      {
        path: `/api/global-notices/${IDs.globalNotice}`,
        init: { method: "DELETE" },
      },
    ] as const;

    for (const scenario of scenarios) {
      const response = await app.request(scenario.path, scenario.init);
      expect(response.status).toBe(401);
      await expectErrorCode(response, "UNAUTHORIZED");
    }
  });

  it("member 계열 사용자는 기수 공지 목록 조회가 가능하다", async () => {
    const listGenerationNotices = fn(async () => [createGenerationNotice()]);
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ listGenerationNotices }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices`,
    );
    expect(response.status).toBe(200);

    const body = await readJson<{
      data: Array<{
        id: string;
        author: { familyName: string | null; givenName: string | null };
      }>;
    }>(response);
    expect(body.data[0]?.id).toBe(IDs.generationNotice);
    expect(body.data[0]?.author.familyName).toBeNull();
    expect(body.data[0]?.author.givenName).toBeNull();
    expect(listGenerationNotices).toHaveBeenCalledWith(IDs.generation);
  });

  it("unverified 사용자는 기수 공지 목록 조회 권한이 없다", async () => {
    const app = createTestApp({ actor: createActor("unverified", IDs.member) });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices`,
    );
    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
  });

  it("member 계열 사용자는 기수 공지를 생성할 수 없다", async () => {
    const createGenerationNoticeMock = fn(async () => createGenerationNotice());
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      dataService: createDataServiceMock({
        createGenerationNotice: createGenerationNoticeMock,
      }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "공지",
          content: "본문",
        }),
      },
    );

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(createGenerationNoticeMock).not.toHaveBeenCalled();
  });

  it("manager는 기수 공지를 이미지와 함께 생성할 수 있다", async () => {
    const createGenerationNoticeMock = fn(async () =>
      createGenerationNotice({
        title: "생성 공지",
        imageUrls: ["https://example.com/notice-image-1.png"],
        author: {
          id: IDs.manager,
          name: "manager-name",
          familyName: null,
          givenName: null,
          image: null,
          role: "manager",
        },
      }),
    );
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        createGenerationNotice: createGenerationNoticeMock,
      }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "생성 공지",
          content: "공지 본문",
          imageUrls: ["https://example.com/notice-image-1.png"],
        }),
      },
    );

    expect(response.status).toBe(201);
    const body = await readJson<{
      data: {
        title: string;
        author: {
          id: string;
          familyName: string | null;
          givenName: string | null;
        };
        imageUrls: string[];
      };
    }>(response);
    expect(body.data.title).toBe("생성 공지");
    expect(body.data.author.id).toBe(IDs.manager);
    expect(body.data.author.familyName).toBeNull();
    expect(body.data.author.givenName).toBeNull();
    expect(body.data.imageUrls).toEqual([
      "https://example.com/notice-image-1.png",
    ]);
    expect(createGenerationNoticeMock).toHaveBeenCalledWith(IDs.generation, {
      title: "생성 공지",
      content: "공지 본문",
      imageUrls: ["https://example.com/notice-image-1.png"],
      authorId: IDs.manager,
    });
  });

  it("기수 공지 생성 본문이 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "", content: "" }),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("기수 공지 생성에서 imageUrls에 잘못된 URL이 있으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "공지",
          content: "본문",
          imageUrls: ["not-a-url"],
        }),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("기수 공지 생성에서 imageUrls가 10장을 초과하면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const tooManyUrls = Array.from(
      { length: 11 },
      (_, index) => `https://example.com/image-${index}.png`,
    );

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "공지",
          content: "본문",
          imageUrls: tooManyUrls,
        }),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("기수 공지 생성에서 중복 imageUrls가 있으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "공지",
          content: "본문",
          imageUrls: [
            "https://example.com/image-1.png",
            "https://example.com/image-1.png",
          ],
        }),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 기수 공지 생성은 404를 반환한다", async () => {
    const createGenerationNoticeMock = fn(async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        createGenerationNotice: createGenerationNoticeMock,
      }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "생성 공지",
          content: "공지 본문",
        }),
      },
    );

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("기수 공지 상세에서 UUID가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/not-a-uuid`,
    );
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("기수 공지 상세가 없으면 404를 반환한다", async () => {
    const getGenerationNoticeById = fn(async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getGenerationNoticeById }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
    );

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("manager는 기수 공지 상세를 조회할 수 있고 본문은 sanitize 된다", async () => {
    const getGenerationNoticeById = fn(async () =>
      createGenerationNotice({
        content: `<p>기수 공지<script>alert('xss')</script></p>`,
      }),
    );
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getGenerationNoticeById }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
    );

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { content: string } }>(response);
    expect(body.data.content).toContain("<p>기수 공지</p>");
    expect(body.data.content).not.toContain("<script");
  });

  it("기수 공지 수정 요청 본문이 비어있으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("manager는 기수 공지를 이미지와 함께 수정할 수 있다", async () => {
    const updateGenerationNotice = fn(async () =>
      createGenerationNotice({
        title: "수정됨",
        imageUrls: ["https://example.com/updated-image.png"],
      }),
    );
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateGenerationNotice }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "수정됨",
          imageUrls: ["https://example.com/updated-image.png"],
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = await readJson<{
      data: { title: string; imageUrls: string[] };
    }>(response);
    expect(body.data.title).toBe("수정됨");
    expect(body.data.imageUrls).toEqual([
      "https://example.com/updated-image.png",
    ]);
    expect(updateGenerationNotice).toHaveBeenCalledWith(
      IDs.generation,
      IDs.generationNotice,
      {
        title: "수정됨",
        imageUrls: ["https://example.com/updated-image.png"],
      },
    );
  });

  it("기수 공지 수정 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/not-a-uuid`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "수정" }),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("기수 공지 수정 대상이 없으면 404를 반환한다", async () => {
    const updateGenerationNotice = fn(async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateGenerationNotice }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "수정" }),
      },
    );

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("기수 공지 수정에서 sanitize 후 빈 본문이면 400을 반환한다", async () => {
    const updateGenerationNotice = fn(async () => createGenerationNotice());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateGenerationNotice }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "<script>alert(1)</script>" }),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateGenerationNotice).not.toHaveBeenCalled();
  });

  it("manager는 기수 공지를 삭제할 수 있다", async () => {
    const deleteGenerationNotice = fn(async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteGenerationNotice }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(204);
    expect(deleteGenerationNotice).toHaveBeenCalledWith(
      IDs.generation,
      IDs.generationNotice,
    );
  });

  it("기수 공지 삭제 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/not-a-uuid`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("기수 공지 삭제 대상이 없으면 404를 반환한다", async () => {
    const deleteGenerationNotice = fn(async () => false);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteGenerationNotice }),
    });

    const response = await app.request(
      `/api/generations/${IDs.generation}/notices/${IDs.generationNotice}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("member 계열 사용자는 전체 공지 생성 권한이 없다", async () => {
    const createGlobalNoticeMock = fn(async () => createGlobalNotice());
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        createGlobalNotice: createGlobalNoticeMock,
      }),
    });

    const response = await app.request("/api/global-notices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "전체 공지",
        content: "본문",
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(createGlobalNoticeMock).not.toHaveBeenCalled();
  });

  it("member 계열 사용자는 전체 공지 목록 조회가 가능하다", async () => {
    const listGlobalNotices = fn(async () => [createGlobalNotice()]);
    const app = createTestApp({
      actor: createActor("new_member", IDs.member),
      dataService: createDataServiceMock({ listGlobalNotices }),
    });

    const response = await app.request("/api/global-notices");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data[0]?.id).toBe(IDs.globalNotice);
  });

  it("unverified 사용자는 전체 공지 목록 조회 권한이 없다", async () => {
    const app = createTestApp({ actor: createActor("unverified", IDs.member) });

    const response = await app.request("/api/global-notices");

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
  });

  it("vice_president는 전체 공지를 생성할 수 있다", async () => {
    const createGlobalNoticeMock = fn(async () =>
      createGlobalNotice({
        title: "전체 공지 생성",
        author: {
          id: IDs.vicePresident,
          name: "vice-name",
          familyName: null,
          givenName: null,
          image: null,
          role: "vice_president",
        },
      }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        createGlobalNotice: createGlobalNoticeMock,
      }),
    });

    const response = await app.request("/api/global-notices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "전체 공지 생성",
        content: "전체 공지 본문",
      }),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { author: { id: string } } }>(response);
    expect(body.data.author.id).toBe(IDs.vicePresident);
    expect(createGlobalNoticeMock).toHaveBeenCalledWith({
      title: "전체 공지 생성",
      content: "전체 공지 본문",
      imageUrls: [],
      authorId: IDs.vicePresident,
    });
  });

  it("president는 전체 공지를 이미지와 함께 생성할 수 있다", async () => {
    const createGlobalNoticeMock = fn(async () =>
      createGlobalNotice({
        title: "전체 공지 생성",
        imageUrls: ["https://example.com/global-image-1.png"],
        author: {
          id: IDs.president,
          name: "president-name",
          familyName: null,
          givenName: null,
          image: null,
          role: "president",
        },
      }),
    );
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        createGlobalNotice: createGlobalNoticeMock,
      }),
    });

    const response = await app.request("/api/global-notices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "전체 공지 생성",
        content: "전체 공지 본문",
        imageUrls: ["https://example.com/global-image-1.png"],
      }),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{
      data: { author: { id: string }; imageUrls: string[] };
    }>(response);
    expect(body.data.author.id).toBe(IDs.president);
    expect(body.data.imageUrls).toEqual([
      "https://example.com/global-image-1.png",
    ]);
    expect(createGlobalNoticeMock).toHaveBeenCalledWith({
      title: "전체 공지 생성",
      content: "전체 공지 본문",
      imageUrls: ["https://example.com/global-image-1.png"],
      authorId: IDs.president,
    });
  });

  it("전체 공지 생성 본문이 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("president", IDs.president),
    });

    const response = await app.request("/api/global-notices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "", content: "" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("전체 공지 생성에서 sanitize 후 빈 본문이면 400을 반환한다", async () => {
    const createGlobalNoticeMock = fn(async () => createGlobalNotice());
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ createGlobalNotice: createGlobalNoticeMock }),
    });

    const response = await app.request("/api/global-notices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "전체 공지",
        content: "<script>alert(1)</script>",
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(createGlobalNoticeMock).not.toHaveBeenCalled();
  });

  it("전체 공지 생성 대상이 없으면 404를 반환한다", async () => {
    const createGlobalNoticeMock = fn(async () => null);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ createGlobalNotice: createGlobalNoticeMock }),
    });

    const response = await app.request("/api/global-notices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "전체 공지",
        content: "본문",
      }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("전체 공지 수정 본문이 비어있으면 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("president", IDs.president),
    });

    const response = await app.request(
      `/api/global-notices/${IDs.globalNotice}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("manager는 전체 공지를 수정할 수 없다", async () => {
    const updateGlobalNotice = fn(async () =>
      createGlobalNotice({ title: "수정 완료" }),
    );
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateGlobalNotice }),
    });

    const response = await app.request(
      `/api/global-notices/${IDs.globalNotice}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "수정 완료" }),
      },
    );

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateGlobalNotice).not.toHaveBeenCalled();
  });

  it("vice_president는 전체 공지를 수정할 수 있다", async () => {
    const updateGlobalNotice = fn(async () =>
      createGlobalNotice({
        title: "부회장 수정 완료",
      }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ updateGlobalNotice }),
    });

    const response = await app.request(
      `/api/global-notices/${IDs.globalNotice}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "부회장 수정 완료" }),
      },
    );

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { title: string } }>(response);
    expect(body.data.title).toBe("부회장 수정 완료");
    expect(updateGlobalNotice).toHaveBeenCalledWith(IDs.globalNotice, {
      title: "부회장 수정 완료",
    });
  });

  it("president는 전체 공지를 수정할 수 있다", async () => {
    const updateGlobalNotice = fn(async () =>
      createGlobalNotice({
        title: "수정 완료",
        imageUrls: ["https://example.com/global-updated.png"],
      }),
    );
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ updateGlobalNotice }),
    });

    const response = await app.request(
      `/api/global-notices/${IDs.globalNotice}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "수정 완료",
          imageUrls: ["https://example.com/global-updated.png"],
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = await readJson<{
      data: { title: string; imageUrls: string[] };
    }>(response);
    expect(body.data.title).toBe("수정 완료");
    expect(body.data.imageUrls).toEqual([
      "https://example.com/global-updated.png",
    ]);
    expect(updateGlobalNotice).toHaveBeenCalledWith(IDs.globalNotice, {
      title: "수정 완료",
      imageUrls: ["https://example.com/global-updated.png"],
    });
  });

  it("manager는 전체 공지를 삭제할 수 없다", async () => {
    const deleteGlobalNotice = fn(async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteGlobalNotice }),
    });

    const response = await app.request(
      `/api/global-notices/${IDs.globalNotice}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteGlobalNotice).not.toHaveBeenCalled();
  });

  it("전체 공지 삭제 대상이 없으면 404를 반환한다", async () => {
    const deleteGlobalNotice = fn(async () => false);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ deleteGlobalNotice }),
    });

    const response = await app.request(
      `/api/global-notices/${IDs.globalNotice}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("president는 전체 공지 상세를 조회할 수 있다", async () => {
    const getGlobalNoticeById = fn(async () =>
      createGlobalNotice({ content: `<p>본문<script>alert(1)</script></p>` }),
    );
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ getGlobalNoticeById }),
    });

    const response = await app.request(`/api/global-notices/${IDs.globalNotice}`);
    expect(response.status).toBe(200);

    const body = await readJson<{ data: { content: string } }>(response);
    expect(body.data.content).not.toContain("<script");
  });

  it("전체 공지 상세 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("president", IDs.president),
    });

    const response = await app.request("/api/global-notices/not-a-uuid");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("전체 공지 상세가 없으면 404를 반환한다", async () => {
    const getGlobalNoticeById = fn(async () => null);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ getGlobalNoticeById }),
    });

    const response = await app.request(`/api/global-notices/${IDs.globalNotice}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("전체 공지 수정 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("president", IDs.president),
    });

    const response = await app.request("/api/global-notices/not-a-uuid", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "수정" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("전체 공지 수정 대상이 없으면 404를 반환한다", async () => {
    const updateGlobalNotice = fn(async () => null);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ updateGlobalNotice }),
    });

    const response = await app.request(`/api/global-notices/${IDs.globalNotice}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "수정" }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("전체 공지 수정에서 sanitize 후 빈 본문이면 400을 반환한다", async () => {
    const updateGlobalNotice = fn(async () => createGlobalNotice());
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ updateGlobalNotice }),
    });

    const response = await app.request(`/api/global-notices/${IDs.globalNotice}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "<script>alert(1)</script>" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateGlobalNotice).not.toHaveBeenCalled();
  });

  it("전체 공지 삭제 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({
      actor: createActor("president", IDs.president),
    });

    const response = await app.request("/api/global-notices/not-a-uuid", {
      method: "DELETE",
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("president는 전체 공지를 삭제할 수 있다", async () => {
    const deleteGlobalNotice = fn(async () => true);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ deleteGlobalNotice }),
    });

    const response = await app.request(`/api/global-notices/${IDs.globalNotice}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteGlobalNotice).toHaveBeenCalledWith(IDs.globalNotice);
  });
});
