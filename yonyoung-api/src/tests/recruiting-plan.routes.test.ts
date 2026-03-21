import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createRecruitingPlan,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("recruiting plan routes", () => {
  it("미로그인 사용자는 모집 계획 조회 시 401을 반환한다", async () => {
    const getCurrentRecruitingPlan = fn(async () => createRecruitingPlan());
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current");

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
    expect(getCurrentRecruitingPlan).not.toHaveBeenCalled();
  });

  it("회장/부회장이 아니면 모집 계획 조회가 불가하다", async () => {
    const getCurrentRecruitingPlan = fn(async () => createRecruitingPlan());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current");

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(getCurrentRecruitingPlan).not.toHaveBeenCalled();
  });

  it("회장은 현재 연도 모집 계획이 없으면 null을 조회할 수 있다", async () => {
    const getCurrentRecruitingPlan = fn(async () => null);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ getCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current");

    expect(response.status).toBe(200);
    const body = await readJson<{ data: null }>(response);
    expect(body.data).toBeNull();
    expect(getCurrentRecruitingPlan).toHaveBeenCalledTimes(1);
  });

  it("회장은 현재 연도 모집 계획을 조회할 수 있다", async () => {
    const getCurrentRecruitingPlan = fn(async () =>
      createRecruitingPlan({
        year: 2031,
        title: "2031 모집 계획",
      }),
    );
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ getCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current");

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { year: number; title: string } }>(response);
    expect(body.data.year).toBe(2031);
    expect(body.data.title).toBe("2031 모집 계획");
    expect(getCurrentRecruitingPlan).toHaveBeenCalledTimes(1);
  });

  it("부회장은 현재 연도 모집 계획을 조회할 수 있다", async () => {
    const getCurrentRecruitingPlan = fn(async () =>
      createRecruitingPlan({
        year: 2032,
        title: "2032 모집 계획",
      }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ getCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current");

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { year: number; title: string } }>(response);
    expect(body.data.year).toBe(2032);
    expect(body.data.title).toBe("2032 모집 계획");
    expect(getCurrentRecruitingPlan).toHaveBeenCalledTimes(1);
  });

  it("회장/부회장이 아니면 모집 계획 수정이 불가하다", async () => {
    const upsertCurrentRecruitingPlan = fn(async () => createRecruitingPlan());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ upsertCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "2030 모집",
        content: "<p>본문</p>",
        promotionImageUrls: [],
        recruitmentStartAt: Date.parse("2030-03-01T00:00:00.000Z"),
        recruitmentEndAt: Date.parse("2030-03-31T00:00:00.000Z"),
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(upsertCurrentRecruitingPlan).not.toHaveBeenCalled();
  });

  it("부회장은 모집 계획을 수정할 수 있다", async () => {
    const upsertCurrentRecruitingPlan = fn(async () =>
      createRecruitingPlan({
        title: "2031 모집 계획",
        content: "<p>부회장 안내</p>",
      }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ upsertCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "2031 모집 계획",
        content: "<p>부회장 안내</p>",
        promotionImageUrls: ["https://example.com/vice.jpg"],
        recruitmentStartAt: Date.parse("2031-03-01T00:00:00.000Z"),
        recruitmentEndAt: Date.parse("2031-03-31T23:59:59.000Z"),
      }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { title: string } }>(response);
    expect(body.data.title).toBe("2031 모집 계획");
    expect(upsertCurrentRecruitingPlan).toHaveBeenCalledWith({
      title: "2031 모집 계획",
      content: "<p>부회장 안내</p>",
      promotionImageUrls: ["https://example.com/vice.jpg"],
      recruitmentStartAt: new Date("2031-03-01T00:00:00.000Z"),
      recruitmentEndAt: new Date("2031-03-31T23:59:59.000Z"),
    });
  });

  it("미로그인 사용자는 모집 계획 수정 시 401을 반환한다", async () => {
    const upsertCurrentRecruitingPlan = fn(async () => createRecruitingPlan());
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ upsertCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "2030 모집",
        content: "<p>본문</p>",
        promotionImageUrls: [],
        recruitmentStartAt: Date.parse("2030-03-01T00:00:00.000Z"),
        recruitmentEndAt: Date.parse("2030-03-31T00:00:00.000Z"),
      }),
    });

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
    expect(upsertCurrentRecruitingPlan).not.toHaveBeenCalled();
  });

  it("모집 계획 수정 본문이 비어있으면 400을 반환한다", async () => {
    const upsertCurrentRecruitingPlan = fn(async () => createRecruitingPlan());
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ upsertCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(upsertCurrentRecruitingPlan).not.toHaveBeenCalled();
  });

  it("sanitize 이후 본문이 비어있으면 400을 반환한다", async () => {
    const upsertCurrentRecruitingPlan = fn(async () => createRecruitingPlan());
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ upsertCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "2030 모집",
        content: "<script>alert(1)</script><p><br></p>",
        promotionImageUrls: [],
        recruitmentStartAt: Date.parse("2030-03-01T00:00:00.000Z"),
        recruitmentEndAt: Date.parse("2030-03-31T00:00:00.000Z"),
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(upsertCurrentRecruitingPlan).not.toHaveBeenCalled();
  });

  it("모집 기간 시작일시가 종료일시보다 늦으면 400을 반환한다", async () => {
    const upsertCurrentRecruitingPlan = fn(async () => createRecruitingPlan());
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ upsertCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "2030 모집",
        content: "<p>본문</p>",
        promotionImageUrls: [],
        recruitmentStartAt: Date.parse("2030-04-01T00:00:00.000Z"),
        recruitmentEndAt: Date.parse("2030-03-01T00:00:00.000Z"),
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(upsertCurrentRecruitingPlan).not.toHaveBeenCalled();
  });

  it("이미지 URL이 중복되거나 10장을 초과하면 400을 반환한다", async () => {
    const upsertCurrentRecruitingPlan = fn(async () => createRecruitingPlan());
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ upsertCurrentRecruitingPlan }),
    });

    const duplicateResponse = await app.request("/api/recruiting-plan/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "2030 모집",
        content: "<p>본문</p>",
        promotionImageUrls: ["https://example.com/a.jpg", "https://example.com/a.jpg"],
        recruitmentStartAt: Date.parse("2030-03-01T00:00:00.000Z"),
        recruitmentEndAt: Date.parse("2030-03-31T00:00:00.000Z"),
      }),
    });

    expect(duplicateResponse.status).toBe(400);
    await expectErrorCode(duplicateResponse, "BAD_REQUEST");

    const overLimitResponse = await app.request("/api/recruiting-plan/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "2030 모집",
        content: "<p>본문</p>",
        promotionImageUrls: Array.from(
          { length: 11 },
          (_, index) => `https://example.com/${index + 1}.jpg`,
        ),
        recruitmentStartAt: Date.parse("2030-03-01T00:00:00.000Z"),
        recruitmentEndAt: Date.parse("2030-03-31T00:00:00.000Z"),
      }),
    });

    expect(overLimitResponse.status).toBe(400);
    await expectErrorCode(overLimitResponse, "BAD_REQUEST");
    expect(upsertCurrentRecruitingPlan).not.toHaveBeenCalled();
  });

  it("회장은 모집 계획을 수정할 수 있고 content는 sanitize 되어 저장된다", async () => {
    const upsertCurrentRecruitingPlan = fn(async () =>
      createRecruitingPlan({
        title: "2030 모집 계획",
        content: "<p>지원해주세요.</p>",
      }),
    );
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ upsertCurrentRecruitingPlan }),
    });

    const response = await app.request("/api/recruiting-plan/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "2030 모집 계획",
        content: '<p onclick="evil()">지원해주세요.</p><script>alert(1)</script>',
        promotionImageUrls: ["https://example.com/a.jpg"],
        recruitmentStartAt: Date.parse("2030-03-01T00:00:00.000Z"),
        recruitmentEndAt: Date.parse("2030-03-31T23:59:59.000Z"),
      }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { title: string } }>(response);
    expect(body.data.title).toBe("2030 모집 계획");
    expect(upsertCurrentRecruitingPlan).toHaveBeenCalledWith({
      title: "2030 모집 계획",
      content: "<p>지원해주세요.</p>",
      promotionImageUrls: ["https://example.com/a.jpg"],
      recruitmentStartAt: new Date("2030-03-01T00:00:00.000Z"),
      recruitmentEndAt: new Date("2030-03-31T23:59:59.000Z"),
    });
  });
});
