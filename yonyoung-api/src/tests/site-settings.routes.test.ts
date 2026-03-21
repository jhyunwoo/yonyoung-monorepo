import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createSiteSettings,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("site settings routes", () => {
  it("미로그인 사용자는 사이트 설정 조회 시 401을 반환한다", async () => {
    const getSiteSettings = fn(async () => createSiteSettings());
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getSiteSettings }),
    });

    const response = await app.request("/api/site-settings");

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
    expect(getSiteSettings).not.toHaveBeenCalled();
  });

  it("회장/부회장이 아니면 사이트 설정 조회가 불가하다", async () => {
    const getSiteSettings = fn(async () => createSiteSettings());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getSiteSettings }),
    });

    const response = await app.request("/api/site-settings");

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(getSiteSettings).not.toHaveBeenCalled();
  });

  it("회장은 사이트 설정을 조회할 수 있다", async () => {
    const getSiteSettings = fn(async () =>
      createSiteSettings({
        footerInstagramId: "yonyongpage",
      }),
    );
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ getSiteSettings }),
    });

    const response = await app.request("/api/site-settings");

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { footerInstagramId: string } }>(response);
    expect(body.data.footerInstagramId).toBe("yonyongpage");
    expect(getSiteSettings).toHaveBeenCalledTimes(1);
  });

  it("부회장은 사이트 설정을 조회할 수 있다", async () => {
    const getSiteSettings = fn(async () =>
      createSiteSettings({
        footerInstagramId: "vice-page",
      }),
    );
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ getSiteSettings }),
    });

    const response = await app.request("/api/site-settings");

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { footerInstagramId: string } }>(response);
    expect(body.data.footerInstagramId).toBe("vice-page");
    expect(getSiteSettings).toHaveBeenCalledTimes(1);
  });

  it("회장/부회장이 아니면 사이트 설정 수정이 불가하다", async () => {
    const updateSiteSettings = fn(async () => createSiteSettings());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateSiteSettings }),
    });

    const response = await app.request("/api/site-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ footerPhone: "010-0000-0000" }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("부회장은 사이트 설정을 수정할 수 있다", async () => {
    const updateSiteSettings = fn(async () =>
      createSiteSettings({
        footerInstagramId: "vice_page",
        footerPhone: "010-9876-5432",
      }),
    );

    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ updateSiteSettings }),
    });

    const response = await app.request("/api/site-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        footerInstagramId: "@vice_page",
        footerPhone: "010-9876-5432",
      }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { footerInstagramId: string; footerPhone: string } }>(
      response,
    );
    expect(body.data.footerInstagramId).toBe("vice_page");
    expect(body.data.footerPhone).toBe("010-9876-5432");
    expect(updateSiteSettings).toHaveBeenCalledWith({
      footerInstagramId: "vice_page",
      footerPhone: "010-9876-5432",
    });
  });

  it("사이트 설정 수정 본문이 비어있으면 400을 반환한다", async () => {
    const updateSiteSettings = fn(async () => createSiteSettings());
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ updateSiteSettings }),
    });

    const response = await app.request("/api/site-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("사이트 설정 수정 본문에 잘못된 url/email이 있으면 400을 반환한다", async () => {
    const updateSiteSettings = fn(async () => createSiteSettings());
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ updateSiteSettings }),
    });

    const response = await app.request("/api/site-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        footerOpenChatUrl: "not-url",
        footerEmail: "not-email",
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("회장은 사이트 설정을 수정할 수 있고 인스타 아이디는 @가 제거된다", async () => {
    const updateSiteSettings = fn(async () =>
      createSiteSettings({
        footerInstagramId: "yonyongpage",
        footerPhone: "010-1234-5678",
        donateBankName: "테스트은행",
      }),
    );

    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ updateSiteSettings }),
    });

    const response = await app.request("/api/site-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        footerInstagramId: "@yonyongpage",
        footerPhone: "010-1234-5678",
        donateBankName: "테스트은행",
      }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{
      data: { footerInstagramId: string; footerPhone: string; donateBankName: string };
    }>(response);
    expect(body.data.footerInstagramId).toBe("yonyongpage");
    expect(body.data.footerPhone).toBe("010-1234-5678");
    expect(body.data.donateBankName).toBe("테스트은행");
    expect(updateSiteSettings).toHaveBeenCalledWith({
      footerInstagramId: "yonyongpage",
      footerPhone: "010-1234-5678",
      donateBankName: "테스트은행",
    });
  });
});
