import { describe, expect, it, vi } from "vitest";
import { buildSignedPublicObjectUrl } from "../lib/storage/presign";
import {
  IDs,
  createActivity,
  createDataServiceMock,
  createExhibition,
  createGeneration,
  createLinktree,
  createLinktreeItem,
  createRecruitingPlan,
  createSiteSettings,
  createTestApp,
  createUser,
  fn,
  readJson,
} from "./test-helpers";

const PUBLIC_MEDIA_SECRET =
  "test-public-media-signing-secret-at-least-32-chars";

const createImageBody = () =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.close();
    },
  });

const createR2BucketMock = (object: R2ObjectBody | null): R2Bucket =>
  ({
    get: vi.fn(async () => object),
    put: vi.fn(),
    head: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  }) as unknown as R2Bucket;

describe("public routes", () => {
  it("서명된 공개 미디어 URL로 이미지를 조회한다", async () => {
    const objectKey = "market/user-member-0001/image/example-image.jpeg";
    const publicUrl = await buildSignedPublicObjectUrl({
      baseUrl: "https://example.com",
      objectKey,
      signingSecret: PUBLIC_MEDIA_SECRET,
    });
    const bucket = createR2BucketMock({
      body: createImageBody(),
      size: 3,
      httpEtag: '"etag-1"',
      httpMetadata: {
        contentType: "image/jpeg",
      },
    } as R2ObjectBody);
    const app = createTestApp({
      actor: null,
    });

    const response = await app.request(
      publicUrl,
      {},
      {
        BETTER_AUTH_SECRET: PUBLIC_MEDIA_SECRET,
        r2: bucket,
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("etag")).toBe('"etag-1"');
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("R2 메타데이터의 content-type이 비어 있어도 파일 확장자로 복구한다", async () => {
    const objectKey = "market/user-member-0001/image/example-image.jpeg";
    const publicUrl = await buildSignedPublicObjectUrl({
      baseUrl: "https://example.com",
      objectKey,
      signingSecret: PUBLIC_MEDIA_SECRET,
    });
    const app = createTestApp({
      actor: null,
    });

    const response = await app.request(
      publicUrl,
      {},
      {
        BETTER_AUTH_SECRET: PUBLIC_MEDIA_SECRET,
        r2: createR2BucketMock({
          body: createImageBody(),
          size: 3,
          httpMetadata: {},
        } as R2ObjectBody),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
  });

  it("전용 공개 URL 시크릿이 추가되어도 기존 BETTER_AUTH_SECRET 서명을 허용한다", async () => {
    const objectKey = "market/user-member-0001/image/example-image.jpeg";
    const publicUrl = await buildSignedPublicObjectUrl({
      baseUrl: "https://example.com",
      objectKey,
      signingSecret: PUBLIC_MEDIA_SECRET,
    });
    const app = createTestApp({
      actor: null,
    });

    const response = await app.request(
      publicUrl,
      {},
      {
        BETTER_AUTH_SECRET: PUBLIC_MEDIA_SECRET,
        R2_PUBLIC_URL_SIGNING_SECRET:
          "new-dedicated-public-media-secret-at-least-32-chars",
        r2: createR2BucketMock({
          body: createImageBody(),
          size: 3,
          httpMetadata: {
            contentType: "image/jpeg",
          },
        } as R2ObjectBody),
      },
    );

    expect(response.status).toBe(200);
  });

  it("비로그인 접근 시 공개 활동 목록을 조회한다", async () => {
    const listPublicActivities = fn(async () => [
      createActivity({
        id: "20000000-0000-4000-8000-000000000012",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-01-05T00:00:00.000Z"),
      }),
      createActivity({
        id: "20000000-0000-4000-8000-000000000011",
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        endDate: new Date("2025-01-05T00:00:00.000Z"),
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listPublicActivities }),
    });

    const response = await app.request("/api/public/activities");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((item) => item.id)).toEqual([
      "20000000-0000-4000-8000-000000000012",
      "20000000-0000-4000-8000-000000000011",
    ]);
    expect(listPublicActivities).toHaveBeenCalledTimes(1);
  });

  it("비로그인 접근 시 공개 활동 상세를 조회한다", async () => {
    const getActivityById = fn(async () =>
      createActivity({ id: IDs.activity, title: "활동 상세" }),
    );
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getActivityById }),
    });

    const response = await app.request(`/api/public/activities/${IDs.activity}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{ data: { id: string; title: string } }>(response);
    expect(body.data.id).toBe(IDs.activity);
    expect(body.data.title).toBe("활동 상세");
    expect(getActivityById).toHaveBeenCalledWith(IDs.activity);
  });

  it("공개 활동 상세가 없으면 404를 반환한다", async () => {
    const getActivityById = fn(async () => null);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getActivityById }),
    });

    const response = await app.request(`/api/public/activities/${IDs.activity}`);
    expect(response.status).toBe(404);
  });

  it("비로그인 접근 시 공개 전시 목록을 조회한다", async () => {
    const listPublicExhibitions = fn(async () => [
      createExhibition({
        id: "40000000-0000-4000-8000-000000000012",
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
      createExhibition({
        id: "40000000-0000-4000-8000-000000000011",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listPublicExhibitions }),
    });

    const response = await app.request("/api/public/exhibitions");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((item) => item.id)).toEqual([
      "40000000-0000-4000-8000-000000000012",
      "40000000-0000-4000-8000-000000000011",
    ]);
    expect(listPublicExhibitions).toHaveBeenCalledTimes(1);
  });

  it("공개 전시 응답의 설명 HTML은 sanitize 된다", async () => {
    const listPublicExhibitions = fn(async () => [
      createExhibition({
        description:
          '<h3>전시 안내</h3><script>alert("xss")</script><p onclick="evil()">본문</p>',
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listPublicExhibitions }),
    });

    const response = await app.request("/api/public/exhibitions");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ description: string }> }>(response);
    const description = body.data[0]?.description ?? "";
    expect(description).toContain("<h3>전시 안내</h3>");
    expect(description).toContain("<p>본문</p>");
    expect(description).not.toContain("<script");
    expect(description).not.toContain("onclick=");
  });

  it("비로그인 접근 시 공개 전시 상세를 조회한다", async () => {
    const getExhibitionById = fn(async () =>
      createExhibition({ id: IDs.exhibition, title: "전시 상세" }),
    );
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getExhibitionById }),
    });

    const response = await app.request(`/api/public/exhibitions/${IDs.exhibition}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{ data: { id: string; title: string } }>(response);
    expect(body.data.id).toBe(IDs.exhibition);
    expect(body.data.title).toBe("전시 상세");
    expect(getExhibitionById).toHaveBeenCalledWith(IDs.exhibition);
  });

  it("공개 전시 상세 응답도 설명 HTML을 sanitize 한다", async () => {
    const getExhibitionById = fn(async () =>
      createExhibition({
        id: IDs.exhibition,
        description:
          '<h2>타이틀</h2><p><a href="javascript:alert(1)">bad</a><a href="https://safe.example">safe</a></p>',
      }),
    );
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getExhibitionById }),
    });

    const response = await app.request(`/api/public/exhibitions/${IDs.exhibition}`);
    expect(response.status).toBe(200);

    const body = await readJson<{ data: { description: string } }>(response);
    expect(body.data.description).toContain("<h2>타이틀</h2>");
    expect(body.data.description).toContain('href="https://safe.example"');
    expect(body.data.description).not.toContain("javascript:");
  });

  it("공개 전시 상세가 없으면 404를 반환한다", async () => {
    const getExhibitionById = fn(async () => null);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getExhibitionById }),
    });

    const response = await app.request(`/api/public/exhibitions/${IDs.exhibition}`);
    expect(response.status).toBe(404);
  });

  it("공개 링크트리는 비로그인 상태에서도 조회할 수 있다", async () => {
    const listLinktrees = fn(async () => [
      createLinktree({
        id: IDs.linktree,
        items: [
          createLinktreeItem({
            id: IDs.linktreeItem,
            linktreeId: IDs.linktree,
            name: "Instagram",
            link: "https://instagram.com/yonyoung",
          }),
        ],
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listLinktrees }),
    });

    const response = await app.request("/api/public/linktree");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.linktree);
  });

  it("공개 사이트 기본 설정은 비로그인 상태에서도 조회할 수 있다", async () => {
    const getSiteSettings = fn(async () =>
      createSiteSettings({
        footerInstagramId: "yonyoung_archive",
      }),
    );
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getSiteSettings }),
    });

    const response = await app.request("/api/public/site-settings");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{ data: { footerInstagramId: string } }>(response);
    expect(body.data.footerInstagramId).toBe("yonyoung_archive");
    expect(getSiteSettings).toHaveBeenCalledTimes(1);
  });

  it("공개 현재 연도 모집 계획은 비로그인 상태에서도 조회할 수 있다", async () => {
    const getCurrentRecruitingPlan = fn(async () =>
      createRecruitingPlan({
        year: 2031,
        title: "2031 모집",
      }),
    );
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/public/recruiting-plan/current");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{ data: { year: number; title: string } }>(response);
    expect(body.data.year).toBe(2031);
    expect(body.data.title).toBe("2031 모집");
    expect(getCurrentRecruitingPlan).toHaveBeenCalledTimes(1);
  });

  it("공개 현재 연도 모집 계획이 없으면 null을 반환한다", async () => {
    const getCurrentRecruitingPlan = fn(async () => null);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/public/recruiting-plan/current");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{ data: null }>(response);
    expect(body.data).toBeNull();
    expect(getCurrentRecruitingPlan).toHaveBeenCalledTimes(1);
  });

  it("공개 기수 목록은 sortOrder 기준 오름차순으로 정렬된다", async () => {
    const listGenerations = fn(async () => [
      createGeneration({
        id: IDs.generationAlt,
        sortOrder: 20,
      }),
      createGeneration({
        id: IDs.generation,
        sortOrder: 10,
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listGenerations }),
    });

    const response = await app.request("/api/public/generations");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((item) => item.id)).toEqual([
      IDs.generation,
      IDs.generationAlt,
    ]);
  });

  it("공개 사진가 목록은 기수/멤버를 정렬해 반환하며 민감 정보를 노출하지 않는다", async () => {
    const listGenerations = fn(async () => [
      createGeneration({
        id: IDs.generationAlt,
        name: "20기",
        sortOrder: 20,
      }),
      createGeneration({
        id: IDs.generation,
        name: "10기",
        sortOrder: 10,
      }),
    ]);
    const listUsers = fn(async () => [
      createUser({
        id: IDs.otherUser,
        name: "zeta",
        familyName: "최",
        givenName: "연",
        generationId: IDs.generation,
        email: "private-1@example.com",
      }),
      createUser({
        id: IDs.member,
        name: "alpha",
        familyName: "김",
        givenName: "민수",
        generationId: IDs.generation,
        showcaseImageUrls: [
          "https://example.com/showcase/member-1.jpg",
          "https://example.com/showcase/member-2.jpg",
        ],
        email: "private-2@example.com",
      }),
      createUser({
        id: IDs.manager,
        name: "beta",
        familyName: null,
        givenName: null,
        generationId: IDs.generationAlt,
        email: "private-3@example.com",
      }),
      createUser({
        id: IDs.vicePresident,
        name: "orphan",
        generationId: null,
      }),
    ]);

    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listGenerations, listUsers }),
    });

    const response = await app.request("/api/public/photographers");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=120");

    const body = await readJson<{
      data: Array<{
        id: string;
        members: Array<Record<string, unknown>>;
      }>;
    }>(response);

    expect(body.data.map((item) => item.id)).toEqual([
      IDs.generation,
      IDs.generationAlt,
    ]);
    expect(
      body.data[0]?.members.map((member) => member.id),
    ).toEqual([IDs.member, IDs.otherUser]);
    expect(body.data[1]?.members.map((member) => member.id)).toEqual([IDs.manager]);
    expect(body.data[0]?.members[0]?.showcaseImageUrls).toEqual([
      "https://example.com/showcase/member-1.jpg",
      "https://example.com/showcase/member-2.jpg",
    ]);
    expect(body.data[0]?.members[1]?.showcaseImageUrls).toEqual([]);
    expect(body.data[0]?.members[0]).not.toHaveProperty("email");
    expect(body.data[0]?.members[0]).not.toHaveProperty("phoneNumber");
    expect(body.data[0]?.members[0]).not.toHaveProperty("studentNumber");
    expect(listGenerations).toHaveBeenCalledTimes(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it("공개 활동 목록은 cache hit 시 데이터 서비스를 재호출하지 않는다", async () => {
    const originalCaches = (globalThis as { caches?: unknown }).caches;
    const store = new Map<string, Response>();
    const match = fn(async (request: Request) => store.get(request.url)?.clone());
    const put = fn(async (request: Request, response: Response) => {
      store.set(request.url, response.clone());
    });
    (globalThis as { caches?: unknown }).caches = {
      default: { match, put },
    };

    try {
      const listPublicActivities = fn(async () => [createActivity()]);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({ listPublicActivities }),
      });

      const firstResponse = await app.request("/api/public/activities");
      expect(firstResponse.status).toBe(200);
      expect(listPublicActivities).toHaveBeenCalledTimes(1);

      const secondResponse = await app.request("/api/public/activities");
      expect(secondResponse.status).toBe(200);
      expect(listPublicActivities).toHaveBeenCalledTimes(1);
      expect(match).toHaveBeenCalledTimes(2);
      expect(put).toHaveBeenCalledTimes(1);
    } finally {
      (globalThis as { caches?: unknown }).caches = originalCaches;
    }
  });
});
