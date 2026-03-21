import { describe, expect, it } from "vitest";
import {
  createActor,
  createDataServiceMock,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("error response format", () => {
  it("BAD_REQUEST 응답은 requestId를 포함한다", async () => {
    const requestId = "request-id-from-client";
    const app = createTestApp({
      actor: null,
    });

    const response = await app.request("/api/public/activities/not-a-uuid", {
      headers: {
        "x-request-id": requestId,
      },
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBe(requestId);

    const body = await readJson<{
      error: { code: string; message: string; requestId: string };
    }>(response);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.requestId).toBe(requestId);
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it("INTERNAL_ERROR 응답은 민감정보를 숨기고 requestId를 반환한다", async () => {
    const requestId = "internal-error-request-id";
    const listPublicActivities = fn(async () => {
      throw new Error("DB_PASSWORD=super-secret");
    });
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listPublicActivities }),
    });

    const response = await app.request("/api/public/activities", {
      headers: {
        "x-request-id": requestId,
      },
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe(requestId);

    const body = await readJson<{
      error: { code: string; message: string; requestId: string };
    }>(response);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.requestId).toBe(requestId);
    expect(body.error.message).not.toContain("DB_PASSWORD");
  });

  it("잘못된 JSON 본문은 400 BAD_REQUEST로 처리되고 서버 오류로 승격되지 않는다", async () => {
    const app = createTestApp({
      actor: createActor("regular_member"),
    });

    const response = await app.request("/api/market/items", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{bad-json",
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });
});
