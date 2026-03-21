import { describe, expect, it } from "vitest";
import {
  createActor,
  createDataServiceMock,
  createPresignServiceMock,
  createTestApp,
  readJson,
} from "../../src/tests/test-helpers";

describe("global error handling integration", () => {
  it("maps validation failures to BAD_REQUEST", async () => {
    const app = createTestApp({
      actor: createActor("regular_member"),
    });

    const response = await app.request("/api/market/items", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const body = await readJson<{
      error: { code: string; message: string; requestId: string };
    }>(response);
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("maps authentication failures to UNAUTHORIZED", async () => {
    const app = createTestApp({ actor: null });

    const response = await app.request("/api/users");

    expect(response.status).toBe(401);
    const body = await readJson<{
      error: { code: string; message: string; requestId: string };
    }>(response);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("maps D1 constraint failures to CONFLICT", async () => {
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({
        listPublicActivities: async () => {
          throw new Error("SQLITE_CONSTRAINT: unique constraint failed");
        },
      }),
    });

    const response = await app.request("/api/public/activities");

    expect(response.status).toBe(409);
    const body = await readJson<{
      error: { code: string; message: string; requestId: string };
    }>(response);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("maps R2 errors to standardized responses", async () => {
    const app = createTestApp({
      actor: createActor("regular_member"),
      readR2TotalUsageBytes: async () => 0,
      presignService: createPresignServiceMock({
        issuePresignedPutUrl: async () => {
          throw new Error("NoSuchKey: object not found");
        },
      }),
    });

    const response = await app.request("/api/uploads/users/profile/presign", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fileName: "avatar.png",
        contentType: "image/png",
        fileSize: 10,
      }),
    });

    expect(response.status).toBe(404);
    const body = await readJson<{
      error: { code: string; message: string; requestId: string };
    }>(response);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns requestId and redacted messages on internal failures", async () => {
    const requestId = "req-integration-secret";
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({
        listPublicActivities: async () => {
          throw new Error("DB_PASSWORD=super-secret-token");
        },
      }),
    });

    const response = await app.request("/api/public/activities", {
      headers: {
        "x-request-id": requestId,
      },
    });

    expect(response.status).toBe(500);
    const body = await readJson<{
      error: { code: string; message: string; requestId: string };
    }>(response);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.requestId).toBe(requestId);
    expect(body.error.message).not.toContain("super-secret-token");
  });
});
